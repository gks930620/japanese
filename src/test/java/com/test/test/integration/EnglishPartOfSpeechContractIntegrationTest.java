package com.test.test.integration;

import org.junit.jupiter.api.Test;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * 품사 허용 집합이 <b>언어별로 다르다</b> — 설계/06 §11-6 마지막 항 ("서버가 언어별로 검증한다 — 섞이면 400").
 *
 * <p>backend-dev가 직접 추가한 테스트다(senior-dev의 {@code EnglishCourseApiIntegrationTest}는 품사를 다루지 않는다).
 * 영어 시드가 {@code ADJECTIVE}·{@code PREPOSITION}·{@code PHRASE}를 쓰려면 enum에 값을 늘려야 하는데,
 * 값을 늘리는 것만으로는 <b>일본어 자료실에서 {@code pos=ADJECTIVE}가 400이던 것이 조용히 200이 된다</b> —
 * 그 회귀를 막는 것이 이 테스트의 목적이다. 구현보다 먼저 작성했다.</p>
 */
class EnglishPartOfSpeechContractIntegrationTest extends ApiIntegrationTestSupport {

    private static final String JA_VOCABULARY = "/api/library/vocabulary";
    private static final String EN_VOCABULARY = "/api/en/library/vocabulary";

    /** 영어에만 있는 품사는 영어 자료실에서만 통한다 */
    @Test
    void english_only_parts_of_speech_are_accepted_on_the_english_path() throws Exception {
        mockMvc.perform(get(EN_VOCABULARY).param("pos", "ADJECTIVE"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.content").isArray());
        mockMvc.perform(get(EN_VOCABULARY).param("pos", "PREPOSITION,PHRASE"))
                .andExpect(status().isOk());
    }

    /** ★ 회귀 방지 — enum에 값이 늘어도 일본어 자료실의 허용 집합은 7종 그대로다 */
    @Test
    void english_only_parts_of_speech_are_rejected_on_the_japanese_path() throws Exception {
        mockMvc.perform(get(JA_VOCABULARY).param("pos", "ADJECTIVE"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.errorCode").value("BUSINESS_RULE_VIOLATION"));
        mockMvc.perform(get(JA_VOCABULARY).param("pos", "PHRASE"))
                .andExpect(status().isBadRequest());
    }

    /** 그 반대도 마찬가지다 — い형용사·な형용사는 영어에 존재하지 않는다 */
    @Test
    void japanese_only_parts_of_speech_are_rejected_on_the_english_path() throws Exception {
        mockMvc.perform(get(EN_VOCABULARY).param("pos", "I_ADJECTIVE"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.errorCode").value("BUSINESS_RULE_VIOLATION"));
        mockMvc.perform(get(EN_VOCABULARY).param("pos", "NA_ADJECTIVE"))
                .andExpect(status().isBadRequest());
    }

    /** 없는 코드는 양쪽 모두 400 */
    @Test
    void an_unknown_part_of_speech_is_rejected_on_both_paths() throws Exception {
        mockMvc.perform(get(JA_VOCABULARY).param("pos", "UNKNOWN"))
                .andExpect(status().isBadRequest());
        mockMvc.perform(get(EN_VOCABULARY).param("pos", "UNKNOWN"))
                .andExpect(status().isBadRequest());
    }
}
