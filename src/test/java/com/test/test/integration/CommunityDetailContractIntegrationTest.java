package com.test.test.integration;

import org.junit.jupiter.api.Test;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * 게시글 상세 조회 계약 (backend-dev 작성 — QA 리포트 후속).
 *
 * <p>재현한 결함: {@code GET /api/communities/{id}}가 운영에서 500이었다.
 * {@code incrementViewCount}가 {@code clearAutomatically = true}로 영속성 컨텍스트를 비우는 바람에
 * 방금 읽은 게시글이 <b>초기화되지 않은 작성자 프록시를 단 채 detach</b>되고,
 * 그 뒤 DTO가 {@code getUser().getUsername()}을 부르면서 LazyInitializationException이 났다.
 *
 * <p>기존 테스트가 못 잡은 이유: 테스트는 트랜잭션을 공유해서, 앞선 로그인이 같은 사용자 엔티티를
 * 이미 컨텍스트에 올려 두면 프록시가 초기화된 상태라 예외가 나지 않는다.
 * 그래서 이 테스트는 <b>로그인하지 않고</b> 상세를 읽는다 — 실제 방문자와 같은 조건이다.
 *
 * <p>{@code open-in-view}를 켜서 덮지 않는다 — 뷰 렌더링 중 쿼리가 새는 구조를 되살리는 대신,
 * 조회 시점에 필요한 값을 가져오게(fetch join) 고친다.
 */
class CommunityDetailContractIntegrationTest extends ApiIntegrationTestSupport {

    /** 시드 게시글 — `data-community.sql` */
    private static final long SEED_COMMUNITY_ID = 1L;

    @Test
    void community_detail_is_readable_by_a_visitor_without_login() throws Exception {
        mockMvc.perform(get("/api/communities/{communityId}", SEED_COMMUNITY_ID))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data.id").value(SEED_COMMUNITY_ID))
                // 작성자 표기는 users 조인에서 온다 — 프록시가 detach된 채 직렬화되면 여기서 터졌다
                .andExpect(jsonPath("$.data.nickname").isNotEmpty())
                // username은 더 이상 내려주지 않는다(판정 2026-08-25 C-1 — 비로그인 공개 응답에서 로그인 아이디 제거).
                // 이 테스트가 지키려던 것은 "작성자 프록시가 초기화된 채 직렬화된다"이고,
                // 그 사실은 같은 getUser() 경로에서 오는 nickname·userId로 그대로 확인된다.
                .andExpect(jsonPath("$.data.userId").isNumber());
    }

    @Test
    void community_detail_still_counts_views_and_comments() throws Exception {
        mockMvc.perform(get("/api/communities/{communityId}", SEED_COMMUNITY_ID))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.viewCount").isNumber())
                .andExpect(jsonPath("$.data.commentCount").isNumber());
    }
}
