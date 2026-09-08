package com.test.test.integration;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import org.junit.jupiter.api.Test;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;

/**
 * 리프레시 토큰 폐기 계약 (senior-dev 작성 / 판정 2026-08-25 A-3·A-4)
 *
 * <p><b>왜 이 파일이 필요한가</b>: "리프레시에는 왜 {@code tv}를 안 싣나"에 대한 답이
 * <b>"폐기 수단이 DB 행 삭제이기 때문"</b>인데, <b>그 삭제가 실제로 동작하는지 아무도 검증하지 않았다.</b>
 * 기존 AC-A-28 테스트는 access 토큰만 본다 — 계약의 절반이 무방비였다.
 *
 * <p><b>계약</b>: 비밀번호 변경·탈퇴 이후 그 이전에 발급된 리프레시 토큰은 <b>갱신에 쓸 수 없다</b>.
 * 401 + {@code TOKEN_DISCARDED}(폐기됨)이며, 만료(`TOKEN_EXPIRED`)와 구분한다 —
 * 만료는 갱신으로 회복되지만 폐기는 <b>다시 로그인해야</b> 회복된다(04 §4).
 *
 * <p>C-11(한 규칙은 한 파일에서만 고정): 리프레시 폐기는 <b>여기</b>서만 고정한다.
 * `PasswordChangeApiIntegrationTest`·`WithdrawalApiIntegrationTest`는 access 토큰 쪽을 맡는다.
 *
 * <p>이 테스트를 수정하지 말 것 — 계약 변경은 senior-dev 경유 (CLAUDE.md TDD 규칙 2).
 */
class RefreshRevocationContractIntegrationTest extends ApiIntegrationTestSupport {

    private static final String NEW_PASSWORD = "newpass1234";

    @Test
    void a_refresh_token_issued_before_a_password_change_is_discarded() throws Exception {
        Tokens before = loginDefaultUser();

        mockMvc.perform(put("/api/me/password", before.accessToken(), """
                {
                  "currentPassword": "%s",
                  "newPassword": "%s",
                  "newPasswordConfirm": "%s"
                }
                """.formatted(SEED_PASSWORD, NEW_PASSWORD, NEW_PASSWORD)))
                .andExpect(status().isOk());

        mockMvc.perform(post("/api/tokens/refresh")
                        .header(HttpHeaders.AUTHORIZATION, bearer(before.refreshToken())))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.errorCode").value("TOKEN_DISCARDED"));
    }

    @Test
    void a_refresh_token_issued_before_a_withdrawal_is_discarded() throws Exception {
        Tokens before = loginDefaultUser();

        mockMvc.perform(post("/api/me/withdrawal")
                        .header(HttpHeaders.AUTHORIZATION, bearer(before.accessToken()))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                { "password": "%s" }
                                """.formatted(SEED_PASSWORD)))
                .andExpect(status().isOk());

        mockMvc.perform(post("/api/tokens/refresh")
                        .header(HttpHeaders.AUTHORIZATION, bearer(before.refreshToken())))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.errorCode").value("TOKEN_DISCARDED"));
    }

    @Test
    void a_rotated_refresh_token_cannot_be_used_twice(/* 재사용 차단 — 기존 구현의 회귀 가드 */) throws Exception {
        Tokens tokens = loginDefaultUser();

        mockMvc.perform(post("/api/tokens/refresh")
                        .header(HttpHeaders.AUTHORIZATION, bearer(tokens.refreshToken())))
                .andExpect(status().isOk());

        mockMvc.perform(post("/api/tokens/refresh")
                        .header(HttpHeaders.AUTHORIZATION, bearer(tokens.refreshToken())))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.errorCode").value("TOKEN_DISCARDED"));
    }

    private org.springframework.test.web.servlet.request.MockHttpServletRequestBuilder put(
            String path, String accessToken, String body) {
        return org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put(path)
                .header(HttpHeaders.AUTHORIZATION, bearer(accessToken))
                .contentType(MediaType.APPLICATION_JSON)
                .content(body);
    }
}
