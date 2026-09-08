package com.test.test.integration;

import org.junit.jupiter.api.Test;

import static org.hamcrest.Matchers.hasItem;
import static org.hamcrest.Matchers.hasSize;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * 레벨 코드 계약 통합테스트 (TDD Red — senior-dev 작성)
 *
 * <p>계약: `설계/03_데이터모델.md` §1·§3 (course.level_code) · `설계/04_API계약.md` §2-3
 * 판정 J-4 / 인수 조건 §8-C → 설계/03 §1·§3
 *
 * <p><b>3단계 qa 치명 ①의 뿌리를 없애는 계약이다.</b> 레벨 코드를 `courseNo`에서 파생하지 않고
 * `course.level_code` 컬럼으로 승격해, 표시 문구(`levelLabel`)와 필터 코드(`levelCode`)를 DB에서부터 가른다.
 * 언어가 둘이 되는 순간 파생 규칙은 언어에 종속되므로(일본어 courseNo 1 = N5, 영어 courseNo 1 = E1)
 * 파생은 더 이상 성립하지 않는다.
 *
 * <p>이 테스트를 수정하지 말 것 — 계약 변경은 senior-dev 경유.
 */
class LibraryLevelContractIntegrationTest extends ApiIntegrationTestSupport {

    @Test
    void course_list_exposes_both_the_label_and_the_filter_code() throws Exception {
        mockMvc.perform(get("/api/courses"))
                .andExpect(status().isOk())
                // 표시 문구는 그대로 두고(기존 화면이 쓴다) 코드가 추가된다
                .andExpect(jsonPath("$.data[?(@.id == 1)].levelLabel", hasItem("문자")))
                .andExpect(jsonPath("$.data[?(@.id == 1)].levelCode", hasItem("INTRO")))
                .andExpect(jsonPath("$.data[?(@.id == 2)].levelLabel", hasItem("JLPT N5")))
                .andExpect(jsonPath("$.data[?(@.id == 2)].levelCode", hasItem("N5")))
                .andExpect(jsonPath("$.data[?(@.id == 6)].levelCode", hasItem("N1")));
    }

    @Test
    void n1_is_no_longer_rejected_by_the_library_filter() throws Exception {
        mockMvc.perform(get("/api/library/kanji").param("level", "N1"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.content").isArray());
    }

    @Test
    void intro_is_a_valid_code_for_grammar_and_vocabulary() throws Exception {
        mockMvc.perform(get("/api/library/grammar").param("level", "INTRO"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.totalElements").value(20));

        mockMvc.perform(get("/api/library/vocabulary").param("level", "INTRO"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.totalElements").value(150));
    }

    /**
     * ★ 선택지에서 뺀 것과 파라미터가 거부하는 것은 <b>다르다</b>.
     * 한자 자료실에 `INTRO`는 유효한 코드이고 데이터가 0건일 뿐이다 → 200 + 0건.
     * 400은 <b>없는 코드</b>의 몫이다(B-2).
     */
    @Test
    void intro_on_the_kanji_library_is_an_empty_result_not_an_error() throws Exception {
        mockMvc.perform(get("/api/library/kanji").param("level", "INTRO"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.content", hasSize(0)))
                .andExpect(jsonPath("$.data.totalElements").value(0));
    }

    @Test
    void unknown_level_codes_are_still_rejected() throws Exception {
        mockMvc.perform(get("/api/library/kanji").param("level", "N9"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.errorCode").value("BUSINESS_RULE_VIOLATION"));
    }

    /** 일본어 자료실에 영어 코드를 주면 400 — 한쪽 값으로 다른 쪽을 조회할 수 없다 */
    @Test
    void english_level_codes_are_rejected_by_the_japanese_library() throws Exception {
        mockMvc.perform(get("/api/library/vocabulary").param("level", "E1"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.errorCode").value("BUSINESS_RULE_VIOLATION"));
    }

    /** N1 350자가 더해져 총 1,350자다. 중복이 있으면 기동이 실패하므로 여기까지 오지 못한다 */
    @Test
    void kanji_library_holds_1350_letters_after_n1() throws Exception {
        mockMvc.perform(get("/api/library/kanji"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.totalAll").value(1350));
    }

    @Test
    void multiple_level_codes_can_be_combined() throws Exception {
        mockMvc.perform(get("/api/library/grammar").param("level", "INTRO,N1"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.totalElements").value(89));
    }
}
