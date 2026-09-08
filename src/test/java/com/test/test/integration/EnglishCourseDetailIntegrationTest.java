package com.test.test.integration;

import org.junit.jupiter.api.Test;

import static org.hamcrest.Matchers.hasSize;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * 영어 코스 상세·표현 상세 (설계/04 §8 표의 나머지 두 줄)
 *
 * <p><b>backend-dev가 직접 추가한 테스트다.</b> senior-dev의 {@code EnglishCourseApiIntegrationTest}는
 * 이 두 엔드포인트를 <b>404 케이스로만</b> 때린다({@code /api/en/courses/2} → 404) — 즉 <b>경로의 존재</b>만
 * 고정되어 있고 <b>응답 본문</b>은 계약에 없다. 그래서 여기 적힌 필드 이름은 아직 계약이 아니다:
 * ★ senior-dev가 계약으로 승격해 줘야 프론트가 안심하고 의존할 수 있다.</p>
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
    private static final long EN_COURSE_2_PREPARING = 102L;

    @Test
    void the_english_course_detail_counts_expressions_where_japanese_counts_kanji() throws Exception {
        mockMvc.perform(get("/api/en/courses/{courseId}", EN_COURSE_1))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.levelCode").value("E1"))
                .andExpect(jsonPath("$.data.summary.expressionCount").value(12))
                .andExpect(jsonPath("$.data.summary.kanjiCount").doesNotExist())
                .andExpect(jsonPath("$.data.summary.unitCount").value(2))
                .andExpect(jsonPath("$.data.summary.grammarCount").value(4))
                .andExpect(jsonPath("$.data.summary.vocabCount").value(30))
                .andExpect(jsonPath("$.data.units", hasSize(2)))
                .andExpect(jsonPath("$.data.units[0].expressionCount").value(6))
                .andExpect(jsonPath("$.data.units[0].kanjiCount").doesNotExist());
    }

    /** 준비중 코스도 200 — 빈 units·0 summary로 내리고 프론트가 status로 분기한다(일본어와 같은 규칙) */
    @Test
    void a_preparing_english_course_still_answers_200_with_an_empty_unit_list() throws Exception {
        mockMvc.perform(get("/api/en/courses/{courseId}", EN_COURSE_2_PREPARING))
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

    /** 일본어 문법 id를 영어 자료실에 주면 <b>없는 것</b>이다 — 존재를 알려주지 않는다(설계/04 §8) */
    @Test
    void a_japanese_grammar_id_is_404_on_the_english_library() throws Exception {
        mockMvc.perform(get("/api/en/library/grammar/{grammarId}", 1L))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.errorCode").value("NOT_FOUND"));
    }
}
