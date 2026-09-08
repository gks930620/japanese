package com.test.test.common.paging;

import java.util.function.Function;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;

/**
 * 범위 밖 {@code page} 보정 — 목록 API의 <b>공통</b> 규칙(설계/04 §1-5 · 08 B-3)의 <b>단일 출처</b>.
 *
 * <p>규칙: 음수 → 0, 총 페이지 수 이상 → <b>0페이지 내용 + 응답 {@code page: 0}</b>. 404도 빈 배열도 아니다.
 * 근거 시나리오는 커뮤니티다 — "마지막 페이지를 보던 중 글이 삭제돼 총 페이지가 줄면" 사용자는
 * 빈 화면이 아니라 목록을 봐야 한다. 범위 안의 마지막 페이지는 그대로다(과보정 금지).</p>
 *
 * <p>자료실({@code LibraryPaging})은 메모리 슬라이스라 번호만 보정하고, 커뮤니티·댓글은 {@code Pageable}로
 * DB에 묻기 때문에 <b>한 번 더 조회</b>한다. 판정 함수는 하나다 — 두 곳이 각자 구현하면 곧 갈린다(2026-09 판정 H2).</p>
 */
public final class PageClamp {

    private PageClamp() {
    }

    /** 요청 페이지 번호를 규칙대로 보정한 번호 — 자료실(메모리 슬라이스)이 쓴다 */
    public static int clamp(Integer requestedPage, long totalElements, int size) {
        if (requestedPage == null || requestedPage <= 0) {
            return 0;
        }
        return requestedPage >= totalPages(totalElements, size) ? 0 : requestedPage;
    }

    public static int totalPages(long totalElements, int size) {
        if (size <= 0) {
            return 0;
        }
        return (int) ((totalElements + size - 1) / size);
    }

    /**
     * {@code Pageable} 조회를 감싼다 — 결과가 범위 밖이면 <b>같은 조건의 0페이지</b>를 다시 읽는다.
     *
     * <p>총 개수를 알려면 어차피 한 번은 조회해야 하므로, 정상 요청(대부분)에는 추가 비용이 0이고
     * 범위 밖 요청에만 재조회 1회가 붙는다. 정렬·크기는 원래 요청 그대로 유지한다.</p>
     */
    public static <T> Page<T> query(Pageable pageable, Function<Pageable, Page<T>> query) {
        Page<T> page = query.apply(pageable);
        int totalPages = page.getTotalPages();
        if (totalPages > 0 && pageable.isPaged() && pageable.getPageNumber() >= totalPages) {
            return query.apply(PageRequest.of(0, pageable.getPageSize(), pageable.getSort()));
        }
        return page;
    }
}
