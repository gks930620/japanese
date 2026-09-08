package com.test.test.integration;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.fasterxml.jackson.databind.JsonNode;
import java.util.Locale;
import org.junit.jupiter.api.Test;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MvcResult;

/**
 * 검증 실패 응답의 {@code rejectedValue}는 <b>비밀번호를 되돌려주지 않는다</b>
 * (TDD Red — senior-dev 작성, 2026-09-03 판정 D-13 · 사용자관점 점검).
 *
 * <p><b>문제</b>: {@code POST /api/users}에 짧은 비밀번호를 보내면 {@code errors[].rejectedValue}에 입력한 비밀번호가
 * 평문으로 실려 온다. 화면은 {@code message}만 쓰지만 응답 본문·로그·개발자도구에는 그대로 남는다.</p>
 *
 * <p><b>계약</b>: 필드명에 {@code password}가 들어가는 항목은 {@code rejectedValue}를 싣지 않는다(마스킹 = 생략).
 * 그 밖의 필드({@code username} 등)는 지금처럼 값을 돌려준다 — 사용자가 무엇을 잘못 넣었는지 알아야 하므로
 * 필드 전체를 없애지 않는다.</p>
 *
 * <p>이 테스트를 수정하지 말 것 — 계약 변경은 senior-dev 경유 (CLAUDE.md TDD 규칙 2).</p>
 */
class SensitiveRejectedValueContractIntegrationTest extends ApiIntegrationTestSupport {

    private static final String SHORT_PASSWORD = "p1x";

    @Test
    void signup_validation_error_does_not_echo_the_password() throws Exception {
        MvcResult result = mockMvc.perform(post("/api/users")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                { "username": "ab", "password": "%s",
                                  "nickname": "점검닉", "email": "sensitive-check@example.com" }
                                """.formatted(SHORT_PASSWORD)))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.errorCode").value("VALIDATION_ERROR"))
                .andReturn();

        JsonNode errors = objectMapper.readTree(result.getResponse().getContentAsString()).path("errors");
        assertThat(errors.isArray()).isTrue();

        boolean sawPasswordError = false;
        boolean sawUsernameValue = false;
        for (JsonNode error : errors) {
            String field = error.path("field").asText().toLowerCase(Locale.ROOT);
            if (field.contains("password")) {
                sawPasswordError = true;
                assertThat(error.has("rejectedValue"))
                        .as("비밀번호 필드는 rejectedValue를 싣지 않는다 (필드: %s)", field)
                        .isFalse();
            } else if (field.equals("username")) {
                sawUsernameValue = error.path("rejectedValue").asText().equals("ab");
            }
        }
        // 응답 본문 어디에도 평문 비밀번호가 없다 — 필드가 아닌 곳으로 새는 것까지 막는다
        assertThat(result.getResponse().getContentAsString()).doesNotContain(SHORT_PASSWORD);
        assertThat(sawPasswordError).as("비밀번호 길이 검증이 걸려야 이 테스트가 의미 있다").isTrue();
        assertThat(sawUsernameValue).as("비밀번호가 아닌 필드는 rejectedValue를 그대로 돌려준다").isTrue();
    }
}
