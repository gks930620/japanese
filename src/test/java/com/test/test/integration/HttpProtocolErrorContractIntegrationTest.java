package com.test.test.integration;

import org.junit.jupiter.api.Test;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;

import static org.hamcrest.Matchers.containsString;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.header;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * HTTP 프로토콜 오류 계약 (TDD Red — senior-dev 작성, 2026-08-14 qa 결함 반영)
 *
 * <p><b>프레임워크 표준 4xx를 500으로 뭉개지 않는다</b>(code-convention §2).
 * 지금은 메서드 불일치·미디어타입 불일치가 전부 500이라 ① 운영 모니터링에 서버 오류로 잡히고
 * ② 클라이언트가 "재시도하면 되는 오류"로 오인한다 — 미매핑 경로를 500에서 404로 고친 것(결정기록 B-1)과
 * 같은 이유이며, 그때 놓친 나머지 절반이다.</p>
 *
 * <p>이 계약은 <b>전역</b>이다. 그래서 이번에 만든 API와 기존 API를 함께 검증한다 —
 * 한쪽만 고치면 API마다 오류 언어가 달라진다.</p>
 *
 * <p>이 테스트를 수정하지 말 것 — 계약 변경은 senior-dev 경유 (CLAUDE.md TDD 규칙 2).
 */
class HttpProtocolErrorContractIntegrationTest extends ApiIntegrationTestSupport {

    // ── 405: 경로는 있는데 메서드가 없다 ────────────────────────────────────

    @Test
    void wrong_method_on_public_learning_api_is_405_not_500() throws Exception {
        // 존재하는 경로 + 없는 메서드 → "없는 주소"(404)도 "서버 오류"(500)도 아니다.
        // 학습·자료실은 GET만 화이트리스트라 비로그인 POST는 401로 먼저 끊긴다(아래 마지막 테스트) —
        // 인증을 통과한 요청에서만 405가 드러난다.
        Tokens tokens = loginDefaultUser();

        mockMvc.perform(post("/api/library/kanji")
                        .header(HttpHeaders.AUTHORIZATION, bearer(tokens.accessToken()))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{}"))
                .andExpect(status().isMethodNotAllowed())
                .andExpect(jsonPath("$.success").value(false))
                .andExpect(jsonPath("$.errorCode").value("METHOD_NOT_ALLOWED"))
                // RFC 9110: 405 응답은 허용 메서드를 Allow 헤더로 알려야 한다
                .andExpect(header().string(HttpHeaders.ALLOW, containsString("GET")));

        mockMvc.perform(delete("/api/courses/2")
                        .header(HttpHeaders.AUTHORIZATION, bearer(tokens.accessToken())))
                .andExpect(status().isMethodNotAllowed())
                .andExpect(jsonPath("$.errorCode").value("METHOD_NOT_ALLOWED"));
    }

    @Test
    void wrong_method_on_user_data_api_is_405_not_500() throws Exception {
        Tokens tokens = loginDefaultUser();

        mockMvc.perform(get("/api/me/merge")
                        .header(HttpHeaders.AUTHORIZATION, bearer(tokens.accessToken())))
                .andExpect(status().isMethodNotAllowed())
                .andExpect(jsonPath("$.errorCode").value("METHOD_NOT_ALLOWED"))
                .andExpect(header().string(HttpHeaders.ALLOW, containsString("POST")));

        mockMvc.perform(post("/api/progress")
                        .header(HttpHeaders.AUTHORIZATION, bearer(tokens.accessToken()))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{}"))
                .andExpect(status().isMethodNotAllowed())
                .andExpect(jsonPath("$.errorCode").value("METHOD_NOT_ALLOWED"));

        // /api/bookmarks/{type}/{targetId}는 PUT만 있다
        mockMvc.perform(delete("/api/bookmarks/kanji/1")
                        .header(HttpHeaders.AUTHORIZATION, bearer(tokens.accessToken())))
                .andExpect(status().isMethodNotAllowed())
                .andExpect(jsonPath("$.errorCode").value("METHOD_NOT_ALLOWED"));
    }

    // ── 415: 본문 형식이 다르다 ─────────────────────────────────────────────

    @Test
    void missing_or_wrong_content_type_is_415_not_500() throws Exception {
        Tokens tokens = loginDefaultUser();

        // Content-Type 없이 JSON 본문 → 415 (요청을 고쳐야 하는 클라이언트 잘못이다)
        mockMvc.perform(put("/api/progress/last-position")
                        .header(HttpHeaders.AUTHORIZATION, bearer(tokens.accessToken()))
                        .content("""
                                { "courseId": 2, "unitNo": 1, "stepKey": "kanji" }
                                """))
                .andExpect(status().isUnsupportedMediaType())
                .andExpect(jsonPath("$.success").value(false))
                .andExpect(jsonPath("$.errorCode").value("UNSUPPORTED_MEDIA_TYPE"));

        // 지원하지 않는 타입도 같다
        mockMvc.perform(post("/api/me/merge")
                        .header(HttpHeaders.AUTHORIZATION, bearer(tokens.accessToken()))
                        .contentType(MediaType.TEXT_PLAIN)
                        .content("progress"))
                .andExpect(status().isUnsupportedMediaType())
                .andExpect(jsonPath("$.errorCode").value("UNSUPPORTED_MEDIA_TYPE"));
    }

    @Test
    void missing_content_type_on_existing_api_is_415_not_500() throws Exception {
        Tokens tokens = loginDefaultUser();

        // 기존 API도 같은 언어를 쓴다 (계약은 전역이다)
        mockMvc.perform(post("/api/communities")
                        .header(HttpHeaders.AUTHORIZATION, bearer(tokens.accessToken()))
                        .content("""
                                { "title": "t", "content": "c" }
                                """))
                .andExpect(status().isUnsupportedMediaType())
                .andExpect(jsonPath("$.errorCode").value("UNSUPPORTED_MEDIA_TYPE"));
    }

    // ── 인증 판정이 먼저다 (기존 규칙 회귀 방지) ────────────────────────────

    @Test
    void unauthenticated_request_is_still_401_even_when_the_method_is_wrong() throws Exception {
        // 시큐리티 판정이 먼저다 — 405/415가 401을 대체하면 비로그인에게 경로 존재 여부를 알려주게 된다.
        // 화이트리스트에 없는 메서드(공개 GET 네임스페이스의 POST 포함)도 같은 이유로 401이 맞다.
        mockMvc.perform(get("/api/me/merge"))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.errorCode").value("NOT_AUTHENTICATED"));

        mockMvc.perform(post("/api/library/kanji")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{}"))
                .andExpect(status().isUnauthorized());
    }
}
