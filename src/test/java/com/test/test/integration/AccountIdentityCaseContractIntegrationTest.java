package com.test.test.integration;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import java.util.Locale;
import java.util.UUID;
import org.hamcrest.Matchers;
import org.junit.jupiter.api.Test;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;

/**
 * 아이디·이메일의 대소문자 계약 (TDD Red — senior-dev 작성, 2026-09-21 qa 결함 C)
 *
 * <p><b>문제</b>: {@code USER4}로 가입(201)한 뒤 {@code USER4@EXAMPLE.COM}으로 또 가입(201)된다.
 * {@code user4} / {@code user4@example.com}이 이미 있는데도. 원인은 두 가지다 —
 * ① 아이디 검사가 정확 일치({@code existsByUsername}), ② 이메일 검사의
 * {@code existsByEmailAndProviderIgnoreCase}에서 <b>Spring Data의 {@code IgnoreCase}는 바로 앞 속성
 * ({@code provider})에만</b> 걸린다. 의도는 email이었다.</p>
 *
 * <p><b>환경 간 차이가 진짜 위험이다</b>: 로컬 H2는 대소문자를 구분하고, 운영 MySQL 기본 collation(ci)은
 * 구분하지 않는다. 같은 요청이 운영에서는 {@code users.username} UNIQUE 위반(500)이 되거나 엉뚱한 계정을
 * 조회한다. <b>환경이 신원을 결정하는</b> 상태이며 로컬 테스트로는 드러나지 않는다.</p>
 *
 * <p><b>계약 (판정 2026-09-21, 설계/08 C-24)</b>: 아이디·이메일은 <b>대소문자를 구분하지 않는 식별자</b>다.
 * 애플리케이션이 {@code Locale.ROOT} 소문자로 <b>정규화해 저장·대조</b>한다 — DB collation에 기대지 않는다
 * (컨벤션 §5 "환경 차이는 코드가 흡수한다").
 * <ul>
 *   <li>이메일: 규격상 local-part는 대소문자를 가리지만 실사업자가 전부 무시한다. 사용자는 같은 주소로 읽는다.</li>
 *   <li>아이디: {@code user4}/{@code USER4}가 별개 계정이면 같은 사람으로 보이는 두 계정이 생긴다.
 *       또 로그인 시도 제한(§1-6)이 <b>username 키</b>라, 대소문자를 바꿔가며 부르면 카운터가 초기화돼
 *       제한을 우회할 수 있다. 사용자는 자기 아이디의 대소문자를 기억하지 못한다.</li>
 * </ul>
 *
 * <p>이 테스트를 수정하지 말 것 — 계약 변경은 senior-dev 경유 (CLAUDE.md TDD 규칙 2).
 */
class AccountIdentityCaseContractIntegrationTest extends ApiIntegrationTestSupport {

    /** 시드 로컬 계정 (id 4) — 아이디 user4 / 이메일 user4@example.com */
    private static final String SEEDED_USERNAME_UPPER = "USER4";
    private static final String SEEDED_EMAIL_UPPER = "USER4@EXAMPLE.COM";

    // ── 가입 ────────────────────────────────────────────────────────────────

    @Test
    void signup_rejects_a_username_that_differs_only_in_case() throws Exception {
        mockMvc.perform(signup(SEEDED_USERNAME_UPPER, uniqueEmail(), "대문자"))
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.success").value(false))
                .andExpect(jsonPath("$.errorCode").value("DUPLICATE_RESOURCE"))
                .andExpect(jsonPath("$.message", Matchers.containsString("아이디")));
    }

    @Test
    void signup_rejects_an_email_that_differs_only_in_case() throws Exception {
        mockMvc.perform(signup(uniqueUsername(), SEEDED_EMAIL_UPPER, "대문자메일"))
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.errorCode").value("DUPLICATE_RESOURCE"))
                .andExpect(jsonPath("$.message", Matchers.containsString("이메일")));
    }

