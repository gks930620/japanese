package com.test.test.integration;

import org.junit.jupiter.api.Test;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;

import static org.hamcrest.Matchers.not;
import static org.hamcrest.Matchers.containsString;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * 요청 형식 계약 (설계/04 §1-2 · §6-4 · §6-5) — qa 결함 2·3·4번의 회귀 방지. backend-dev 작성.
 *
 * <ul>
 *   <li>2번 — 손상된 localStorage 문서(배열 안의 null)가 그대로 올라와도 500이 아니라 400이다</li>
 *   <li>3번 — 경로의 {@code {type}}은 <b>소문자</b>다(설계/04 §6-4). 대문자는 같은 자원의 두 번째 URL이 되므로 404다</li>
 *   <li>4번 — 404 메시지에 조사 자리표시자("을(를)")를 쓰지 않는다</li>
 * </ul>
 */
class UserDataRequestContractIntegrationTest extends ApiIntegrationTestSupport {

    // ── 결함 2: 배열 안의 null ────────────────────────────────────────────────

    @Test
    void merge_rejects_a_null_element_in_completed_units() throws Exception {
        Tokens tokens = loginDefaultUser();

        mockMvc.perform(merge(tokens, """
                        { "progress": { "completedUnits": [null] } }
                        """))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.errorCode").value("VALIDATION_ERROR"));
    }

    @Test
    void merge_rejects_a_null_element_in_bookmark_arrays() throws Exception {
        Tokens tokens = loginDefaultUser();

        mockMvc.perform(merge(tokens, """
                        { "bookmarks": { "kanji": [null] } }
                        """))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.errorCode").value("VALIDATION_ERROR"));

        mockMvc.perform(merge(tokens, """
                        { "bookmarks": { "grammar": [7, null], "vocabulary": [null] } }
                        """))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.errorCode").value("VALIDATION_ERROR"));
    }

    // ── 결함 3: 경로 {type}은 소문자만 ────────────────────────────────────────

    @Test
    void uppercase_bookmark_type_path_is_404() throws Exception {
        Tokens tokens = loginDefaultUser();

        mockMvc.perform(get("/api/bookmarks/KANJI").header(HttpHeaders.AUTHORIZATION, bearer(tokens.accessToken())))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.errorCode").value("NOT_FOUND"));

        mockMvc.perform(put("/api/bookmarks/KANJI/12")
                        .header(HttpHeaders.AUTHORIZATION, bearer(tokens.accessToken()))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                { "bookmarked": true }
                                """))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.errorCode").value("NOT_FOUND"));

        mockMvc.perform(delete("/api/bookmarks/Vocabulary")
                        .header(HttpHeaders.AUTHORIZATION, bearer(tokens.accessToken())))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.errorCode").value("NOT_FOUND"));
    }

    // ── 결함 4: 404 메시지의 조사 ────────────────────────────────────────────

    @Test
    void not_found_message_does_not_use_a_particle_placeholder() throws Exception {
        Tokens tokens = loginDefaultUser();

        mockMvc.perform(put("/api/bookmarks/kanji/999999")
                        .header(HttpHeaders.AUTHORIZATION, bearer(tokens.accessToken()))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                { "bookmarked": true }
                                """))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.message", not(containsString("을(를)"))));

        mockMvc.perform(get("/api/bookmarks/hiragana")
                        .header(HttpHeaders.AUTHORIZATION, bearer(tokens.accessToken())))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.message", not(containsString("을(를)"))));
    }

    private org.springframework.test.web.servlet.request.MockHttpServletRequestBuilder merge(Tokens tokens,
                                                                                             String body) {
        return post("/api/me/merge")
                .header(HttpHeaders.AUTHORIZATION, bearer(tokens.accessToken()))
                .contentType(MediaType.APPLICATION_JSON)
                .content(body);
    }
}
