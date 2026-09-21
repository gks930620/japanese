package com.test.test.integration;

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
 * 게시글·댓글 본문의 크기 계약 (TDD Red — senior-dev 작성, 2026-09-21 qa 결함 G)
 *
 * <p><b>문제 ①</b>: 본문에 길이 상한이 없다(70,000자도 201). 제목만 200자 제한이 있다.
 * <b>로컬에서만 통과하는 종류의 버그다</b> — {@code community.content}는
 * {@code columnDefinition = "TEXT"}이고 MySQL의 TEXT는 <b>65,535바이트</b>다.
 * 한글 UTF-8 3바이트 기준 약 21,845자가 한계라, 로컬 H2(무제한)에서 저장된 글이
 * <b>운영 MySQL에서는 저장 오류(500)</b>가 된다. 댓글도 같은 컬럼·같은 구멍이다.
 *
 * <p><b>문제 ②</b>: 목록 응답이 <b>본문 전문</b>을 싣는데 화면은 쓰지 않는다
 * ({@code CommunityListPage.jsx}는 title·nickname·viewCount·commentCount·createdAt만 그린다).
 * 긴 글 10건이면 목록 한 페이지가 수백 KB다.
 *
 * <p><b>계약 (판정 2026-09-21 — 설계/04 §5)</b>
 * <ul>
 *   <li>게시글 본문 <b>15,000자</b>, 댓글 본문 <b>2,000자</b>. 초과는 400 {@code VALIDATION_ERROR}.
 *       15,000을 고른 근거: 전부 4바이트 문자여도 60,000바이트로 TEXT 한계 안이다 —
 *       <b>애플리케이션이 400으로 거절하는 것이 DB가 500으로 터지는 것보다 낫다.</b>
 *       더 긴 글이 필요해지면 컬럼 타입(MEDIUMTEXT)과 이 값을 <b>함께</b> 올린다.</li>
 *   <li>목록 응답({@code GET /api/communities})은 <b>본문을 싣지 않는다.</b> 상세는 그대로 싣는다.
 *       목록과 상세는 다른 응답이다 — 같은 DTO를 쓰느라 목록이 상세만큼 무거워질 이유가 없다.</li>
 * </ul>
 *
 * <p>이 테스트를 수정하지 말 것 — 계약 변경은 senior-dev 경유 (CLAUDE.md TDD 규칙 2).
 */
class CommunityBodySizeContractIntegrationTest extends ApiIntegrationTestSupport {

    private static final int POST_BODY_MAX = 15000;
    private static final int COMMENT_BODY_MAX = 2000;
    private static final long SEEDED_POST_ID = 1L;

    // ── 게시글 본문 ─────────────────────────────────────────────────────────

    @Test
    void a_post_body_over_the_limit_is_rejected() throws Exception {
        Tokens tokens = loginDefaultUser();

        mockMvc.perform(post("/api/communities")
                        .header(HttpHeaders.AUTHORIZATION, bearer(tokens.accessToken()))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(postBody("긴 글", POST_BODY_MAX + 1)))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.success").value(false))
                .andExpect(jsonPath("$.errorCode").value("VALIDATION_ERROR"))
                .andExpect(jsonPath("$.errors[0].field").value("content"))
                .andExpect(jsonPath("$.errors[0].message").value("내용은 15000자 이하여야 합니다"));
    }

    @Test
    void a_post_body_at_the_limit_is_accepted(/* 경계 — 상한 자체는 막지 않는다 */) throws Exception {
        Tokens tokens = loginDefaultUser();

        mockMvc.perform(post("/api/communities")
                        .header(HttpHeaders.AUTHORIZATION, bearer(tokens.accessToken()))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(postBody("딱 맞는 글", POST_BODY_MAX)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.success").value(true));
    }

    @Test
    void the_same_limit_applies_to_updates() throws Exception {
        Tokens tokens = loginDefaultUser();

        MvcResult created = mockMvc.perform(post("/api/communities")
                        .header(HttpHeaders.AUTHORIZATION, bearer(tokens.accessToken()))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(postBody("수정 대상", 10)))
                .andExpect(status().isCreated())
                .andReturn();
        long postId = objectMapper.readTree(created.getResponse().getContentAsString()).path("data").asLong();

        mockMvc.perform(put("/api/communities/{id}", postId)
                        .header(HttpHeaders.AUTHORIZATION, bearer(tokens.accessToken()))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(postBody("수정 대상", POST_BODY_MAX + 1)))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.errorCode").value("VALIDATION_ERROR"))
                .andExpect(jsonPath("$.errors[0].field").value("content"));
    }

    // ── 댓글 본문 ───────────────────────────────────────────────────────────

    @Test
    void a_comment_over_the_limit_is_rejected() throws Exception {
        Tokens tokens = loginDefaultUser();

        mockMvc.perform(post("/api/communities/{id}/comments", SEEDED_POST_ID)
                        .header(HttpHeaders.AUTHORIZATION, bearer(tokens.accessToken()))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"content\":\"" + "댓".repeat(COMMENT_BODY_MAX + 1) + "\"}"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.errorCode").value("VALIDATION_ERROR"))
                .andExpect(jsonPath("$.errors[0].field").value("content"))
                .andExpect(jsonPath("$.errors[0].message").value("댓글은 2000자 이하여야 합니다"));
    }

    @Test
    void a_comment_at_the_limit_is_accepted(/* 경계 */) throws Exception {
        Tokens tokens = loginDefaultUser();

        mockMvc.perform(post("/api/communities/{id}/comments", SEEDED_POST_ID)
                        .header(HttpHeaders.AUTHORIZATION, bearer(tokens.accessToken()))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"content\":\"" + "댓".repeat(COMMENT_BODY_MAX) + "\"}"))
                .andExpect(status().isCreated());
    }

    // ── 목록은 본문을 싣지 않는다 ───────────────────────────────────────────

    @Test
    void the_post_list_does_not_carry_bodies() throws Exception {
        MvcResult result = mockMvc.perform(get("/api/communities").param("size", "5"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.content[0].title").exists())
                .andExpect(jsonPath("$.data.content[0].nickname").exists())
                .andExpect(jsonPath("$.data.content[0].viewCount").exists())
                .andExpect(jsonPath("$.data.content[0].commentCount").exists())
                .andExpect(jsonPath("$.data.content[0].createdAt").exists())
                .andExpect(jsonPath("$.data.content[0].content").doesNotExist())
                .andReturn();

        // 목록의 모든 행이 같다 — 첫 행만 비는 것이 아니다
        JsonNode rows = objectMapper.readTree(result.getResponse().getContentAsString())
                .path("data").path("content");
        for (JsonNode row : rows) {
            org.assertj.core.api.Assertions.assertThat(row.has("content"))
                    .as("목록 행 %s 에 본문이 실리지 않는다", row.path("id").asLong())
                    .isFalse();
        }
    }

    @Test
    void the_post_detail_still_carries_the_body(/* 가드 — 상세는 본문이 본체다 */) throws Exception {
        mockMvc.perform(get("/api/communities/{id}", SEEDED_POST_ID))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.content").isNotEmpty())
                .andExpect(jsonPath("$.data.title").isNotEmpty());
    }

    private String postBody(String title, int contentLength) {
        return "{\"title\":\"" + title + "\",\"content\":\"" + "글".repeat(contentLength) + "\"}";
    }
}
