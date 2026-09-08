package com.test.test.course;

import com.test.test.common.exception.CoursePreparingException;
import com.test.test.common.exception.EntityNotFoundException;
import com.test.test.course.content.VocabularyEntity;
import com.test.test.course.dto.CourseDTO;
import com.test.test.course.dto.CourseDetailDTO;
import com.test.test.course.dto.DialogDTO;
import com.test.test.course.dto.GrammarDTO;
import com.test.test.course.dto.KanjiDTO;
import com.test.test.course.dto.NextCourseDTO;
import com.test.test.course.dto.UnitReviewDTO;
import com.test.test.course.dto.UnitStudyDTO;
import com.test.test.course.dto.UnitSummaryDTO;
import com.test.test.course.dto.VocabularyDTO;
import com.test.test.course.mapping.UnitGrammarEntity;
import com.test.test.course.mapping.UnitKanjiEntity;
import com.test.test.course.mapping.UnitVocabularyEntity;
import com.test.test.course.repository.CourseRepository;
import com.test.test.course.repository.CourseUnitCount;
import com.test.test.course.repository.CourseUnitRepository;
import com.test.test.course.repository.UnitContentCount;
import com.test.test.course.repository.UnitGrammarRepository;
import com.test.test.course.repository.UnitKanjiRepository;
import com.test.test.course.repository.UnitVocabularyRepository;
import com.test.test.library.LibraryVocabularyService;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * 코스 학습 서비스 (설계 §3)
 *
 * <p><b>언어는 파라미터다</b>(설계/04 §8) — 영어 과정을 위해 이 서비스를 복제하지 않는다.
 * 경로가 언어를 정하고({@code /api/courses} = JA, {@code /api/en/**} = EN) 조회 조건 하나가 과정을 가른다.
 * 다른 언어의 리소스 id는 "다른 언어의 것"이 아니라 <b>없는 것</b>이라 404다(설계/04 §8).</p>
 */
@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class CourseService {

    /** 복습 블록 주기 — 5유닛마다 쉼표 (설계 §7-11-A, 코스 길이와 무관) */
    private static final int REVIEW_UNIT_INTERVAL = 5;

    private final CourseRepository courseRepository;
    private final CourseUnitRepository courseUnitRepository;
    private final UnitGrammarRepository unitGrammarRepository;
    private final UnitKanjiRepository unitKanjiRepository;
    private final UnitVocabularyRepository unitVocabularyRepository;
    private final LibraryVocabularyService libraryVocabularyService;

    /**
     * 코스 목록 (설계 §3-1) — 그 언어의 코스만, courseNo 오름차순.
     * 일본어 목록에 영어 코스가 섞이지 않는다(그 반대도 마찬가지 — 설계/04 §8).
     */
    public List<CourseDTO> getCourseList(CourseLanguage language) {
        // unitCount는 진도 막대의 분모다(설계/04 §6-1). 코스마다 세면 6번 더 조회하게 되므로 한 번의 집계로 받는다.
        Map<Long, Long> unitCounts = courseUnitRepository.countGroupByCourse().stream()
                .collect(Collectors.toMap(CourseUnitCount::getCourseId, CourseUnitCount::getCnt));

        return courseRepository.findAllByLanguageOrderByCourseNoAsc(language.code()).stream()
                .map(course -> CourseDTO.from(course, unitCounts.getOrDefault(course.getId(), 0L).intValue()))
                .toList();
    }

    /**
     * 코스 상세 + 유닛 목록 + 합계 요약 (설계 §3-2)
     * 준비중 코스도 200 — 빈 units·0 summary로 내리고 프론트가 status로 분기한다.
     */
    public CourseDetailDTO getCourseDetail(Long courseId, CourseLanguage language) {
        CourseEntity course = findCourse(courseId, language);

        List<CourseUnitEntity> units = courseUnitRepository.findByCourseIdOrderByUnitNoAsc(courseId);
        Map<Long, Long> grammarCounts = toCountMap(unitGrammarRepository.countByCourseIdGroupByUnit(courseId));
        Map<Long, Long> kanjiCounts = toCountMap(unitKanjiRepository.countByCourseIdGroupByUnit(courseId));
        Map<Long, Long> vocabCounts = toCountMap(unitVocabularyRepository.countByCourseIdGroupByUnit(courseId));

        List<UnitSummaryDTO> unitSummaries = units.stream()
                .map(unit -> UnitSummaryDTO.from(unit,
                        grammarCounts.getOrDefault(unit.getId(), 0L),
                        kanjiCounts.getOrDefault(unit.getId(), 0L),
                        vocabCounts.getOrDefault(unit.getId(), 0L)))
                .toList();

        // statusbar 합계 — 유닛별 집계의 합 (하드코딩 금지 계약)
        CourseDetailDTO.SummaryDTO summary = CourseDetailDTO.SummaryDTO.builder()
                .unitCount(units.size())
                .grammarCount(sum(grammarCounts))
                .kanjiCount(sum(kanjiCounts))
                .vocabCount(sum(vocabCounts))
                .build();

        return CourseDetailDTO.from(course, summary, unitSummaries);
    }

    /**
     * 유닛 학습 데이터 전체 (설계 §3-3) — 문법+예문·회화·한자·어휘·이동 정보 한 번에.
     * 한자가 0자인 코스(입문)도 {@code kanjis: []}로 내려간다 — 필드를 빼지 않는다(설계/06 §2).
     */
    public UnitStudyDTO getUnitStudy(Long courseId, Integer unitNo) {
        UnitStudyBase base = loadUnitStudyBase(courseId, unitNo, CourseLanguage.JA);

        List<KanjiDTO> kanjis = unitKanjiRepository.findWithKanjiByUnitId(base.getUnit().getId()).stream()
                .map(UnitKanjiEntity::getKanji)
                .map(KanjiDTO::from)
                .toList();

        List<VocabularyDTO> vocabularies = base.getVocabularies().stream()
                .map(vocabulary -> VocabularyDTO.from(vocabulary, base.entryIdOf(vocabulary)))
                .toList();

        return UnitStudyDTO.from(base.getCourse(), base.getUnit(), base.getTotalUnits(), base.getNextCourse(),
                base.getGrammars(), base.getDialog(), kanjis, vocabularies, base.getReview());
    }

    /**
     * 유닛 학습의 <b>언어 공통 부분</b> (설계/04 §8-1) — 3번째 자리(한자/표현)와 어휘 표기 형태만 호출자가 채운다.
     * 영어 과정 서비스가 이 메서드를 재사용한다(복제 금지).
     */
    public UnitStudyBase loadUnitStudyBase(Long courseId, Integer unitNo, CourseLanguage language) {
        CourseEntity course = findCourse(courseId, language);

        // 준비중 코스의 유닛 → 404 + COURSE_PREPARING (없음(NOT_FOUND)과 구분)
        if (course.isPreparing()) {
            throw new CoursePreparingException(course.getTitle());
        }

        CourseUnitEntity unit = courseUnitRepository.findByCourseIdAndUnitNo(courseId, unitNo)
                .orElseThrow(() -> EntityNotFoundException.of("유닛", unitNo.longValue()));

        int totalUnits = courseUnitRepository.countByCourseId(courseId);

        // 마지막 유닛에서만 다음 코스 링크 (설계 §3-3·§7-8 — 준비중이어도 내려주고 프론트가 status로 분기).
        // 다음 코스는 반드시 같은 언어 안에서 찾는다 — courseNo는 언어 안에서만 유일하다(설계/03 §3).
        NextCourseDTO nextCourse = null;
        if (unit.getUnitNo() == totalUnits) {
            nextCourse = courseRepository.findByLanguageAndCourseNo(language.code(), course.getCourseNo() + 1)
                    .map(NextCourseDTO::from)
                    .orElse(null);
        }

        List<GrammarDTO> grammars = unitGrammarRepository.findWithGrammarByUnitId(unit.getId()).stream()
                .map(UnitGrammarEntity::getGrammarPoint)
                .map(GrammarDTO::from)
                .toList();

        List<VocabularyEntity> unitVocabularies =
                unitVocabularyRepository.findWithVocabularyByUnitId(unit.getId()).stream()
                        .map(UnitVocabularyEntity::getVocabulary)
                        .toList();
        // entryId(설계/04 §6-1)는 자료실의 병합 규칙에서 온다 — 규칙을 여기서 다시 구현하지 않고,
        // 유닛 어휘 전체를 한 번의 쿼리로 그룹 조회해 채운다(어휘당 쿼리 금지 — N+1).
        Map<Long, Long> entryIds = libraryVocabularyService.resolveEntryIds(
                unitVocabularies.stream().map(VocabularyEntity::getId).toList(), language);

        return UnitStudyBase.builder()
                .course(course)
                .unit(unit)
                .totalUnits(totalUnits)
                .nextCourse(nextCourse)
                .grammars(grammars)
                .dialog(DialogDTO.from(unit.getDialog()))
                .vocabularies(unitVocabularies)
                .entryIds(entryIds)
                .review(buildReview(courseId, unit.getUnitNo()))
                .build();
    }

    /**
     * 다른 언어의 코스 id는 <b>없는 것</b>으로 취급한다 — 존재를 알려주지 않는다(설계/04 §8).
     * 영어 과정 서비스도 이 메서드를 쓴다 — "언어가 다르면 404"라는 판정이 두 곳에 생기지 않도록 공개한다.
     */
    public CourseEntity findCourse(Long courseId, CourseLanguage language) {
        return courseRepository.findById(courseId)
                .filter(course -> CourseLanguage.of(course.getLanguage()) == language)
                .orElseThrow(() -> EntityNotFoundException.of("코스", courseId));
    }

    /**
     * 복습 블록 (설계 §7-11-A) — 5의 배수 유닛에서만, 구간은 자기 포함 직전 5유닛.
     * 신규 시드 없이 unit_grammar 매핑 + grammar_point.name 조회로 구성한다.
     */
    private UnitReviewDTO buildReview(Long courseId, int unitNo) {
        if (unitNo % REVIEW_UNIT_INTERVAL != 0) {
            return null;
        }
        int fromUnitNo = unitNo - REVIEW_UNIT_INTERVAL + 1;
        List<String> grammarNames =
                unitGrammarRepository.findGrammarNamesByCourseIdAndUnitNoRange(courseId, fromUnitNo, unitNo);
        return UnitReviewDTO.of(fromUnitNo, unitNo, grammarNames);
    }

    private Map<Long, Long> toCountMap(List<UnitContentCount> counts) {
        return counts.stream()
                .collect(Collectors.toMap(UnitContentCount::getUnitId, UnitContentCount::getCnt));
    }

    private long sum(Map<Long, Long> counts) {
        return counts.values().stream().mapToLong(Long::longValue).sum();
    }
}
