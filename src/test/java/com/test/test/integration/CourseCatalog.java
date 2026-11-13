package com.test.test.integration;

import java.util.List;

/**
 * 코스별 기대치 표 — <b>테스트가 보는 콘텐츠 사실의 단일 출처</b> (작업자(AI)_문서/03 §5-1).
 *
 * <p>왜 있나: 입문이 열리자 하드코딩된 숫자를 가진 기존 테스트 11건이 한꺼번에 깨졌다.
 * 코스가 열릴 때마다 여러 파일의 숫자를 찾아 고치는 것은 <b>계약 검증이 아니라 숫자 관리</b>다.
 * 앞으로 N1·영어가 열릴 때는 <b>이 표의 한 줄만</b> 고치면 된다.
 *
 * <p>테스트는 개별 숫자가 아니라 <b>규칙</b>을 검증한다:
 * 목록 순서는 {@code courseNo}, 자료실 총계는 <b>코스 합계</b>, "준비중 코스"는 <b>계산으로 찾는다</b>
 * (지금은 N1 하나뿐이지만 그것이 열려도 테스트가 스스로 다음 대상을 고른다).
 *
 * <p>이 표를 고치는 것은 senior-dev다 — 계약 변경이기 때문이다(CLAUDE.md TDD 규칙 2).
 */
final class CourseCatalog {

    /** 코스 한 줄 — 시드가 만든 콘텐츠 사실 그대로 */
    static final class Course {
        final long id;
        final int courseNo;
        final String levelCode;   // 자료실 필터 코드 (작업자(AI)_문서/03 §1·§3)
        final String levelLabel;  // 화면 표시 문구 — 필터에 쓰지 않는다
        final String title;
        final boolean available;
        final int unitCount;
        final int grammarCount;
        final int kanjiCount;
        final int kanjiPerUnit;   // 유닛당 한자 (입문은 0 — 예외가 아니라 정의다)
        final int vocabularyCount;
        final int ruleTableCount;  // 활용 규칙표를 가진 문법 수 — 자료실 hasRules 필터의 기대치

        /**
         * 코스 전체 표현 수 — <b>영어에만 있는 자리</b>이고 일본어는 언제나 0이다.
         *
         * <p>일본어의 {@code kanjiCount} 자리를 영어에서는 표현이 대신 센다(작업자(AI)_문서/04 §8 ·
         * {@code EnglishCourseDetailIntegrationTest}). 같은 필드를 돌려쓰지 않고 따로 둔 이유:
         * 한자와 표현은 <b>규칙의 모양이 다르다</b>(한자는 코스 간 UNIQUE + 유닛당 고정 수,
         * 표현은 코스 간 재등장 허용 + 유닛당 범위). 한 필드에 담으면 어느 규칙을 적용할지가
         * 읽는 사람 머릿속에만 남는다.
         */
        final int expressionCount;

        /** 일본어 코스 — 한자를 가지고 표현은 없다 */
        private Course(long id, int courseNo, String levelCode, String levelLabel, String title,
                       boolean available, int unitCount, int grammarCount, int kanjiCount,
                       int kanjiPerUnit, int vocabularyCount, int ruleTableCount) {
            this(id, courseNo, levelCode, levelLabel, title, available, unitCount, grammarCount,
                    kanjiCount, kanjiPerUnit, vocabularyCount, ruleTableCount, 0);
        }

        private Course(long id, int courseNo, String levelCode, String levelLabel, String title,
                       boolean available, int unitCount, int grammarCount, int kanjiCount,
                       int kanjiPerUnit, int vocabularyCount, int ruleTableCount, int expressionCount) {
            this.id = id;
            this.courseNo = courseNo;
            this.levelCode = levelCode;
            this.levelLabel = levelLabel;
            this.title = title;
            this.available = available;
            this.unitCount = unitCount;
            this.grammarCount = grammarCount;
            this.kanjiCount = kanjiCount;
            this.kanjiPerUnit = kanjiPerUnit;
            this.vocabularyCount = vocabularyCount;
            this.ruleTableCount = ruleTableCount;
            this.expressionCount = expressionCount;
        }
    }

