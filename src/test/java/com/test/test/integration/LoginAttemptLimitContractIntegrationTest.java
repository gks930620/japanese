package com.test.test.integration;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import org.junit.jupiter.api.Test;
import org.springframework.http.MediaType;
import org.springframework.test.context.TestPropertySource;
import org.springframework.test.web.servlet.ResultActions;

/**
 * 로그인 시도 제한 (TDD Red — senior-dev 작성 / 판정 2026-08-25 B-1)
 *
 * <p><b>문제</b>: 실패 횟수에 제한이 없다. 아이디는 공개 API가 통째로 노출하고 있었고(C-1),
 * 비밀번호 최소 길이는 4자다(<b>사용자가 의도한 결정</b> — 시드·테스트 계정 편의). 두 가지가 합쳐지면
 * <b>대상 목록 + 무제한 시도</b>가 동시에 성립한다. 비밀번호 규칙은 건드리지 않고 <b>시도 제한</b>으로 대가를 줄인다.
 *
 * <p><b>계약</b> (senior-dev 결정 — 새 라이브러리를 넣지 않는다. 인메모리 카운터로 충분하고
 * `InMemoryAuthorizationRequestRepository`라는 같은 성격의 선례가 있다):
 * <ul>
 *   <li>키는 <b>username 단위</b> — IP 단위는 NAT·모바일에서 무고한 사용자를 함께 막는다</li>
 *   <li>연속 실패 {@code app.login.attempt.max}(기본 5)회를 넘으면
 *       {@code app.login.attempt.window-minutes}(기본 15) 동안 <b>비밀번호가 맞아도</b> 429</li>
 *   <li>{@code errorCode}는 {@code TOO_MANY_LOGIN_ATTEMPTS}(04 §1-2에 추가)</li>
 *   <li><b>성공하면 카운터를 리셋</b>한다 — 오타 낸 사용자가 다음 로그인부터 정상으로 돌아와야 한다</li>
 * </ul>
 *
 * <p><b>창 만료는 여기서 검증하지 않는다</b> — 시간 의존 테스트를 만들지 않는다(컨벤션 §6).
 * 만료는 프로퍼티로 조정 가능하다는 것까지가 계약이다.
 *
 * <p>시드 계정을 테스트마다 다르게 쓴다(user9~12) — 카운터가 프로세스에 남으므로 <b>순서에 의존하지 않게</b> 하기 위해서다.
 *
 * <p>이 테스트를 수정하지 말 것 — 계약 변경은 senior-dev 경유 (CLAUDE.md TDD 규칙 2).
 */
@TestPropertySource(properties = {
        "app.login.attempt.max=5",
        "app.login.attempt.window-minutes=15"
})
class LoginAttemptLimitContractIntegrationTest extends ApiIntegrationTestSupport {

    private static final String WRONG_PASSWORD = "nope-nope";

    @Test
    void the_sixth_attempt_is_blocked_even_with_the_right_password() throws Exception {
        for (int attempt = 0; attempt < 5; attempt++) {
            attemptLogin("user10", WRONG_PASSWORD).andExpect(status().isUnauthorized());
        }

        attemptLogin("user10", SEED_PASSWORD)
                .andExpect(status().isTooManyRequests())
                .andExpect(jsonPath("$.errorCode").value("TOO_MANY_LOGIN_ATTEMPTS"));
    }

    @Test
    void blocking_one_account_does_not_block_another(/* 계정 단위지 전역 차단이 아니다 */) throws Exception {
        for (int attempt = 0; attempt < 5; attempt++) {
            attemptLogin("user11", WRONG_PASSWORD).andExpect(status().isUnauthorized());
        }

        attemptLogin("user12", SEED_PASSWORD).andExpect(status().isOk());
    }

    @Test
    void a_successful_login_resets_the_counter() throws Exception {
        for (int attempt = 0; attempt < 4; attempt++) {
            attemptLogin("user9", WRONG_PASSWORD).andExpect(status().isUnauthorized());
        }
        attemptLogin("user9", SEED_PASSWORD).andExpect(status().isOk());

        for (int attempt = 0; attempt < 4; attempt++) {
            attemptLogin("user9", WRONG_PASSWORD).andExpect(status().isUnauthorized());
        }
        attemptLogin("user9", SEED_PASSWORD).andExpect(status().isOk());
    }

    @Test
    void a_normal_login_is_untouched(/* 가드 — 제한이 정상 사용자를 막지 않는다 */) throws Exception {
        attemptLogin(DEFAULT_USERNAME, SEED_PASSWORD)
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.access_token").isNotEmpty());
    }

    private ResultActions attemptLogin(String username, String password) throws Exception {
        return mockMvc.perform(post("/api/login")
                .contentType(MediaType.APPLICATION_JSON)
                .accept(MediaType.APPLICATION_JSON)
                .content("""
                        { "username": "%s", "password": "%s" }
                        """.formatted(username, password)));
    }
}
