package com.test.test.community.repository;

import com.test.test.community.dto.CommunityListItemDTO;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;

public interface CommunityRepositoryCustom {

    /**
     * 커뮤니티 목록 조회 / 검색 (QueryDSL 동적 쿼리)
     * @param searchType "title" 또는 "nickname" (null 가능)
     * @param keyword 검색 키워드 (null이면 전체 조회)
     * @param pageable 페이징 정보 — <b>정렬은 읽지 않는다</b>. 순서는 이 쿼리의 {@code createdAt desc}가 정한다(설계/04 §1-5)
     * @return 게시글 목록 (최신순 정렬). <b>본문은 싣지 않는다</b> — 목록과 상세는 다른 응답이다(설계/04 §5)
     */
    Page<CommunityListItemDTO> searchCommunity(String searchType, String keyword, Pageable pageable);
}