    /**
     * 영어 코스 한 줄 — 일본어의 <b>한자 자리가 표현</b>이다(작업자(AI)_문서/06 §11-4 · 계약 §8).
     *
     * <p>{@code new Course(...)}를 그대로 쓰지 않는 이유는 영어에서 언제나 같은 값이 되는 인자
     * (한자 0 · 유닛당 한자 0 · 규칙표 0)와 <b>레벨 라벨 = 레벨 코드</b>를 표에서 지우기 위해서다.
     * 라벨이 코드와 같은 것은 취향이 아니라 계약이고({@code EnglishContentRuleIntegrationTest} 규칙 5),
     * 표에 두 번 적으면 한쪽만 고치는 길이 열린다.
     */
    private static Course english(long id, int courseNo, String levelCode, String title, boolean available,
                                  int unitCount, int grammarCount, int expressionCount, int vocabularyCount) {
        return new Course(id, courseNo, levelCode, levelCode, title, available,
                unitCount, grammarCount, 0, 0, vocabularyCount, 0, expressionCount);
    }

    /**
     * <b>일본어 코스</b> — 학습 경로 순서(= courseNo 오름차순). 이 순서가 곧 `/api/courses` 응답 순서다.
     *
     * <p>2026-08-21 입문 개통(코스 0 · 유닛 10 · 문법 20 · <b>한자 0</b> · 어휘 150) / 2026-08-22 N1 개통.
     * <b>이제 일본어에는 준비중 코스가 없다.</b>
     * 자료실 총계(문법·한자·어휘)는 이 목록의 합계이므로 <b>영어를 여기 섞으면 안 된다</b> —
     * `/api/courses`·`/api/library/**`는 일본어만 돌려주기 때문이다(작업자(AI)_문서/04 §8).
     */
    static final List<Course> COURSES = List.of(
            new Course(1L, 0, "INTRO", "문자", "입문", true, 10, 20, 0, 0, 150, 3),
            new Course(2L, 1, "N5", "JLPT N5", "왕초보", true, 20, 44, 100, 5, 321, 15),
            new Course(3L, 2, "N4", "JLPT N4", "초급", true, 20, 47, 200, 10, 320, 21),
            new Course(4L, 3, "N3", "JLPT N3", "중급", true, 25, 53, 350, 14, 375, 21),
            new Course(5L, 4, "N2", "JLPT N2", "중상급", true, 25, 62, 350, 14, 400, 21),
            new Course(6L, 5, "N1", "JLPT N1", "고급", true, 25, 69, 350, 14, 450, 6));

