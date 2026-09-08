package com.test.test.course;

import com.test.test.common.exception.BusinessRuleException;
import com.test.test.course.repository.CourseRepository;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.Comparator;
import java.util.EnumMap;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

/**
 * 레벨 코드 카탈로그 (설계/03 §1·§3 판정 J-4) — <b>코드의 단일 출처는 DB의 {@code course.level_code}다.</b>
 *
 * <p>예전에는 레벨이 {@code course_no}에서 <b>파생</b>됐다(enum {@code LibraryLevel}).
 * 언어가 둘이 되는 순간 그 파생은 성립하지 않는다 — 일본어 {@code courseNo 1}은 N5고 영어 {@code courseNo 1}은 E1이다.
 * 입문은 표시 문구가 "문자"라 문구에서 코드를 만들 수도 없다. 그래서 코드를 컬럼으로 승격하고,
 * 이 빈이 <b>코드 ↔ courseNo ↔ language</b>를 한 번 읽어 캐시한다.</p>
 *
 * <p>캐시가 안전한 근거: {@code course}는 시드 전용 테이블이라 런타임 쓰기가 없다(설계 §1).
 * 시드가 바뀌면 재기동이 곧 갱신이다(로컬은 매 기동 재적재 — 컨벤션 §5-2).</p>
 */
@Component
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class CourseLevelCatalog {

    private final CourseRepository courseRepository;

    /** 언어별 코드 목록(학습 순서) — 첫 조회 때 한 번 읽는다 */
    private volatile Map<CourseLanguage, List<String>> codesByLanguage;

    /**
     * {@code level=INTRO,N1} 형태의 파라미터를 <b>레벨 코드 목록</b>으로 검증·변환한다.
     *
     * <p>빈 값/공백은 "필터 없음"(빈 목록)이고, 그 언어의 허용 집합 밖은 400이다(설계 §7-13 ④ —
     * 조용히 무시하지 않는다). 일본어 자료실에 {@code E1}을, 영어 자료실에 {@code N5}를 주면
     * 여기서 걸린다(설계/03 §1·§3 — 한쪽 값으로 다른 쪽을 조회할 수 없다).</p>
     *
     * <p>⚠️ <b>선택지에서 뺀 것과 파라미터가 거부하는 것은 다르다</b>(설계/03 §1·§3): 한자 자료실에 {@code INTRO}는
     * 유효한 코드이고 데이터가 0건일 뿐이라 200 + 0건이 된다. 400은 <b>없는 코드</b>의 몫이다.</p>
     */
    public List<String> parseLevelCodes(String levelParam, CourseLanguage language) {
        if (levelParam == null || levelParam.isBlank()) {
            return List.of();
        }
        return Arrays.stream(levelParam.split(","))
                .map(String::trim)
                .filter(code -> !code.isEmpty())
                .map(code -> requireKnownCode(code, language))
                .distinct()
                .toList();
    }

    /** 그 언어의 레벨 코드 전량 — 학습 순서(courseNo 오름차순) 고정(설계/03 §1·§3) */
    public List<String> levelCodes(CourseLanguage language) {
        return snapshot().getOrDefault(language, List.of());
    }

    private String requireKnownCode(String code, CourseLanguage language) {
        String normalized = code.toUpperCase(Locale.ROOT);
        List<String> allowed = levelCodes(language);
        if (!allowed.contains(normalized)) {
            throw new BusinessRuleException("지원하지 않는 레벨입니다: " + code
                    + " (" + String.join("·", allowed) + " 중 하나)");
        }
        return normalized;
    }

    private Map<CourseLanguage, List<String>> snapshot() {
        Map<CourseLanguage, List<String>> cached = this.codesByLanguage;
        if (cached == null) {
            cached = load();
            this.codesByLanguage = cached;
        }
        return cached;
    }

    private Map<CourseLanguage, List<String>> load() {
        Map<CourseLanguage, List<String>> loaded = new EnumMap<>(CourseLanguage.class);
        courseRepository.findAll().stream()
                .sorted(Comparator.comparing(CourseEntity::getCourseNo))
                .forEach(course -> loaded
                        .computeIfAbsent(CourseLanguage.of(course.getLanguage()), unused -> new ArrayList<>())
                        .add(course.getLevelCode()));
        Map<CourseLanguage, List<String>> immutable = new LinkedHashMap<>();
        loaded.forEach((language, codes) -> immutable.put(language, List.copyOf(codes)));
        return Map.copyOf(immutable);
    }
}
