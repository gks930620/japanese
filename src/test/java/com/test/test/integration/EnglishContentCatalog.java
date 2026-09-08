package com.test.test.integration;

import java.util.List;
import java.util.Set;

/**
 * 영어 콘텐츠 규칙의 <b>기대치 단일 출처</b> (설계/06 §11).
 *
 * <p>왜 별도 파일인가: 코스 <b>목록</b>의 단일 출처는 이미 {@link CourseCatalog#ENGLISH}다. 여기서 목록을 한 벌 더
 * 적으면 코스가 열릴 때 두 곳을 고쳐야 하고, 그것이 2026-09 점검 H3가 잡아낸 병이다.
 * 그래서 이 표는 <b>목록을 CourseCatalog에서 파생</b>하고, 목록이 아닌 <b>영어에만 있는 규칙 값</b>(허용 품사·금지 품사·
 * 레벨 코드 모양)만 직접 들고 있다.
 *
 * <p>영어 코스가 열리면 고치는 곳은 {@code CourseCatalog.ENGLISH} <b>한 줄</b>이고 이 파일은 건드리지 않는다.
 * 이 파일을 고쳐야 할 때는 <b>규칙 자체가 바뀐 때</b>뿐이다(= 설계/06 §11 개정 = senior-dev 경유).
 */
final class EnglishContentCatalog {

    /**
     * 영어 어휘 품사 7종 (설계/06 §11-6). 일본어 7종과 <b>집합이 다르다</b>.
     * 굵게 다른 셋: {@code ADJECTIVE}(い·な 구분 없음) · {@code PREPOSITION} · {@code PHRASE}.
     */
    static final Set<String> ALLOWED_PART_OF_SPEECH = Set.of(
            "NOUN", "VERB", "ADJECTIVE", "ADVERB", "PREPOSITION", "CONJUNCTION", "PHRASE");

    /**
     * 영어 콘텐츠에 <b>들어오면 안 되는</b> 일본어 전용 품사 코드 (설계/06 §11-6).
     *
     * <p>{@code ALLOWED}의 여집합으로 계산하지 않고 이름을 적어 둔 이유: 오타로 만든 없는 코드와,
     * <b>일본어 코드를 그대로 베껴 온 것</b>은 실수의 종류가 다르다. 후자는 "일본어 규칙을 가져오지 말라"는
     * §11 첫 문단이 막으려던 바로 그 사고이므로 실패 메시지가 그 사실을 지목해야 한다.
     */
    static final Set<String> JAPANESE_ONLY_PART_OF_SPEECH = Set.of(
            "I_ADJECTIVE", "NA_ADJECTIVE", "EXPRESSION");

    /** 영어 레벨 코드 모양 — {@code E1}~{@code E5}, 그리고 코스 번호와 일치한다 (설계/06 §11-2) */
    static final String LEVEL_CODE_PATTERN = "E[1-5]";

    /**
     * 학습자에게 노출하지 않기로 한 CEFR 코드 (설계/06 §11-2).
     * 내부 난이도 참고선일 뿐이므로 코스명·목표·설명 어디에도 적지 않는다.
     */
    static final List<String> CEFR_CODES = List.of("A1", "A2", "B1", "B2", "C1", "C2");

    private EnglishContentCatalog() {
    }

    /** 순회 대상 = <b>열린</b> 영어 코스. 준비중 코스에는 콘텐츠가 없으므로 규칙을 적용할 대상이 없다. */
    static List<CourseCatalog.Course> availableCourses() {
        List<CourseCatalog.Course> open = CourseCatalog.ENGLISH.stream()
                .filter(course -> course.available)
                .toList();
        if (open.isEmpty()) {
            throw new IllegalStateException(
                    "열린 영어 코스가 없다 — 영어 콘텐츠 규칙을 검증할 대상이 사라졌다(CourseCatalog.ENGLISH 확인)");
        }
        return open;
    }

    /** 영어 자료실 {@code level} 필터가 받는 값의 전부 — {@link CourseCatalog#ENGLISH}에서 파생한다 */
    static Set<String> levelCodes() {
        return CourseCatalog.ENGLISH.stream()
                .map(course -> course.levelCode)
                .collect(java.util.stream.Collectors.toUnmodifiableSet());
    }
}
