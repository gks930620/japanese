package com.test.test.library.dto;

import com.test.test.library.LibraryPaging;
import java.util.List;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;

/**
 * 자료실 목록 응답 (설계 §4-B 공통 규약, §7-14 ①)
 *
 * <p>공용 {@code PageResponse}와 필드 이름·의미가 완전히 동일하고 {@code totalAll} 하나만 추가된다.
 * 공용 PageResponse에 필드를 넣지 않는 이유: 커뮤니티 등 다른 페이징 응답에 의미 없는 필드가 붙기 때문(§7-14 ①).</p>
 *
 * <ul>
 *   <li>{@code totalElements} — 필터·검색 적용 후 개수</li>
 *   <li>{@code totalAll} — 필터·검색을 걸지 않았을 때의 전체 개수 ("1,000자 중 350자" 문구용)</li>
 * </ul>
 */
@Getter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class LibraryPageResponse<T> {

    private List<T> content;
    private int page;
    private int size;
    private long totalElements;
    private long totalAll;
    private int totalPages;
    private boolean first;
    private boolean last;

    public static <T> LibraryPageResponse<T> of(List<T> content, int page, int size,
                                                long totalElements, long totalAll) {
        int totalPages = LibraryPaging.totalPages(totalElements, size);
        return LibraryPageResponse.<T>builder()
                .content(content)
                .page(page)
                .size(size)
                .totalElements(totalElements)
                .totalAll(totalAll)
                .totalPages(totalPages)
                .first(page == 0)
                .last(page >= totalPages - 1)
                .build();
    }
}
