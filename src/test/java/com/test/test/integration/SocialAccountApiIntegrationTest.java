package com.test.test.integration;

import com.fasterxml.jackson.databind.JsonNode;
import com.test.test.jwt.service.oauth.ProviderTokenVerifier;
import com.test.test.jwt.service.oauth.VerifiedProviderUser;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.Mockito;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MvcResult;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * 소셜 계정 분기 통합테스트 (TDD Red — senior-dev 작성)
 *
 * <p>계약 문서: `설계/04_API계약.md` §4-1 (소셜 계정 분기 · 탈퇴 익명화)
 * 인수 조건: AC-A-14 ~ AC-A-19
 *
 * <p>소셜 계정은 <b>비밀번호가 없다.</b> 그래서 화면은 메뉴를 숨기고(AC-A-14) 서버는 403으로 막는다 —
 * 숨기는 것과 막는 것이 <b>같은 출처</b>(`GET /api/me/account`)에서 나와야 둘이 갈리지 않는다.
 *
 * <p>소셜 계정은 `/api/login`으로 들어올 수 없으므로(비밀번호가 무작위) 앱 네이티브 OAuth 경로로 로그인한다.
 * 외부 provider 호출은 검증기를 목으로 대체한다 — `AuthApiIntegrationTest`와 같은 방식이다.
 *
 * <p>이 테스트를 수정하지 말 것 — 계약 변경은 senior-dev 경유 (CLAUDE.md TDD 규칙 2).
 */
class SocialAccountApiIntegrationTest extends ApiIntegrationTestSupport {

    /** 시드 사용자 id=1 — provider `kakao`, username `kakao4663679805` (`data-users.sql`) */
    private static final String KAKAO_ID = "4663679805";
    private static final String SEED_SOCIAL_EMAIL = "gks930620@naver.com";
    private static final String SEED_SOCIAL_NICKNAME = "한창희";

    @MockBean
    private ProviderTokenVerifier providerTokenVerifier;

    @BeforeEach
    void stubProvider() {
        Mockito.when(providerTokenVerifier.verify(eq("kakao"), anyString()))
                .thenReturn(new VerifiedProviderUser(KAKAO_ID, SEED_SOCIAL_EMAIL, SEED_SOCIAL_NICKNAME));
    }

