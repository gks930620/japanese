package com.test.test.integration;

import static org.hamcrest.Matchers.greaterThan;
import static org.hamcrest.Matchers.hasSize;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.fasterxml.jackson.databind.JsonNode;
import org.junit.jupiter.api.Test;
import org.springframework.test.web.servlet.MvcResult;

/**
 * 범위 밖 {@code page}는 서버가 0으로 보정한다 — <b>커뮤니티·댓글도 예외가 아니다</b>
 * (TDD Red — senior-dev 작성, 2026-09-03 판정 H2).
 *
 * <p>설계/04 §1-5는 이 규칙을 목록 API({@code Page}/{@code LibraryPageResponse})의 <b>공통</b> 규칙으로 못 박았고,
 * 08 B-3이 규칙을 세운 근거 시나리오가 정확히 "글이 삭제돼 총 페이지가 줄어드는 커뮤니티"였다.
 * 그런데 보정은 {@code LibraryPaging}에만 있어 {@code GET /api/communities?page=9999}가
 * {@code page: 9999, content: []}를 돌려줬다(로컬 8083 실측). 자료실은 {@code LibraryApiIntegrationTest}가 고정하고 있으니
 * 여기서는 <b>공용 {@code PageResponse}를 쓰는 두 목록</b>만 본다.</p>
 *
 * <p>규칙(04 §1-5): 총 페이지 수 이상 → <b>0페이지 내용 + 응답 {@code page: 0}</b>. 404도, 빈 배열도 아니다.
 * 범위 안의 마지막 페이지는 그대로다(과보정 금지). 음수는 0.</p>
 *
 * <p>이 테스트를 수정하지 말 것 — 계약 변경은 senior-dev 경유 (CLAUDE.md TDD 규칙 2).</p>
 */
class PageClampContractIntegrationTest extends ApiIntegrationTestSupport {

    private static final String COMMUNITIES = "/api/communities";
    private static final String COMMENTS = "/api/communities/1/comments";

    @Test
    void community_list_out_of_range_page_falls_back_to_first_page() throws Exception {
        int totalPages = totalPagesOf(COMMUNITIES);

        mockMvc.perform(get(COMMUNITIES).param("page", String.valueOf(totalPages + 100)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.page").value(0))
                .andExpect(jsonPath("$.data.first").value(true))
                .andExpect(jsonPath("$.data.content", hasSize(greaterThan(0))));
    }

    @Test
    void comment_list_out_of_range_page_falls_back_to_first_page() throws Exception {
        int totalPages = totalPagesOf(COMMENTS);

        mockMvc.perform(get(COMMENTS).param("page", String.valueOf(totalPages + 100)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.page").value(0))
                .andExpect(jsonPath("$.data.first").value(true))
                .andExpect(jsonPath("$.data.content", hasSize(greaterThan(0))));
    }

    @Test
    void the_real_last_page_is_not_over_corrected(/* 가드 — 범위 안은 그대로 */) throws Exception {
        int totalPages = totalPagesOf(COMMUNITIES);
        int lastPage = totalPages - 1;

        mockMvc.perform(get(COMMUNITIES).param("page", String.valueOf(lastPage)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.page").value(lastPage))
                .andExpect(jsonPath("$.data.last").value(true))
                .andExpect(jsonPath("$.data.content", hasSize(greaterThan(0))));
    }

    @Test
    void negative_page_is_first_page() throws Exception {
        mockMvc.perform(get(COMMUNITIES).param("page", "-3"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.page").value(0));
    }

    /** 총 페이지 수를 응답에서 읽는다 — 시드 행 수를 테스트에 박지 않는다 */
    private int totalPagesOf(String listUrl) throws Exception {
        MvcResult result = mockMvc.perform(get(listUrl).param("page", "0"))
                .andExpect(status().isOk())
                .andReturn();
        JsonNode data = objectMapper.readTree(result.getResponse().getContentAsString()).path("data");
        int totalPages = data.path("totalPages").asInt();
        if (totalPages < 2) {
            throw new IllegalStateException("시드가 2페이지 이상이어야 보정을 검증할 수 있다: " + listUrl);
        }
        return totalPages;
    }
}