    /**
     * <b>영어 코스</b> (작업자(AI)_문서/03 §5-2) — E1(완성) · <b>E2(부분 공개)</b>가 열려 있고 E3~E5는 준비중이다.
     * 별도 목록인 이유: `/api/courses`와 `/api/en/courses`가 서로를 절대 포함하지 않는다는 것이 계약이고,
     * 총계도 언어별로 갈리기 때문이다. 준비중 동작을 검증할 대상은 이제 <b>여기에만</b> 있다.
     *
     * <p><b>여기 적힌 {@code unitCount}가 곧 영어 콘텐츠 전수 검증의 순회 범위</b>다
     * ({@code EnglishContentRuleIntegrationTest}의 유닛 순회 검사와
     * {@code EnglishVocabularyMergeContractIntegrationTest}가 {@code unitNo <= course.unitCount}로 돈다).
     * 즉 <b>유닛을 늘려 놓고 이 숫자를 안 올리면 새 유닛은 어떤 규칙 검사도 받지 않는다</b> —
     * 시드가 통과한 것이 아니라 <b>아무도 보지 않은</b> 것이고, 2026-09-21 유닛 3~5 증설 때 실제로 그 상태였다.
     * 콘텐츠를 늘릴 때 고칠 곳은 이 표 <b>한 줄</b>이다.
     *
     * <p>E1 증설 이력: 유닛 2 → 5 → 10 → <b>15</b> · 문법 4 → 13 → 28 → <b>42</b> · 표현 12 → 33 → 68 → <b>103</b> ·
     * 어휘 30 → 78 → 158 → <b>238</b> (시드 {@code data-course-en-units.sql}의 매핑 행 수 =
     * `/api/en/courses/101` summary와 일치 확인 — 집계는 DB 값이므로 시드가 곧 기대치다).
     *
     * <p><b>2026-09-22 E1이 계획(15유닛)을 채웠다.</b> 여기 적는 {@code unitCount}는 여전히 <b>지금 열린 수</b>이지
     * 계획 수가 아니다 — 계획 수({@code course.planned_unit_count} = 15)는 응답의 {@code coursePlannedUnits}로
     * 따로 내려가고, 그 계약은 {@link EnglishCourseApiIntegrationTest}가 고정한다(작업자(AI)_문서/04 §2-3-A).
     * 둘을 한 숫자로 합치면 순회 범위가 <b>아직 없는 유닛까지</b> 돌아 전부 404가 된다.
     * 지금은 두 값이 우연히 같지만(15 = 15) <b>같은 것이 아니다</b>.
     *
     * <p><b>2026-09-22 E2가 5/20으로 열렸다</b>(기획 {@code 작업자(AI)_문서/기획_영어_E2커리큘럼.md} §8-4 1).
     * <b>2026-11-13 같은 자리를 10/20으로 올렸다</b>(두 번째 배치 = 유닛 6~10 · 기획 §3-1·§3-3 · §8-1 "공개 순서 5 → 10 → 15 → 20").
     * 여기 {@code unitCount}를 <b>콘텐츠보다 먼저</b> 올려 두는 것은 의도된 Red다 —
     * 이 숫자가 곧 순회 범위라, 콘텐츠가 들어온 뒤에 올리면 <b>새 유닛 5개가 규칙 4·6·7의 그물 밖</b>에 놓인다
     * (2026-09-21 E1 유닛 3~5·6~10·11~15 증설 때 <b>세 번</b> 실제로 그랬다).
     * 순서를 뒤집으면 "시드가 통과한" 것이 아니라 "아무도 보지 않은" 것이 된다. <b>빨간 것은 보이지만 그물 밖은 안 보인다.</b>
     *
     * <p><b>늘어난 값은 전부 유닛 1~5 실측에서 유도한 것이다</b>(지어낸 숫자가 아니다 — 2026-11-13 senior-dev):
     * 유닛 1~5가 응답으로 내려주는 집계가 {@code 5 / 15 / 35 / 80}이므로 <b>유닛당 문법 3 · 표현 7 · 어휘 16</b>이고
     * (15/5 · 35/5 · 80/5), 기획 §3-3이 유닛 6~10에 지정한 수량도 같은 3 · 7 · 16이다.
     * 그러므로 {@code 10 / (15+5*3)=30 / (35+5*7)=70 / (80+5*16)=160}이다.
     * 이 네 숫자는 장식이 아니라 <b>코스 상세 집계와 맞춰진다</b>
     * ({@link EnglishCourseDetailIntegrationTest#every_open_english_course_summary_matches_the_catalog}) —
     * 2026-11-13까지 E2의 세 집계는 <b>어느 테스트도 보지 않던 죽은 숫자</b>였고 그 자리를 같은 커밋에서 닫았다.
     *
     * <p>⚠️ <b>공개 경계는 언제나 5의 배수다</b>(작업자(AI)_문서/06 §11-12 ① 1) — 7유닛에서 끊지 않는다.
     * 유닛 10의 정리에 <b>6~10 복습 블록이 자동으로 붙어</b>(`unitNo % 5 == 0`) 직전 5유닛의 실재를 요구하기 때문이다.
     * 2026-11-13 그 규칙을 테스트로 내렸다({@code EnglishContentRuleIntegrationTest} 규칙 7) —
     * 그전까지는 §11-11 6번이 "사람이 지켜야 하는 것"으로 적어 둔 자리였다.
     *
     * <p>⚠️ <b>"계획보다 적게 연" 상태는 지금 E2가 들고 있다</b>({@code unitCount 10 < planned 20}) —
     * 즉 <b>"열린 데까지의 끝"(작업자(AI)_문서/04 §2-3-A)의 실데이터가 되살아났고</b>, E1이 15/15가 되며 포기했던 백엔드 커버리지를
     * 그 위에 복구했다(작업자(AI)_문서/08 C-30 → <b>2026-09-22 복구됨</b>).
     * 고정 테스트는 {@code EnglishCourseApiIntegrationTest}의 "열린 데까지의 끝" 블록에 있다.
     *
     * <p>⚠️ <b>E2가 20/20을 채우는 날 다시 읽을 것</b>: 그 순간 상태 2의 실데이터가 <b>또</b> 사라진다(E1 때와 같은 일).
     * 그때 할 일은 <b>숫자만 고쳐 테스트를 살리는 것이 아니라</b> 둘 중 하나다 —
     * ① E3를 부분 공개하는 <b>같은 커밋</b>에서 그 테스트의 대상을 E3로 옮긴다(권장: 공백이 하루도 생기지 않는다),
     * ② 옮길 대상이 없으면 C-30처럼 <b>사라진 커버리지를 계약 표(04 §2-3-A)에 "없다"로 적고</b> 복구 조건을 여기 다시 박는다.
     */
    static final List<Course> ENGLISH = List.of(
            english(101L, 1, "E1", "다시 세우기", true, 15, 42, 103, 238),
            // E2 두 번째 배치 — 유닛 1~10(문법 30 · 표현 70 · 어휘 160 = 유닛당 3·7·16 × 10). 계획은 20유닛이다(= 부분 공개).
            english(102L, 2, "E2", "일상 말하기", true, 10, 30, 70, 160),
            english(103L, 3, "E3", "이어 말하기", false, 0, 0, 0, 0),
            english(104L, 4, "E4", "뉘앙스", false, 0, 0, 0, 0),
            english(105L, 5, "E5", "실전과 격식", false, 0, 0, 0, 0));