    private Tokens loginKakaoUser() throws Exception {
        MvcResult result = mockMvc.perform(post("/api/oauth2/providers/kakao/tokens")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                { "accessToken": "provider-access-token" }
                                """))
                .andExpect(status().isOk())
                .andReturn();

        JsonNode data = objectMapper.readTree(result.getResponse().getContentAsString()).path("data");
        return new Tokens(data.path("access_token").asText(), data.path("refresh_token").asText());
    }

    private long myUserId(Tokens tokens) throws Exception {
        MvcResult result = mockMvc.perform(get("/api/users/me")
                        .header(HttpHeaders.AUTHORIZATION, bearer(tokens.accessToken())))
                .andExpect(status().isOk())
                .andReturn();
        return objectMapper.readTree(result.getResponse().getContentAsString()).path("data").path("id").asLong();
    }

    // ── 계정 조회 (AC-A-14·16·19) ───────────────────────────────────────────

    @Test
    void social_account_has_no_password_and_a_readonly_email() throws Exception {
        Tokens tokens = loginKakaoUser();

        mockMvc.perform(get("/api/me/account")
                        .header(HttpHeaders.AUTHORIZATION, bearer(tokens.accessToken())))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.provider").value("kakao"))
                .andExpect(jsonPath("$.data.social").value(true))
                // 화면은 이 두 값으로 [비밀번호 변경]을 숨기고 이메일 칸을 읽기 전용으로 만든다
                .andExpect(jsonPath("$.data.passwordChangeable").value(false))
                .andExpect(jsonPath("$.data.emailEditable").value(false));
    }

    // ── 회원정보 수정 (AC-A-16) ─────────────────────────────────────────────

    @Test
    void social_profile_update_changes_nickname_but_ignores_email() throws Exception {
        Tokens tokens = loginKakaoUser();

        mockMvc.perform(put("/api/me/profile")
                        .header(HttpHeaders.AUTHORIZATION, bearer(tokens.accessToken()))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                { "nickname": "카카오닉네임", "email": "hijack@example.com" }
                                """))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.nickname").value("카카오닉네임"))
                // 400이 아니라 "무시하고 현재 값을 응답"이다 — 읽기 전용 칸이 현재 값을 되돌려 보내기 때문(설계/04 §4-1).
                // 프론트는 요청값이 아니라 응답값으로 상태를 갱신한다.
                .andExpect(jsonPath("$.data.email").value(SEED_SOCIAL_EMAIL));
    }

    // ── 비밀번호 변경 차단 (AC-A-17) ────────────────────────────────────────

    @Test
    void social_account_cannot_change_password() throws Exception {
        Tokens tokens = loginKakaoUser();

        mockMvc.perform(put("/api/me/password")
                        .header(HttpHeaders.AUTHORIZATION, bearer(tokens.accessToken()))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                { "currentPassword": "anything", "newPassword": "newpass1234",
                                  "newPasswordConfirm": "newpass1234" }
                                """))
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.errorCode").value("PASSWORD_NOT_SUPPORTED"));
    }

    // ── 탈퇴 (AC-A-18) ──────────────────────────────────────────────────────

    @Test
    void social_withdrawal_asks_for_a_confirm_text_instead_of_a_password() throws Exception {
        Tokens tokens = loginKakaoUser();

        mockMvc.perform(get("/api/me/withdrawal-preview")
                        .header(HttpHeaders.AUTHORIZATION, bearer(tokens.accessToken())))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.confirmationType").value("TEXT"));
    }

    @Test
    void social_withdrawal_rejects_a_wrong_confirm_text() throws Exception {
        Tokens tokens = loginKakaoUser();

        mockMvc.perform(post("/api/me/withdrawal")
                        .header(HttpHeaders.AUTHORIZATION, bearer(tokens.accessToken()))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                { "confirmText": "탈퇴할래요" }
                                """))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.errorCode").value("CONFIRM_TEXT_MISMATCH"));
    }

    @Test
    void social_withdrawal_succeeds_with_the_exact_confirm_text() throws Exception {
        Tokens tokens = loginKakaoUser();

        mockMvc.perform(post("/api/me/withdrawal")
                        .header(HttpHeaders.AUTHORIZATION, bearer(tokens.accessToken()))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                { "confirmText": "탈퇴합니다" }
                                """))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.withdrawn").value(true));

        mockMvc.perform(get("/api/users/me")
                        .header(HttpHeaders.AUTHORIZATION, bearer(tokens.accessToken())))
                .andExpect(status().isUnauthorized());
    }

    /**
     * ★ 재가입 판정(설계/04 §4-1)의 핵심 검증.
     *
     * <p>소셜 로그인은 `provider + 제공자 식별자`를 username으로 삼아 <b>기존 행을 찾아 재사용</b>한다.
     * 탈퇴하면서 그 연결을 끊지 않으면, 같은 카카오 계정으로 다시 로그인하는 순간
     * <b>탈퇴한 계정이 그대로 되살아난다</b> — "탈퇴한 뒤에는 되돌릴 수 없습니다"라는 화면 문구가 거짓이 된다.
     */
    @Test
    void logging_in_again_after_a_social_withdrawal_creates_a_brand_new_account() throws Exception {
        Tokens before = loginKakaoUser();
        long idBefore = myUserId(before);

        mockMvc.perform(post("/api/me/withdrawal")
                        .header(HttpHeaders.AUTHORIZATION, bearer(before.accessToken()))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                { "confirmText": "탈퇴합니다" }
                                """))
                .andExpect(status().isOk());

        Tokens after = loginKakaoUser();
        long idAfter = myUserId(after);

        assertThat(idAfter).isNotEqualTo(idBefore);
    }
}
