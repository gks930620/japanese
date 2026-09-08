package com.test.test.integration;

import java.util.List;

/**
 * 코스별 기대치 표 — <b>테스트가 보는 콘텐츠 사실의 단일 출처</b> (설계/03 §5-1).
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
        final String levelCode;   // 자료실 필터 코드 (설계/03 §1·§3)
        final String levelLabel;  // 화면 표시 문구 — 필터에 쓰지 않는다
        final String title;
        final boolean available;
        final int unitCount;
        final int grammarCount;
        final int kanjiCount;
        final int kanjiPerUnit;   // 유닛당 한자 (입문은 0 — 예외가 아니라 정의다)
        final int vocabularyCount;
        final int ruleTableCount;  // 활용 규칙표를 가진 문법 수 — 자료실 hasRules 필터의 기대치

        private Course(long id, int courseNo, String levelCode, String levelLabel, String title,
                       boolean available, int unitCount, int grammarCount, int kanjiCount,
                       int kanjiPerUnit, int vocabularyCount, int ruleTableCount) {
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
        }
    }

    /**
     * 학습 경로 순서(= courseNo 오름차순)로 적는다. <b>이 순서가 곧 목록 응답 순서</b>다.
     *
     * <p>2026-08-21 입문 개통 반영: 코스 0이 PREPARING → AVAILABLE(유닛 10 · 문법 20 · <b>한자 0</b> · 어휘 150).
    /**
     * <b>일본어 코스</b> — 학습 경로 순서(= courseNo 오름차순). 이 순서가 곧 `/api/courses` 응답 순서다.
     *
     * <p>2026-08-21 입문 개통 / 2026-08-22 N1 개통. <b>이제 일본어에는 준비중 코스가 없다.</b>
     * 자료실 총계(문법·한자·어휘)는 이 목록의 합계이므로 <b>영어를 여기 섞으면 안 된다</b> —
     * `/api/courses`·`/api/library/**`는 일본어만 돌려주기 때문이다(설계/04 §8).
     */
    static final List<Course> COURSES = List.of(
            new Course(1L, 0, "INTRO", "문자", "입문", true, 10, 20, 0, 0, 150, 3),
            new Course(2L, 1, "N5", "JLPT N5", "왕초보", true, 20, 44, 100, 5, 321, 15),
            new Course(3L, 2, "N4", "JLPT N4", "초급", true, 20, 47, 200, 10, 320, 21),
            new Course(4L, 3, "N3", "JLPT N3", "중급", true, 25, 53, 350, 14, 375, 21),
            new Course(5L, 4, "N2", "JLPT N2", "중상급", true, 25, 62, 350, 14, 400, 21),
            new Course(6L, 5, "N1", "JLPT N1", "고급", true, 25, 69, 350, 14, 450, 6));

    /**
     * <b>영어 코스</b> (설계/03 §5-2) — 맛보기라 E1만 열려 있다.
     * 별도 목록인 이유: `/api/courses`와 `/api/en/courses`가 서로를 절대 포함하지 않는다는 것이 계약이고,
     * 총계도 언어별로 갈리기 때문이다. 준비중 동작을 검증할 대상은 이제 <b>여기에만</b> 있다.
     */
    static final List<Course> ENGLISH = List.of(
            new Course(101L, 1, "E1", "E1", "다시 세우기", true, 2, 4, 0, 0, 30, 0),
            new Course(102L, 2, "E2", "E2", "일상 말하기", false, 0, 0, 0, 0, 0, 0),
            new Course(103L, 3, "E3", "E3", "이어 말하기", false, 0, 0, 0, 0, 0, 0),
            new Course(104L, 4, "E4", "E4", "뉘앙스", false, 0, 0, 0, 0, 0, 0),
            new Course(105L, 5, "E5", "E5", "실전과 격식", false, 0, 0, 0, 0, 0, 0));

    private CourseCatalog() {
    }

    static Course byId(long id) {
        return COURSES.stream().filter(course -> course.id == id).findFirst()
                .orElseThrow(() -> new IllegalArgumentException("표에 없는 코스: " + id));
    }

    /**
     * 준비중 코스 하나 — <b>계산으로 찾는다.</b>
     *
     * <p>2026-08-22: 일본어가 전부 열리면서 대상이 <b>영어 E2~E5로 옮겨 갔다.</b> 언어를 가리지 않고 찾는 이유는
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