    /** 영어 코스 하나 — 일본어 {@link #byId}와 표를 섞지 않는다(두 목록은 서로를 포함하지 않는 것이 계약이다) */
    static Course englishById(long id) {
        return ENGLISH.stream().filter(course -> course.id == id).findFirst()
                .orElseThrow(() -> new IllegalArgumentException("표(CourseCatalog.ENGLISH)에 없는 영어 코스: " + id));
    }

    private CourseCatalog() {
    }

    static Course byId(long id) {
        return COURSES.stream().filter(course -> course.id == id).findFirst()
                .orElseThrow(() -> new IllegalArgumentException("표에 없는 코스: " + id));
    }

    /**
     * 준비중 코스 하나 — <b>계산으로 찾는다.</b>
     *
     * <p>2026-08-22: 일본어가 전부 열리면서 대상이 <b>영어로 옮겨 갔다</b>(2026-09-22 E2 개통 후로는 <b>E3~E5</b>).
     * 대상을 이름으로 적지 않고 계산으로 찾는 덕에 코스가 열려도 <b>이 메서드를 쓰는 테스트는 그대로다</b>. 언어를 가리지 않고 찾는 이유는
     * 이것을 쓰는 검증의 대상이 "준비중 <b>상태</b>"이기 때문이다 — 서버의 쓰기 시점 검증
     * ({@code CourseUnitCatalog.requireExistingUnit})도 언어를 보지 않고 `isPreparing()`만 본다.
     *
     * <p>⚠️ 단 <b>일본어 전용 경로</b>(`/api/courses/{id}`)에 이 값을 쓰면 안 된다 — 영어 id는 그 경로에서 404다.
     * 준비중 <b>상세·유닛</b> 계약은 영어 경로에서 검증한다({@code EnglishCourseApiIntegrationTest}).
     * 언어 무관 경로(`/api/progress/**`, `/api/me/merge`)에서는 그대로 쓸 수 있다.
     */
    static Course somePreparingCourse() {
        return java.util.stream.Stream.concat(COURSES.stream(), ENGLISH.stream())
                .filter(course -> !course.available).findFirst()
                .orElseThrow(() -> new IllegalStateException(
                        "준비중 코스가 하나도 없다 — 준비중 동작을 검증할 대상이 사라졌으므로 그 테스트를 지워야 한다"));
    }
    static List<Course> available() {
        return COURSES.stream().filter(course -> course.available).toList();
    }

    /** 자료실 총계는 <b>코스 합계</b>다 — 코스가 열릴 때마다 자동으로 늘어난다 */
    static int totalGrammar() {
        return available().stream().mapToInt(course -> course.grammarCount).sum();
    }

    static int totalKanji() {
        return available().stream().mapToInt(course -> course.kanjiCount).sum();
    }

    static int totalVocabulary() {
        return available().stream().mapToInt(course -> course.vocabularyCount).sum();
    }

    /**
     * 활용 규칙표를 가진 문법 수 — 자료실 `hasRules=true`의 기대치.
     *
     * <p>2026-08-25 보강으로 34 → <b>87</b>. 더 늘리지 않은 근거를 남긴다(같은 논의 반복 방지):
     * 입문 미보유 17개는 전부 인사·정형구라 {@code example_before → example_after} <b>변형표 스키마에 맞지 않고</b>,
     * N1 미보유 63개는 대부분 "명사+X" 고정 접속이라 표를 만들어도 explanation의 "접속:" 한 줄을 되풀이할 뿐이다.
     * <b>활용 패러다임이 있는 것만 표를 갖는다</b> — 표의 존재 자체가 "이건 활용한다"는 신호다.
     */
    static int totalRuleTables() {
        return available().stream().mapToInt(course -> course.ruleTableCount).sum();
    }

    static int courseCount() {
        return COURSES.size();
    }
}
