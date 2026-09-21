package com.test.test.integration;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.fasterxml.jackson.databind.JsonNode;
import org.junit.jupiter.api.Test;
import org.springframework.test.web.servlet.MvcResult;

/**
 * 목록 정렬 파라미터 계약 (TDD Red — senior-dev 작성, 2026-09-21 qa 결함 B)
 *
 * <p><b>문제</b>: {@code GET /api/communities/1/comments?sort=nope,desc} → <b>500</b>. 컨트롤러가 클라이언트
 * {@code Pageable}을 {@code @Query}+Pageable 리포지토리에 그대로 넘겨 {@code PropertyReferenceException}이 난다.
 * 비로그인으로 누구나 재현된다. 500은 모니터링에 서버 장애로 잡히고 클라이언트는 재시도한다(설계/04 §1-2).
 * 같은 입력에 게시글 목록({@code /api/communities?sort=nope,desc})은 QueryDSL이라 200 — <b>두 엔드포인트가
 * 다르게 답하는 것</b>도 결함이다.</p>
 *
 * <p><b>계약 (판정 2026-09-21 — 설계/04 §1-5에 추가)</b>: <b>목록의 정렬 기준은 서버가 정한다.</b>
 * {@code sort}는 계약에 없는 파라미터이고, 서버는 그 값을 <b>읽지 않는다</b>. 알 수 없는 값이든 존재하는
 * 속성이든 응답은 같다 — 서버 기준 정렬(커뮤니티·댓글 모두 최신순)의 200이다.
 *
 * <p><b>왜 400이 아닌가</b>: ① {@code sort}는 계약 파라미터가 아니다. 계약에 없는 쿼리 파라미터를 거절하지
 * 않는 것이 일반 규칙이다(그러지 않으면 {@code utm_*} 같은 값이 붙은 링크에서 화면이 깨진다).
 * ② 지금 200을 주는 게시글 목록을 400으로 바꾸면 계약이 <b>좁아져</b> 이미 동작하던 클라이언트가 깨진다.
 * ③ 설계/04 §1-5가 이미 "목록 파라미터는 서버가 보정한다"는 철학을 세워 두었다.
 * ④ 무엇보다 <b>안 쓰는 것이 검증하는 것보다 안전하다</b> — 클라이언트 입력이 JPA 속성 경로로 들어가는 길
 * 자체를 없애는 것이 정렬 주입의 정석 방어다.
 *
 * <p>자료실의 {@code sort}({@code LEARNING}·{@code KANA})는 <b>계약 파라미터</b>라 허용 밖 값이 400이다.
 * 둘은 이름만 같을 뿐 다른 것이다 — "계약에 있는 파라미터의 잘못된 값 = 400, 계약에 없는 파라미터 = 무시".</p>
 *
 * <p>이 테스트를 수정하지 말 것 — 계약 변경은 senior-dev 경유 (CLAUDE.md TDD 규칙 2).
 */
class ListSortParameterContractIntegrationTest extends ApiIntegrationTestSupport {

    /** 댓글 15개가 시드된 게시글 (data-comment.sql) */
    private static final long SEEDED_POST_ID = 1L;

    @Test
    void comment_list_ignores_an_unknown_sort_property() throws Exception {
        mockMvc.perform(get("/api/communities/{id}/comments", SEEDED_POST_ID)
                        .param("sort", "nope,desc"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data.content").isArray());

        // 정렬 주입의 다른 모양들도 같다 — 하나만 막으면 다음 모양에서 다시 500이 난다
        for (String injected : new String[]{"nope", "user.password", "community.user.username,asc", ",,,"}) {
            mockMvc.perform(get("/api/communities/{id}/comments", SEEDED_POST_ID).param("sort", injected))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.success").value(true));
        }
    }

    @Test
    void community_list_ignores_an_unknown_sort_property(/* 가드 — 두 엔드포인트가 같은 답을 낸다 */) throws Exception {
        mockMvc.perform(get("/api/communities").param("sort", "nope,desc"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data.content").isArray());

        mockMvc.perform(get("/api/communities").param("sort", "user.password,asc"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true));
    }

    @Test
    void a_client_sort_does_not_change_the_server_order() throws Exception {
        // 정렬은 서버가 정한다 — "알 수 없는 값은 무시하고 아는 값은 따른다"가 아니다.
        // (그렇게 고치면 클라이언트 입력이 다시 속성 경로로 들어간다)
        long firstByDefault = firstCommentId(null);

        assertThat(firstCommentId("createdAt,asc"))
                .as("존재하는 속성을 보내도 서버 기준 정렬(최신순) 그대로다")
                .isEqualTo(firstByDefault);
        assertThat(firstCommentId("nope,desc"))
                .as("알 수 없는 속성도 같은 결과다")
                .isEqualTo(firstByDefault);
    }

    @Test
    void page_and_size_still_work(/* 가드 — 정렬만 무시한다, 페이징은 계약이다 */) throws Exception {
        mockMvc.perform(get("/api/communities/{id}/comments", SEEDED_POST_ID)
                        .param("page", "0")
                        .param("size", "3")
                        .param("sort", "nope,desc"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.size").value(3))
                .andExpect(jsonPath("$.data.content.length()").value(3))
                .andExpect(jsonPath("$.data.page").value(0));
    }

    @Test
    void the_library_sort_parameter_is_still_a_400(/* 가드 — 계약 파라미터는 값을 검증한다 */) throws Exception {
        mockMvc.perform(get("/api/library/vocabulary").param("sort", "WRONG"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.errorCode").value("BUSINESS_RULE_VIOLATION"));
    }

    private long firstCommentId(String sort) throws Exception {
        MvcResult result = sort == null
                ? mockMvc.perform(get("/api/communities/{id}/comments", SEEDED_POST_ID))
                        .andExpect(status().isOk()).andReturn()
                : mockMvc.perform(get("/api/communities/{id}/comments", SEEDED_POST_ID).param("sort", sort))
                        .andExpect(status().isOk()).andReturn();

        JsonNode content = objectMapper.readTree(result.getResponse().getContentAsString())
                .path("data").path("content");
        assertThat(content.size()).as("시드 댓글이 있어야 이 테스트가 의미 있다").isPositive();
        return content.get(0).path("id").asLong();
    }
}
