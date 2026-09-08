package com.test.test.integration;

import org.junit.jupiter.api.Test;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * 계정 조회 · 회원정보 수정 API 통합테스트 (TDD Red — senior-dev 작성)
 *
 * <p>계약 문서: `설계/04_API계약.md` §4-1 (GET /api/me/account · PUT /api/me/profile)
 * 인수 조건: AC-A-05 ~ AC-A-13, AC-A-20
 *
 * <p>네임스페이스 계약: 계정 API는 전부 `/api/me/**`이고 <b>인증 필요</b>다(결정기록 B-8 · 설계/07 §5-4).
 * 사용자는 <b>토큰에서만</b> 꺼낸다 — 요청 어디에도 대상 사용자를 지정하는 값이 없다(컨벤션 §4-1).
 *
 * <p>이 테스트를 수정하지 말 것 — 계약 변경은 senior-dev 경유 (CLAUDE.md TDD 규칙 2).
 */
class AccountApiIntegrationTest extends ApiIntegrationTestSupport {

    private static final String ACCOUNT_URL = "/api/me/account";
    private static final String PROFILE_URL = "/api/me/profile";

    /** 시드 사용자 3의 현재 값 — `data-users.sql` */
    private static final String CURRENT_NICKNAME = "한창희";
    private static final String CURRENT_EMAIL = "gks9306202@gmail.com";

    /** 다른 회원(id=4)이 쓰고 있는 이메일 */
    private static final String EMAIL_OF_ANOTHER_USER = "user4@example.com";

    private String profileBody(String nickname, String email) {
        return """
                { "nickname": "%s", "email": "%s" }
                """.formatted(nickname, email);
    }

    // ── 인증 계약 ────────────────────────────────────────────────────────────

    @Test
    void account_apis_require_login() throws Exception {
        mockMvc.perform(get(ACCOUNT_URL))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.errorCode").value("NOT_AUTHENTICATED"));

        mockMvc.perform(put(PROFILE_URL)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(profileBody("새닉네임", "new@example.com")))
                .andExpect(status().isUnauthorized());
    }

    // ── 계정 조회 ────────────────────────────────────────────────────────────

    @Test
    void account_reports_what_a_local_account_can_do(/* AC-A-20 */) throws Exception {
        Tokens tokens = loginDefaultUser();

        mockMvc.perform(get(ACCOUNT_URL)
                        .header(HttpHeaders.AUTHORIZATION, bearer(tokens.accessToken())))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data.username").value(DEFAULT_USERNAME))
                .andExpect(jsonPath("$.data.nickname").value(CURRENT_NICKNAME))
                .andExpect(jsonPath("$.data.email").value(CURRENT_EMAIL))
                .andExpect(jsonPath("$.data.provider").value("LOCAL"))
                // 화면 분기의 단일 출처 — 세 스택이 provider 문자열을 각자 해석하지 않는다(설계/04 §4-1)
                .andExpect(jsonPath("$.data.social").value(false))
                .andExpect(jsonPath("$.data.emailEditable").value(true))
                .andExpect(jsonPath("$.data.passwordChangeable").value(true));
    }

    // ── 회원정보 수정 ────────────────────────────────────────────────────────

    @Test
    void profile_update_saves_nickname_and_email(/* AC-A-05·06 */) throws Exception {
        Tokens tokens = loginDefaultUser();

        mockMvc.perform(put(PROFILE_URL)
                        .header(HttpHeaders.AUTHORIZATION, bearer(tokens.accessToken()))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(profileBody("바꾼닉네임", "changed@example.com")))
                .andExpect(status().isOk())
                // 응답이 진실이다 — 화면은 이 값으로 헤더 닉네임을 즉시 갱신한다(AC-A-06)
                .andExpect(jsonPath("$.data.nickname").value("바꾼닉네임"))
                .andExpect(jsonPath("$.data.email").value("changed@example.com"));

        mockMvc.perform(get(ACCOUNT_URL)
                        .header(HttpHeaders.AUTHORIZATION, bearer(tokens.accessToken())))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.nickname").value("바꾼닉네임"))
                .andExpect(jsonPath("$.data.email").value("changed@example.com"));
    }

    @Test
    void profile_update_never_changes_username(/* AC-A-11 — 아이디는 작성자 소유권의 기준값이다 */) throws Exception {
        Tokens tokens = loginDefaultUser();

        mockMvc.perform(put(PROFILE_URL)
                        .header(HttpHeaders.AUTHORIZATION, bearer(tokens.accessToken()))
                        .contentType(MediaType.APPLICATION_JSON)
                        // 계약에 없는 필드를 보내도 무시된다
                        .content("""
                                { "nickname": "바꾼닉네임", "email": "changed@example.com",
                                  "username": "hijacked" }
                                """))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.username").value(DEFAULT_USERNAME));
    }

