package com.test.test.integration;

import org.junit.jupiter.api.Test;

import static org.hamcrest.Matchers.hasItem;
import static org.hamcrest.Matchers.hasSize;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * 입문(코스 0) 개통 통합테스트 (TDD Red — senior-dev 작성)
 *
 * <p>계약: `설계/04_API계약.md` §2-3 · `설계/06_콘텐츠_제작규칙.md` §2·§6 (입문 한자 0자)
 * 판정 J-1 / 인수 조건 §8-A → 설계/06 §2
 *
 * <p><b>입문은 한자가 0자다.</b> 이것은 예외가 아니라 코스별 정의다(06 §2 일반화).
 * 그래서 이 테스트가 고정하는 것은 "한자가 없다"가 아니라 <b>"한자가 0으로 정상 응답된다"</b>이다 —
 * 배열은 절대 null이 아니고(04 §1-3) 카운트는 0이며, 그 사실을 화면이 그대로 읽어 스텝을 하나 줄인다.
 *
 * <p>이 테스트를 수정하지 말 것 — 계약 변경은 senior-dev 경유.
 */
class IntroCourseApiIntegrationTest extends ApiIntegrationTestSupport {

    private static final long INTRO_COURSE_ID = 1L;

    @Test
    void intro_course_is_open() throws Exception {
        mockMvc.perform(get("/api/courses"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data[?(@.id == 1)].status", hasItem("AVAILABLE")))
                .andExpect(jsonPath("$.data[?(@.id == 1)].unitCount", hasItem(10)));
    }

    @Test
    void intro_detail_summarises_ten_units_and_zero_kanji() throws Exception {
        mockMvc.perform(get("/api/courses/{courseId}", INTRO_COURSE_ID))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.status").value("AVAILABLE"))
                .andExpect(jsonPath("$.data.units", hasSize(10)))
                // 한자 0은 "빠진 값"이 아니라 "정의된 값"이다
                .andExpect(jsonPath("$.data.summary.kanjiCount").value(0))
                .andExpect(jsonPath("$.data.summary.grammarCount").value(20))
                .andExpect(jsonPath("$.data.summary.vocabCount").value(150));
    }

    @Test
    void every_intro_unit_reports_zero_kanji_in_the_list() throws Exception {
        mockMvc.perform(get("/api/courses/{courseId}", INTRO_COURSE_ID))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.units[*].kanjiCount").value(org.hamcrest.Matchers.everyItem(
                        org.hamcrest.Matchers.equalTo(0))));
    }

    /**
     * ★ 화면이 스텝을 하나 줄이는 근거 — <b>필드를 빼지 않고 빈 배열로 준다</b>.
     * 필드를 빼면 프론트가 "없는 것"과 "빈 것"을 구분해야 한다(04 §1-3이 금지하는 상태).
     */
    @Test
    void intro_unit_returns_an_empty_kanji_array_not_a_missing_field() throws Exception {
        mockMvc.perform(get("/api/courses/{courseId}/units/{unitNo}", INTRO_COURSE_ID, 1))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.kanjis").exists())
                .andExpect(jsonPath("$.data.kanjis", hasSize(0)));
    }

    @Test
    void intro_unit_has_two_grammars_one_dialog_and_fifteen_vocabularies() throws Exception {
        mockMvc.perform(get("/api/courses/{courseId}/units/{unitNo}", INTRO_COURSE_ID, 1))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.grammars", hasSize(2)))
                .andExpect(jsonPath("$.data.dialog").exists())
                .andExpect(jsonPath("$.data.vocabularies", hasSize(15)));
    }

    /** 입문 어휘는 원문이 전부 가나라 kana가 NULL이다 — 계약대로다(06 §1) */
    @Test
    void intro_vocabularies_have_null_kana_by_contract() throws Exception {
        mockMvc.perform(get("/api/courses/{courseId}/units/{unitNo}", INTRO_COURSE_ID, 1))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.vocabularies[0].kana").doesNotExist());
    }

    /** 마지막 유닛(10)까지 열려 있고, 없는 유닛은 404다 */
    @Test
    void intro_units_are_reachable_up_to_ten() throws Exception {
        mockMvc.perform(get("/api/courses/{courseId}/units/{unitNo}", INTRO_COURSE_ID, 10))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.unitNo").value(10));

        mockMvc.perform(get("/api/courses/{courseId}/units/{unitNo}", INTRO_COURSE_ID, 11))
                .andExpect(status().isNotFound());
    }
}
