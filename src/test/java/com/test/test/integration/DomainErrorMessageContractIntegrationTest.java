package com.test.test.integration;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.fasterxml.jackson.databind.JsonNode;
import org.junit.jupiter.api.Test;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MvcResult;

/**
 * 사용자에게 보이는 오류 메시지의 언어 계약 (TDD Red — senior-dev 작성, 2026-09-21 qa 결함 E)
 *
 * <p><b>문제</b>: 댓글 경로만 <b>내부 클래스명</b>을 그대로 내보낸다 —
 * {@code "존재하지 않는 Community입니다: 99999"} · {@code "본인의 Comment만 수정할 수 있습니다."}
 * 같은 리소스의 다른 경로({@code GET /api/communities/99999})는 {@code "존재하지 않는 게시글입니다"}로
 * 한국어다. 사용자는 같은 상황에서 두 가지 품질의 문구를 보고, 응답은 내부 구조를 알려준다
 * (판정 2026-08-25 G-1 "응답에 내부 클래스명을 싣지 않는다").</p>
 *
 * <p><b>계약</b>: 오류 메시지의 리소스 이름은 <b>사용자의 말</b>이다 —
 * {@code Community}→<b>게시글</b>, {@code Comment}→<b>댓글</b>, {@code User}→<b>사용자</b>.
 * 형식은 기존 그대로다: {@code 존재하지 않는 {리소스}입니다: {식별자}}(설계/04 §1-1) ·
 * {@code 본인의 {리소스}만 수정/삭제할 수 있습니다.}
 *
 * <p>이 테스트를 수정하지 말 것 — 계약 변경은 senior-dev 경유 (CLAUDE.md TDD 규칙 2).
 */
class DomainErrorMessageContractIntegrationTest extends ApiIntegrationTestSupport {

    private static final long SEEDED_POST_ID = 1L;
    private static final long MISSING_ID = 99999L;

    @Test
    void creating_a_comment_on_a_missing_post_speaks_korean() throws Exception {
        Tokens tokens = loginDefaultUser();

        MvcResult result = mockMvc.perform(post("/api/communities/{id}/comments", MISSING_ID)
                        .header(HttpHeaders.AUTHORIZATION, bearer(tokens.accessToken()))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                { "content": "없는 글에 다는 댓글" }
                                """))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.errorCode").value("NOT_FOUND"))
                .andExpect(jsonPath("$.message").value("존재하지 않는 게시글입니다: " + MISSING_ID))
                .andReturn();

        assertNoInternalNames(result);
    }

    @Test
    void deleting_a_missing_comment_speaks_korean() throws Exception {
        Tokens tokens = loginDefaultUser();

        MvcResult result = mockMvc.perform(delete("/api/comments/{id}", MISSING_ID)
                        .header(HttpHeaders.AUTHORIZATION, bearer(tokens.accessToken())))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.errorCode").value("NOT_FOUND"))
                .andExpect(jsonPath("$.message").value("존재하지 않는 댓글입니다: " + MISSING_ID))
                .andReturn();

        assertNoInternalNames(result);
    }

    @Test
    void updating_someone_elses_comment_speaks_korean() throws Exception {
        long commentId = createComment(loginDefaultUser());
        Tokens other = loginOtherUser();

        MvcResult result = mockMvc.perform(put("/api/comments/{id}", commentId)
                        .header(HttpHeaders.AUTHORIZATION, bearer(other.accessToken()))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                { "content": "남의 댓글 수정 시도" }
                                """))
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.errorCode").value("ACCESS_DENIED"))
                .andExpect(jsonPath("$.message").value("본인의 댓글만 수정할 수 있습니다."))
                .andReturn();

        assertNoInternalNames(result);
    }

    @Test
    void deleting_someone_elses_comment_speaks_korean() throws Exception {
        long commentId = createComment(loginDefaultUser());
        Tokens other = loginOtherUser();

        MvcResult result = mockMvc.perform(delete("/api/comments/{id}", commentId)
                        .header(HttpHeaders.AUTHORIZATION, bearer(other.accessToken())))
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.errorCode").value("ACCESS_DENIED"))
                .andExpect(jsonPath("$.message").value("본인의 댓글만 삭제할 수 있습니다."))
                .andReturn();

        assertNoInternalNames(result);
    }

    @Test
    void the_post_paths_already_speak_korean(/* 가드 — 댓글을 여기에 맞추는 것이다 */) throws Exception {
        mockMvc.perform(get("/api/communities/{id}", MISSING_ID))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.message").value("존재하지 않는 게시글입니다: " + MISSING_ID));

        mockMvc.perform(get("/api/communities/{id}/comments", MISSING_ID))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.message").value("존재하지 않는 게시글입니다: " + MISSING_ID));
    }

    private long createComment(Tokens owner) throws Exception {
        MvcResult result = mockMvc.perform(post("/api/communities/{id}/comments", SEEDED_POST_ID)
                        .header(HttpHeaders.AUTHORIZATION, bearer(owner.accessToken()))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                { "content": "소유자 댓글" }
                                """))
                .andExpect(status().isCreated())
                .andReturn();

        JsonNode data = objectMapper.readTree(result.getResponse().getContentAsString()).path("data");
        return data.path("id").asLong();
    }

    private void assertNoInternalNames(MvcResult result) throws Exception {
        String body = result.getResponse().getContentAsString();
        assertThat(body)
                .as("응답에 내부 클래스명을 싣지 않는다 (판정 G-1)")
                .doesNotContain("com.test.test")
                .doesNotContain("Community")
                .doesNotContain("Comment");
    }
}
