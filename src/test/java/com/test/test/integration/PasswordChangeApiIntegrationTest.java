package com.test.test.integration;

import com.fasterxml.jackson.databind.JsonNode;
import org.junit.jupiter.api.Test;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MvcResult;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * 비밀번호 변경 API 통합테스트 (TDD Red — senior-dev 작성)
 *
 * <p>계약 문서: `설계/04_API계약.md` §4-1 (PUT /api/me/password — token_version 상승·refresh 전량 삭제)
 * 인수 조건: AC-A-21 ~ AC-A-29
 *
 * <p>이 화면의 400은 <b>세 가지가 서로 다른 화면 동작</b>을 낳는다(어느 칸을 비우는가 / 어느 칸 아래에 문구를 다는가).
 * 그래서 errorCode를 셋으로 쪼갰다 — 프론트가 `message` 문자열을 비교하게 만들지 않기 위해서다(설계/04 §1-1).
 *
 * <p>이 테스트를 수정하지 말 것 — 계약 변경은 senior-dev 경유 (CLAUDE.md TDD 규칙 2).
 */
class PasswordChangeApiIntegrationTest extends ApiIntegrationTestSupport {

    private static final String PASSWORD_URL = "/api/me/password";
    private static final String NEW_PASSWORD = "newpass1234";

    private String changeBody(String current, String next, String confirm) {
        return """
                { "currentPassword": "%s", "newPassword": "%s", "newPasswordConfirm": "%s" }
                """.formatted(current, next, confirm);
    }

    private MvcResult changePassword(Tokens tokens, String body) throws Exception {
        return mockMvc.perform(put(PASSWORD_URL)
                        .header(HttpHeaders.AUTHORIZATION, bearer(tokens.accessToken()))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(body))
                .andReturn();
    }

    // ── 인증 계약 ────────────────────────────────────────────────────────────

    @Test
    void password_change_requires_login() throws Exception {
        mockMvc.perform(put(PASSWORD_URL)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(changeBody(SEED_PASSWORD, NEW_PASSWORD, NEW_PASSWORD)))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.errorCode").value("NOT_AUTHENTICATED"));
    }

    // ── 입력 규칙 ────────────────────────────────────────────────────────────