    @Test
    void profile_update_rejects_nickname_out_of_range(/* AC-A-07·08 — 가입과 같은 기준 2~20자 */) throws Exception {
        Tokens tokens = loginDefaultUser();

        mockMvc.perform(put(PROFILE_URL)
                        .header(HttpHeaders.AUTHORIZATION, bearer(tokens.accessToken()))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(profileBody("가", CURRENT_EMAIL)))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.errorCode").value("VALIDATION_ERROR"))
                .andExpect(jsonPath("$.errors[0].field").value("nickname"));

        mockMvc.perform(put(PROFILE_URL)
                        .header(HttpHeaders.AUTHORIZATION, bearer(tokens.accessToken()))
                        .contentType(MediaType.APPLICATION_JSON)
                        // 21자 — 20자는 계약상 유효하다(가입과 같은 기준). 경계는 "넘은 값"으로 잡는다
                        .content(profileBody("가나다라마바사아자차카타파하가나다라마바사", CURRENT_EMAIL)))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.errorCode").value("VALIDATION_ERROR"))
                .andExpect(jsonPath("$.errors[0].field").value("nickname"));
    }

    @Test
    void profile_update_rejects_blank_nickname() throws Exception {
        Tokens tokens = loginDefaultUser();

        mockMvc.perform(put(PROFILE_URL)
                        .header(HttpHeaders.AUTHORIZATION, bearer(tokens.accessToken()))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(profileBody("   ", CURRENT_EMAIL)))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.errorCode").value("VALIDATION_ERROR"));
    }

    @Test
    void profile_update_rejects_malformed_email(/* AC-A-09 */) throws Exception {
        Tokens tokens = loginDefaultUser();

        mockMvc.perform(put(PROFILE_URL)
                        .header(HttpHeaders.AUTHORIZATION, bearer(tokens.accessToken()))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(profileBody(CURRENT_NICKNAME, "not-an-email")))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.errorCode").value("VALIDATION_ERROR"))
                .andExpect(jsonPath("$.errors[0].field").value("email"));
    }

    @Test
    void profile_update_rejects_email_used_by_another_member(/* AC-A-10 */) throws Exception {
        Tokens tokens = loginDefaultUser();

        mockMvc.perform(put(PROFILE_URL)
                        .header(HttpHeaders.AUTHORIZATION, bearer(tokens.accessToken()))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(profileBody(CURRENT_NICKNAME, EMAIL_OF_ANOTHER_USER)))
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.errorCode").value("DUPLICATE_RESOURCE"));
    }

    /**
     * 이메일 중복 검사의 <b>대상은 활성 로컬 계정뿐</b>이다(설계/04 §4-1).
     *
     * <p>소셜 계정의 이메일은 제공자가 준 값이라 우리가 관리하지 않고, 같은 사람이 소셜로도 쓰고 로컬로도
     * 가입하는 것은 정상이다. 실제로 시드에도 소셜(id 1·2)과 로컬(id 3)이 같은 주소를 공유한다.
     * 가입과 수정이 <b>서로 다른 대상을 보면</b> "가입은 됐는데 같은 값으로 수정은 안 되는" 모순이 생긴다.
     */
    @Test
    void an_email_owned_only_by_a_social_account_is_not_a_duplicate() throws Exception {
        Tokens tokens = loginOtherUser();

        mockMvc.perform(put(PROFILE_URL)
                        .header(HttpHeaders.AUTHORIZATION, bearer(tokens.accessToken()))
                        .contentType(MediaType.APPLICATION_JSON)
                        // gks930620@naver.com — 시드의 카카오 계정(id 1)만 쓰는 주소다
                        .content(profileBody("김민수", "gks930620@naver.com")))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.email").value("gks930620@naver.com"));
    }

    /**
     * ★ 함정 테스트 — 시드에는 <b>이미 중복된 이메일</b>이 있다(id 2·3이 같은 주소를 쓴다).
     * 중복 검사를 무조건 돌리면 "아무것도 안 고치고 저장"이 409가 되어 설계/04 §4-1("그냥 성공 처리")과 어긋난다.
     * 검사는 <b>값이 바뀔 때만</b> 한다(설계/04 §4-1).
     */
    @Test
    void profile_update_succeeds_when_nothing_changed_even_if_email_is_shared() throws Exception {
        Tokens tokens = loginDefaultUser();

        mockMvc.perform(put(PROFILE_URL)
                        .header(HttpHeaders.AUTHORIZATION, bearer(tokens.accessToken()))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(profileBody(CURRENT_NICKNAME, CURRENT_EMAIL)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.nickname").value(CURRENT_NICKNAME))
                .andExpect(jsonPath("$.data.email").value(CURRENT_EMAIL));
    }

    /** 닉네임 중복은 막지 않는다 — 현행 가입 정책과 같다(설계/04 §4-1, 미결 §9-3) */
    @Test
    void profile_update_allows_duplicated_nickname() throws Exception {
        Tokens tokens = loginOtherUser();

        mockMvc.perform(put(PROFILE_URL)
                        .header(HttpHeaders.AUTHORIZATION, bearer(tokens.accessToken()))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(profileBody(CURRENT_NICKNAME, "user4@example.com")))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.nickname").value(CURRENT_NICKNAME));
    }
}