    @Test
    void signup_still_accepts_a_genuinely_new_account(/* 가드 — 전부 막아버리지 않는다 */) throws Exception {
        mockMvc.perform(signup(uniqueUsername(), uniqueEmail(), "신규"))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.success").value(true));
    }

    // ── 저장·로그인 ─────────────────────────────────────────────────────────

    @Test
    void the_stored_identity_is_normalized_to_lower_case() throws Exception {
        String mixedUsername = "CaseUser" + suffix();
        String mixedEmail = "Case.User" + suffix() + "@Example.COM";

        mockMvc.perform(signup(mixedUsername, mixedEmail, "대소문자"))
                .andExpect(status().isCreated());

        Tokens tokens = login(mixedUsername.toLowerCase(Locale.ROOT), SEED_PASSWORD);

        mockMvc.perform(get("/api/users/me")
                        .header(HttpHeaders.AUTHORIZATION, bearer(tokens.accessToken())))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.username").value(mixedUsername.toLowerCase(Locale.ROOT)))
                .andExpect(jsonPath("$.data.email").value(mixedEmail.toLowerCase(Locale.ROOT)));
    }

    @Test
    void login_accepts_the_username_in_any_case() throws Exception {
        String username = "LoginCase" + suffix();

        mockMvc.perform(signup(username, uniqueEmail(), "로그인케이스"))
                .andExpect(status().isCreated());

        // 같은 계정이다 — 세 표기 모두 로그인된다(따로 만들어진 계정이 아니다)
        for (String attempt : new String[]{
                username, username.toLowerCase(Locale.ROOT), username.toUpperCase(Locale.ROOT)}) {
            Tokens tokens = login(attempt, SEED_PASSWORD);
            assertThat(tokens.accessToken()).as("'%s' 로도 로그인된다", attempt).isNotBlank();
        }
    }

    // ── 회원정보 수정 ───────────────────────────────────────────────────────

    @Test
    void profile_update_rejects_an_email_that_differs_only_in_case() throws Exception {
        Tokens tokens = loginDefaultUser();

        mockMvc.perform(put("/api/me/profile")
                        .header(HttpHeaders.AUTHORIZATION, bearer(tokens.accessToken()))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                { "nickname": "한창희", "email": "%s" }
                                """.formatted(SEEDED_EMAIL_UPPER)))
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.errorCode").value("DUPLICATE_RESOURCE"));
    }

    @Test
    void changing_only_the_case_of_my_own_email_is_not_a_change() throws Exception {
        // 설계/04 §4-1 "값이 바뀔 때만 검사한다" — 대소문자만 바꾼 것은 바꾼 것이 아니다.
        // 그렇지 않으면 자기 이메일을 대문자로 저장해 "같은 주소의 두 번째 표기"를 만들 수 있다.
        Tokens tokens = loginDefaultUser();

        mockMvc.perform(put("/api/me/profile")
                        .header(HttpHeaders.AUTHORIZATION, bearer(tokens.accessToken()))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                { "nickname": "한창희", "email": "GKS9306202@GMAIL.COM" }
                                """))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.email").value("gks9306202@gmail.com"));
    }

    // ── helpers ─────────────────────────────────────────────────────────────

    private org.springframework.test.web.servlet.request.MockHttpServletRequestBuilder signup(
            String username, String email, String nickname) {
        return post("/api/users")
                .contentType(MediaType.APPLICATION_JSON)
                .content("""
                        { "username": "%s", "password": "%s", "email": "%s", "nickname": "%s" }
                        """.formatted(username, SEED_PASSWORD, email, nickname));
    }

    private static String suffix() {
        return UUID.randomUUID().toString().substring(0, 6);
    }

    private static String uniqueUsername() {
        return "case" + suffix();
    }

    private static String uniqueEmail() {
        return "case" + suffix() + "@example.com";
    }
}
