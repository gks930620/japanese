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

    // ── 유닛 구성 수량 (설계/06 §11-4) ────────────────────────────────────────
    //
    // 일본어와 같은 값이 섞여 있지만(문법 2~3 · 어휘 15~20) 여기 한 벌 더 적는다:
    // 영어 콘텐츠의 유일한 기준은 §11이고, 일본어 표가 바뀔 때 영어가 딸려 움직이면 안 되기 때문이다(§11 첫 문단).

    /** 문법 — 유닛당 2~3개 (§11-4 · §11-8) */
    static final int MIN_GRAMMARS_PER_UNIT = 2;
    static final int MAX_GRAMMARS_PER_UNIT = 3;

    /** 문법 예문 — 문법 하나당 1개 이상(권장 2~4, 실측 3) (§11-4) */
    static final int MIN_EXAMPLES_PER_GRAMMAR = 1;

    /**
     * 표현 — 유닛당 6~10개 (§11-4 · §11-5). 일본어 <b>한자 자리</b>지만 수량 규칙의 모양이 다르다:
     * 한자는 코스별 <b>고정 수</b>(입문 0 · N5 5 · N4 10 …)이고 표현은 <b>범위</b>다.
     * 한자가 닫힌 집합(상용한자 2,136자)이라 총량을 배분할 수 있는 반면 영어 표현은 열린 집합이라
     * 누적 총량 목표를 두지 않기로 했기 때문이다(§11-4).
     */
    static final int MIN_EXPRESSIONS_PER_UNIT = 6;
    static final int MAX_EXPRESSIONS_PER_UNIT = 10;

    /** 표현 예문 — 표현 하나당 1개 이상 (§11-5) */
    static final int MIN_EXAMPLES_PER_EXPRESSION = 1;

    /** 어휘 — 유닛당 15~20개 (§11-4, 일본어와 동일) */
    static final int MIN_VOCABULARIES_PER_UNIT = 15;
    static final int MAX_VOCABULARIES_PER_UNIT = 20;

    /** 회화 화자 — 2명 이상. 1인 낭독 장면은 만들지 않는다 (§11-7) */
    static final int MIN_DIALOG_SPEAKERS = 2;

    /**
     * 회화 <b>대사 줄 수의 상한</b> — 전 코스 공통 12줄 (설계/06 §11-7 · §11-12 ②, 2026-09-21 확정).
     *
     * <p><b>상한은 목표가 아니라 난간이다.</b> 하한만 두면 30줄짜리 대본도 계약을 지킨 것이 되는데,
     * 회화는 <b>한 스텝에 통째로</b> 들어가므로 길어지면 학습자에게 남는 것이 스크롤뿐이다.
     */
    static final int MAX_DIALOG_LINES = 12;

    /**
     * 회화 <b>대사 줄 수의 하한</b> — 코스별 차등 (설계/06 §11-7 · §11-12 ②, 2026-09-21 확정).
     *
     * <p><b>왜 코스마다 다른가</b>: 영어 코스의 단계 정의 자체가 <b>"얼마나 길게 말할 수 있느냐"</b> 다 —
     * E3의 이름이 「이어 말하기」이고 E5는 회의·이메일이다. 줄 수가 고정이면 코스가 올라가도
     * <b>학습자가 보는 장면의 길이가 같아</b> 단계가 올랐다는 체감이 없다.
     * 일본어가 N3부터 4줄로 올린 것(§5 · {@code CourseApiIntegrationTest.minDialogLinesOf})과 같은 논리이고,
     * 그래서 <b>모양도 같은 {@code levelCode → 값} 매핑</b>으로 둔다.
     *
     * <p><b>왜 하한이 4부터인가</b>: 맛보기 실측이 4줄이라 <b>소급 보강 없이</b> 그대로 계약이 된다.
     * 5로 올렸다면 이미 공개된 2유닛을 고쳐야 했다.
     *
     * <p>{@code default}가 E1·E2인 것은 안전하다 — 레벨 코드가 {@code E1}~{@code E5}이고
     * {@code E}{courseNo}와 일치한다는 것은 {@code EnglishContentRuleIntegrationTest}의 <b>규칙 5</b>가 이미 고정하고 있어,
     * 여기 들어올 값의 집합은 닫혀 있다.
     */
    static int minDialogLinesOf(CourseCatalog.Course course) {
        return switch (course.levelCode) {
            case "E5" -> 8;
            case "E3", "E4" -> 6;
            default -> 4; // E1 · E2
        };
    }

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
