package com.test.test.integration;

import org.junit.jupiter.api.Test;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * 회원정보 수정의 trim 규칙 (backend-dev 작성 — 코드리뷰 후속).
 *
 * <p>발견된 결함: {@code @Size(min=2)}는 원문을 재는데 저장은 trim 후라,
 * {@code " 가 "}(공백 포함 3자)가 검증을 통과해 <b>1자 닉네임이 저장</b>됐다 — 계약(2~20자) 위반 경로.</p>
 *
 * <p>채택한 기준: <b>바인딩 시 trim하고, 검증은 trim된 값으로</b> 한다.
 * 검증과 저장이 같은 값을 보므로 그 사이로 빠져나가는 입력이 없다.</p>
 */
class ProfileUpdateTrimIntegrationTest extends ApiIntegrationTestSupport {

    private static final String PROFILE_URL = "/api/me/profile";

    private String profileBody(String nickname, String email) {
        return """
                { "nickname": "%s", "email": "%s" }
                """.formatted(nickname, email);
    }

    /** 공백을 채워 넣은 1자 닉네임은 검증을 통과하면 안 된다 */
    @Test
    void a_one_char_nickname_padded_with_spaces_is_rejected() throws Exception {
        Tokens tokens = loginDefaultUser();

        mockMvc.perform(put(PROFILE_URL)
                        .header(HttpHeaders.AUTHORIZATION, bearer(tokens.accessToken()))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(profileBody(" 가 ", "gks9306202@gmail.com")))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.errorCode").value("VALIDATION_ERROR"))
                .andExpect(jsonPath("$.errors[0].field").value("nickname"));
    }

    /** 유효한 값 앞뒤의 공백은 잘려서 저장된다 — 사용자는 복붙한 공백을 인지하지 못한다 */
    @Test
    void surrounding_spaces_around_a_valid_nickname_are_trimmed() throws Exception {
        Tokens tokens = loginDefaultUser();

        mockMvc.perform(put(PROFILE_URL)
                        .header(HttpHeaders.AUTHORIZATION, bearer(tokens.accessToken()))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(profileBody("  새닉네임  ", "gks9306202@gmail.com")))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.nickname").value("새닉네임"));
    }

    /** 이메일도 같은 규칙 — trim된 값이 검증·저장의 대상이다 */
    @Test
    void surrounding_spaces_around_a_valid_email_are_trimmed() throws Exception {
        Tokens tokens = loginDefaultUser();

        mockMvc.perform(put(PROFILE_URL)
                        .header(HttpHeaders.AUTHORIZATION, bearer(tokens.accessToken()))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(profileBody("한창희", "  trimmed@example.com  ")))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.email").value("trimmed@example.com"));
    }
}
