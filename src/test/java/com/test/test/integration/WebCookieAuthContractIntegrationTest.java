package com.test.test.integration;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import jakarta.servlet.http.Cookie;
import java.util.List;
import org.junit.jupiter.api.Test;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MvcResult;

/**
 * 웹(브라우저) 쿠키 인증 계약 (senior-dev 작성 / 판정 2026-08-25 F-1 — 감사 M7)
 *
 * <p><b>왜 이 파일이 필요한가</b>: 백엔드 테스트 236건이 <b>전부 앱 분기</b>(Authorization: Bearer)만 탄다.
 * `grep -rln "text/html" src/test/java` → 0건, `grep -rn "\.cookie(" src/test/java` → 0건.
 * 그런데 <b>실사용자는 100% 이 쿠키 경로</b>로 인증한다. CSRF를 전면 비활성화한 이 앱에서
 * {@code HttpOnly}·{@code SameSite=Lax}는 <b>실질적인 방어선</b>인데, 그 속성이 계약대로 나가는지 아무도 확인하지 않았다.
 *
 * <p><b>계약</b>: {@code Accept}에 {@code text/html}이 있으면(= 브라우저) 토큰은 <b>바디가 아니라 쿠키</b>로 간다.
 * 두 쿠키 모두 {@code HttpOnly}·{@code SameSite=Lax}·{@code Path=/}이고, <b>응답 바디에 토큰이 없다</b>
 * (JS가 읽을 수 있는 곳에 토큰을 두지 않는다 — 컨벤션 §7). 그 쿠키만으로 인증이 성립한다.
 *
 * <p>{@code Secure} 속성은 {@code app.cookie.secure}가 켜졌을 때만 붙는다 →
 * `WebCookieSecureFlagContractIntegrationTest`가 따로 고정한다(프로퍼티가 달라 컨텍스트를 나눈다).
 *
 * <p>이 테스트를 수정하지 말 것 — 계약 변경은 senior-dev 경유 (CLAUDE.md TDD 규칙 2).
 */
class WebCookieAuthContractIntegrationTest extends ApiIntegrationTestSupport {

    @Test
    void a_browser_login_puts_the_tokens_in_cookies_not_in_the_body() throws Exception {
        MvcResult result = browserLogin();

        List<String> setCookies = result.getResponse().getHeaders(HttpHeaders.SET_COOKIE);
        assertThat(setCookies).as("Set-Cookie 헤더").hasSize(2);
        assertThat(cookieHeader(setCookies, "access_token"))
                .contains("HttpOnly").contains("SameSite=Lax").contains("Path=/");
        assertThat(cookieHeader(setCookies, "refresh_token"))
                .contains("HttpOnly").contains("SameSite=Lax").contains("Path=/");
        assertThat(result.getResponse().getContentAsString())
                .as("브라우저 응답 바디").doesNotContain("access_token").doesNotContain("refresh_token");
    }

    @Test
    void the_cookie_alone_authenticates_the_next_request() throws Exception {
        MvcResult login = browserLogin();
        String accessToken = cookieValue(login.getResponse().getHeaders(HttpHeaders.SET_COOKIE), "access_token");

        mockMvc.perform(get("/api/users/me").cookie(new Cookie("access_token", accessToken)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.username").value(DEFAULT_USERNAME));
    }

    @Test
    void an_app_login_still_gets_the_tokens_in_the_body(/* 가드 — 앱 분기를 깨지 않는다 */) throws Exception {
        MvcResult result = mockMvc.perform(post("/api/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .accept(MediaType.APPLICATION_JSON)
                        .content("""
                                { "username": "%s", "password": "%s" }
                                """.formatted(DEFAULT_USERNAME, SEED_PASSWORD)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.access_token").isNotEmpty())
                .andReturn();

        assertThat(result.getResponse().getHeaders(HttpHeaders.SET_COOKIE))
                .as("앱 응답에는 쿠키를 심지 않는다").isEmpty();
    }

    private MvcResult browserLogin() throws Exception {
        return mockMvc.perform(post("/api/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .accept(MediaType.TEXT_HTML)
                        .content("""
                                { "username": "%s", "password": "%s" }
                                """.formatted(DEFAULT_USERNAME, SEED_PASSWORD)))
                .andExpect(status().isOk())
                .andReturn();
    }

    private String cookieHeader(List<String> setCookies, String name) {
        return setCookies.stream()
                .filter(value -> value.startsWith(name + "="))
                .findFirst()
                .orElseThrow(() -> new AssertionError("Set-Cookie에 " + name + "이 없다: " + setCookies));
    }

    private String cookieValue(List<String> setCookies, String name) {
        String header = cookieHeader(setCookies, name);
        return header.substring((name + "=").length(), header.indexOf(';'));
    }
}