    @Test
    void password_change_requires_all_three_fields(/* AC-A-21 */) throws Exception {
        Tokens tokens = loginDefaultUser();

        mockMvc.perform(put(PASSWORD_URL)
                        .header(HttpHeaders.AUTHORIZATION, bearer(tokens.accessToken()))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{}"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.errorCode").value("VALIDATION_ERROR"));
    }

    @Test
    void password_change_rejects_new_password_shorter_than_four(/* AC-A-24 — 가입과 같은 기준 */) throws Exception {
        Tokens tokens = loginDefaultUser();

        mockMvc.perform(put(PASSWORD_URL)
                        .header(HttpHeaders.AUTHORIZATION, bearer(tokens.accessToken()))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(changeBody(SEED_PASSWORD, "123", "123")))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.errorCode").value("VALIDATION_ERROR"))
                .andExpect(jsonPath("$.errors[0].field").value("newPassword"));
    }

    @Test
    void password_change_rejects_confirm_mismatch(/* AC-A-23 */) throws Exception {
        Tokens tokens = loginDefaultUser();

        mockMvc.perform(put(PASSWORD_URL)
                        .header(HttpHeaders.AUTHORIZATION, bearer(tokens.accessToken()))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(changeBody(SEED_PASSWORD, NEW_PASSWORD, "different1234")))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.errorCode").value("NEW_PASSWORD_CONFIRM_MISMATCH"));
    }

    @Test
    void password_change_rejects_wrong_current_password(/* AC-A-22 — 화면은 그 칸만 비운다 */) throws Exception {
        Tokens tokens = loginDefaultUser();

        mockMvc.perform(put(PASSWORD_URL)
                        .header(HttpHeaders.AUTHORIZATION, bearer(tokens.accessToken()))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(changeBody("wrong-password", NEW_PASSWORD, NEW_PASSWORD)))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.errorCode").value("PASSWORD_MISMATCH"));
    }

    @Test
    void password_change_rejects_same_password(/* AC-A-25 */) throws Exception {
        Tokens tokens = loginDefaultUser();

        mockMvc.perform(put(PASSWORD_URL)
                        .header(HttpHeaders.AUTHORIZATION, bearer(tokens.accessToken()))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(changeBody(SEED_PASSWORD, SEED_PASSWORD, SEED_PASSWORD)))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.errorCode").value("NEW_PASSWORD_SAME_AS_CURRENT"));
    }

    /**
     * 검사 순서 계약 — 새 비밀번호 입력이 틀렸는데 현재 비밀번호도 틀린 경우,
     * <b>확인 불일치가 먼저</b> 나와야 한다. 현재 비밀번호를 먼저 판정하면 화면이
     * "현재 비밀번호 칸 비우기"를 해버려, 사용자는 정작 자기가 오타 낸 새 비밀번호를 보지 못한다.
     */
    @Test
    void password_change_reports_confirm_mismatch_before_current_password() throws Exception {
        Tokens tokens = loginDefaultUser();

        mockMvc.perform(put(PASSWORD_URL)
                        .header(HttpHeaders.AUTHORIZATION, bearer(tokens.accessToken()))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(changeBody("wrong-password", NEW_PASSWORD, "different1234")))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.errorCode").value("NEW_PASSWORD_CONFIRM_MISMATCH"));
    }

    // ── 성공 · 세션 처리 ─────────────────────────────────────────────────────

    @Test
    void password_change_succeeds_and_keeps_this_device(/* AC-A-26·27 */) throws Exception {
        Tokens tokens = loginDefaultUser();

        MvcResult result = mockMvc.perform(put(PASSWORD_URL)
                        .header(HttpHeaders.AUTHORIZATION, bearer(tokens.accessToken()))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(changeBody(SEED_PASSWORD, NEW_PASSWORD, NEW_PASSWORD)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.changed").value(true))
                // 헤더 인증(앱 경로)에는 새 토큰을 바디로 준다 — /api/tokens/refresh와 같은 분기(설계/04 §4-1)
                .andExpect(jsonPath("$.data.accessToken").isNotEmpty())
                .andExpect(jsonPath("$.data.refreshToken").isNotEmpty())
                .andReturn();

        JsonNode data = objectMapper.readTree(result.getResponse().getContentAsString()).path("data");
        String reissuedAccessToken = data.path("accessToken").asText();
        assertThat(reissuedAccessToken).isNotBlank();

        // 지금 쓰는 기기는 로그인이 유지된다 (AC-A-27)
        mockMvc.perform(get("/api/users/me")
                        .header(HttpHeaders.AUTHORIZATION, bearer(reissuedAccessToken)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.username").value(DEFAULT_USERNAME));
    }

    /**
     * AC-A-28 — 변경 전에 발급된 access 토큰(다른 기기)은 <b>즉시</b> 죽는다.
     *
     * <p>errorCode가 `TOKEN_EXPIRED`여야 하는 이유: 프론트 `lib/http.js`는 이 코드일 때만 갱신을 시도하고,
     * 갱신 실패 시 `auth:expired`로 게스트 강등한다. 다른 코드면 "로그인된 것처럼 보이지만 아무것도 안 되는" 상태가 남는다.
     */
    @Test
    void password_change_kills_tokens_issued_before_it() throws Exception {
        Tokens otherDevice = loginDefaultUser();
        Tokens thisDevice = loginDefaultUser();

        changePassword(thisDevice, changeBody(SEED_PASSWORD, NEW_PASSWORD, NEW_PASSWORD));

        mockMvc.perform(get("/api/users/me")
                        .header(HttpHeaders.AUTHORIZATION, bearer(otherDevice.accessToken())))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.errorCode").value("TOKEN_EXPIRED"));
    }

    @Test
    void password_change_allows_login_with_the_new_password(/* AC-A-29 */) throws Exception {
        Tokens tokens = loginDefaultUser();
        changePassword(tokens, changeBody(SEED_PASSWORD, NEW_PASSWORD, NEW_PASSWORD));

        mockMvc.perform(post("/api/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .accept(MediaType.APPLICATION_JSON)
                        .content("""
                                { "username": "%s", "password": "%s" }
                                """.formatted(DEFAULT_USERNAME, NEW_PASSWORD)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.access_token").isNotEmpty());
    }

    @Test
    void old_password_no_longer_works_after_change() throws Exception {
        Tokens tokens = loginDefaultUser();
        changePassword(tokens, changeBody(SEED_PASSWORD, NEW_PASSWORD, NEW_PASSWORD));

        mockMvc.perform(post("/api/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .accept(MediaType.APPLICATION_JSON)
                        .content("""
                                { "username": "%s", "password": "%s" }
                                """.formatted(DEFAULT_USERNAME, SEED_PASSWORD)))
                .andExpect(status().isUnauthorized());
    }
}
