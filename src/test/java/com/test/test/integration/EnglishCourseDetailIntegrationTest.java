package com.test.test.integration;

import com.fasterxml.jackson.databind.JsonNode;
import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;
import static org.hamcrest.Matchers.hasSize;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * 영어 코스 상세·표현 상세 (작업자(AI)_문서/04 §8 표의 나머지 두 줄)
 *
 * <p><b>backend-dev가 직접 추가한 테스트다.</b> senior-dev의 {@code EnglishCourseApiIntegrationTest}는
 * 이 두 엔드포인트를 <b>404 케이스로만</b> 때린다({@code /api/en/courses/2} → 404) — 즉 <b>경로의 존재</b>만
 * 고정되어 있고 <b>응답 본문</b>은 계약에 없다. 그래서 여기 적힌 필드 이름은 아직 계약이 아니다:
 * ★ senior-dev가 계약으로 승격해 줘야 프론트가 안심하고 의존할 수 있다.</p>
 *
 * <p><b>★ 2026-11-13 senior-dev가 집계 네 칸을 계약으로 승격했다</b> — {@code summary}의
 * {@code unitCount}·{@code grammarCount}·{@code expressionCount}·{@code vocabCount}와 {@code units} 배열 길이는
 * 이제 <b>열린 영어 코스 전부</b>에 대해 기대치 표와 맞춰진다({@link #every_open_english_course_summary_matches_the_catalog}).
 * 승격의 계기는 "프론트가 의존해도 되는가"가 아니라 <b>E2의 집계 세 칸이 죽은 숫자였다</b>는 사실이다(그 테스트 javadoc).</p>
 *
 * <p>고정하려는 것은 두 가지다.</p>
 * <ol>
 *   <li>유닛 응답이 {@code kanjis} → {@code expressions}로 갈린 것과 <b>같은 대칭</b>이 집계에도 적용된다
 *       — 코스 상세의 {@code kanjiCount} 자리는 {@code expressionCount}다. 대칭이 깨지면 화면이
 *       "한자 0자"라는 있지도 않은 사실을 그리게 된다.</li>
 *   <li>집계는 <b>DB 값</b>이다(하드코딩 금지 계약) — 시드가 늘면 이 숫자도 따라 늘어야 한다.</li>
 * </ol>
 */
class EnglishCourseDetailIntegrationTest extends ApiIntegrationTestSupport {

    private static final long EN_COURSE_1 = 101L;

    /** 유닛 1의 표현 수 — 코스 합계와 달리 <b>유닛별 값</b>이라 코스 표에서 파생되지 않는다(아래 주석 참고) */
    private static final int UNIT_1_EXPRESSIONS = 6;

    /**
     * 집계는 <b>DB 값</b>이다 — 그래서 기대치도 시드 사실의 단일 출처인 {@link CourseCatalog#ENGLISH}에서 받아온다.
     *
     * <p>2026-09-21 E1이 2유닛 → 5유닛으로 늘자 여기 박혀 있던 네 숫자(12·2·4·30)가 한꺼번에 깨졌다.
     * "집계는 하드코딩 금지"라고 적어 두고 <b>기대치를 하드코딩</b>하면 유닛이 늘 때마다 같은 수정이 되풀이된다.
     * 이제 콘텐츠가 자라도 고칠 곳은 {@code CourseCatalog.ENGLISH} 한 줄이다.
     *
     * <p>{@link #UNIT_1_EXPRESSIONS}만 숫자로 남은 이유: 코스 표가 들고 있는 것은 <b>코스 합계</b>이고
     * 이 단언은 <b>유닛 1 하나</b>를 본다. 유닛별 수량은 코스마다 균일하지 않아(유닛 1·2는 표현 6개,
     * 3~5는 7개) 합계에서 나눠 구할 수 없다. 유닛별 수량이 <b>범위 안인가</b>는
     * {@code EnglishContentRuleIntegrationTest}의 규칙 6이 전 유닛에 대해 따로 본다 —
     * 여기서 고정하는 것은 "코스 상세의 유닛 줄에 {@code expressionCount} 필드가 실린다"는 <b>응답 모양</b>이다.
     *
     * <p><b>2026-11-13 네 숫자를 아래 {@link #every_open_english_course_summary_matches_the_catalog}로 옮겼다</b>
     * (senior-dev): 이 테스트는 E1 하나만 봤고, 그래서 <b>E2의 집계 세 칸은 어느 테스트도 보지 않는 죽은 숫자</b>였다
     * (기대치 표에 {@code 15 / 35 / 80}이 적혀 있었지만 틀려도 아무것도 깨지지 않았다).
     * 같은 숫자를 두 테스트가 보면 08 C-11("한 규칙은 한 파일에서만")에 걸리므로, 여기서는 <b>모양</b>만 남긴다 —
     * 한자 자리가 표현으로 갈린 대칭(summary·유닛 줄 양쪽)과 유닛 줄의 수량 필드다.
     */
    @Test
    void the_english_course_detail_counts_expressions_where_japanese_counts_kanji() throws Exception {
        CourseCatalog.Course english1 = CourseCatalog.englishById(EN_COURSE_1);

        mockMvc.perform(get("/api/en/courses/{courseId}", EN_COURSE_1))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.levelCode").value(english1.levelCode))
                .andExpect(jsonPath("$.data.summary.kanjiCount").doesNotExist())
                .andExpect(jsonPath("$.data.units[0].expressionCount").value(UNIT_1_EXPRESSIONS))
                .andExpect(jsonPath("$.data.units[0].kanjiCount").doesNotExist());
    }

    /**
     * 코스 상세의 집계 네 칸 = <b>열린 영어 코스 전부</b>에 대해 기대치 표와 같다 (2026-11-13 senior-dev 신설).
     *
     * <p><b>왜 생겼나</b>: {@link CourseCatalog#ENGLISH}의 {@code grammarCount}·{@code expressionCount}·
     * {@code vocabularyCount}는 "시드가 만든 콘텐츠 사실"로 적혀 있지만, 2026-11-13까지 그 세 칸을 서버 응답과
     * 맞춰 보는 테스트는 <b>E1 한 줄뿐</b>이었다. 그래서 E2를 5/20으로 열 때 적은 {@code 15 / 35 / 80}은
     * <b>아무도 보지 않는 숫자</b>였다 — 유닛당 수량의 <b>범위</b>는 {@code EnglishContentRuleIntegrationTest}
     * 규칙 6이 보지만, 규칙 6은 유닛 10개가 각각 문법 2개여도 통과한다(2~3 범위). 즉 <b>표에 30이라 적고
     * 시드에 20을 넣어도 조용했다.</b> 유닛 수를 늘릴 때 고치는 줄이 바로 그 줄이므로 가장 틀리기 쉬운 자리다.
     *
     * <p>코스가 열리거나 유닛이 늘어도 <b>이 파일은 고치지 않는다</b> — 목록·기대치의 단일 출처는 표 한 줄이다.
     *
     * <p>{@code units} 배열 길이를 함께 보는 이유: {@code summary.unitCount}와 <b>다른 쿼리에서 나온다</b>
     * (하나는 집계, 하나는 목록). 둘이 갈리면 코스 카드가 말하는 유닛 수와 실제 목록 행 수가 어긋난다.
     */
    @Test
    void every_open_english_course_summary_matches_the_catalog() throws Exception {
        for (CourseCatalog.Course course : EnglishContentCatalog.availableCourses()) {
            JsonNode data = objectMapper
                    .readTree(mockMvc.perform(get("/api/en/courses/{courseId}", course.id))
                            .andExpect(status().isOk())
                            .andReturn().getResponse().getContentAsString())
                    .path("data");
            JsonNode summary = data.path("summary");

            assertCount(summary, "unitCount", course.unitCount, course, "유닛");
            assertCount(summary, "grammarCount", course.grammarCount, course, "문법");
            assertCount(summary, "expressionCount", course.expressionCount, course, "표현");
            assertCount(summary, "vocabCount", course.vocabularyCount, course, "어휘");

            assertThat(data.path("units").size())
                    .as("코스 %s(%s) — 유닛 목록이 %s행인데 기대치 표는 %s개다. summary.unitCount와 **다른 쿼리**라서"
                                    + " 갈릴 수 있는 자리다",
                            course.id, course.title, data.path("units").size(), course.unitCount)
                    .isEqualTo(course.unitCount);
        }
    }

    private void assertCount(JsonNode summary, String field, int expected,
                             CourseCatalog.Course course, String kind) {
        assertThat(summary.path(field).asInt())
                .as("코스 %s(%s) — %s 집계(summary.%s)가 %s개인데 기대치 표(CourseCatalog.ENGLISH)는 %s개다. "
                                + "집계는 DB 값이므로 **시드가 곧 기대치**다 — 표를 콘텐츠보다 먼저 올리는 것이 "
                                + "이 프로젝트의 순서이니(CourseCatalog.ENGLISH 주석) 시드가 아직 안 들어왔다면 "
                                + "**의도된 Red**이고, 시드가 다 들어왔는데 다르면 **표의 숫자가 틀린 것**이다",
                        course.id, course.title, kind, field, summary.path(field).asInt(), expected)
                .isEqualTo(expected);
    }

    /**
     * 준비중 코스도 200 — 빈 units·0 summary로 내리고 프론트가 status로 분기한다(일본어와 같은 규칙).
     *
     * <p><b>2026-09-22 대상을 이름에서 계산으로 바꿨다</b>(senior-dev): 여기 박혀 있던 {@code 102}가
     * E2 개통과 동시에 준비중이 아니게 되어 <b>멀쩡한 계약을 검증하던 테스트가 데이터 때문에 빨개졌다</b>.
     * 검증 대상은 "102"가 아니라 <b>준비중 상태</b>이므로 {@link CourseCatalog#somePreparingCourse()}로 찾는다 —
     * 코스가 하나씩 열려도 테스트가 스스로 다음 대상(E3 → E4 → E5)을 고르고, 준비중 코스가 하나도 남지 않는 날에는
     * 그 메서드가 <b>"검증할 대상이 사라졌다"고 말하며</b> 실패한다.
     */
    @Test
    void a_preparing_english_course_still_answers_200_with_an_empty_unit_list() throws Exception {
        mockMvc.perform(get("/api/en/courses/{courseId}", CourseCatalog.somePreparingCourse().id))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.status").value("PREPARING"))
                .andExpect(jsonPath("$.data.units", hasSize(0)))
                .andExpect(jsonPath("$.data.summary.expressionCount").value(0));
    }

    /** 표현 상세 — 자료실 목록에서 받은 id를 그대로 다시 부른다(콘텐츠를 두 번 만들지 않는다 — 01 §4) */
    @Test
    void an_expression_detail_carries_examples_and_the_unit_it_is_learned_in() throws Exception {
        String firstId = objectMapper
                .readTree(mockMvc.perform(get("/api/en/library/expressions").param("level", "E1"))
                        .andExpect(status().isOk())
                        .andReturn().getResponse().getContentAsString())
                .path("data").path("content").path(0).path("id").asText();

        mockMvc.perform(get("/api/en/library/expressions/{expressionId}", firstId))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.text").isNotEmpty())
                .andExpect(jsonPath("$.data.meaningKo").isNotEmpty())
                .andExpect(jsonPath("$.data.ipa").isNotEmpty())
                .andExpect(jsonPath("$.data.koApprox").isNotEmpty())
                .andExpect(jsonPath("$.data.level").value("E1"))
                .andExpect(jsonPath("$.data.examples").isArray())
                .andExpect(jsonPath("$.data.learnedIn.courseId").value(101))
                .andExpect(jsonPath("$.data.learnedIn.unitNo").value(1));
    }

    /** 일본어 문법 id를 영어 자료실에 주면 <b>없는 것</b>이다 — 존재를 알려주지 않는다(작업자(AI)_문서/04 §8) */
    @Test
    void a_japanese_grammar_id_is_404_on_the_english_library() throws Exception {
        mockMvc.perform(get("/api/en/library/grammar/{grammarId}", 1L))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.errorCode").value("NOT_FOUND"));
    }
}
