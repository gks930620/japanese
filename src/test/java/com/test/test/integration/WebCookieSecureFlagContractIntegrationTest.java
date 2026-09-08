package com.test.test.integration;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import java.util.List;
import org.junit.jupiter.api.Test;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.test.context.TestPropertySource;
import org.springframework.test.web.servlet.MvcResult;

/**
 * 운영 쿠키의 {@code Secure} 속성 (senior-dev 작성 / 판정 2026-08-25 F-1 — 감사 M7)
 *
 * <p>운영은 {@code app.cookie.secure: true}다. 이 플래그가 실제로 쿠키까지 흘러가는지 확인하는 테스트가 없었다 —
 * 빠지면 <b>HTTPS 전용이어야 할 인증 쿠키가 평문 HTTP로도 전송</b>된다.
 * 프로퍼티가 달라 컨텍스트를 나눈다(기본 통합테스트는 {@code secure=false}로 돈다).
 *
 * <p>이 테스트를 수정하지 말 것 — 계약 변경은 senior-dev 경유 (CLAUDE.md TDD 규칙 2).
 */
@TestPropertySource(properties = "app.cookie.secure=true")
class WebCookieSecureFlagContractIntegrationTest extends ApiIntegrationTestSupport {

    @Test
    void auth_cookies_are_secure_when_the_flag_is_on() throws Exception {
        MvcResult result = mockMvc.perform(post("/api/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .accept(MediaType.TEXT_HTML)
                        .content("""
                                { "username": "%s", "password": "%s" }
                                """.formatted(DEFAULT_USERNAME, SEED_PASSWORD)))
                .andExpect(status().isOk())
                .andReturn();

        List<String> setCookies = result.getResponse().getHeaders(HttpHeaders.SET_COOKIE);
        assertThat(setCookies).hasSize(2);
        assertThat(setCookies).allSatisfy(cookie -> assertThat(cookie).contains("Secure"));
    }
}
