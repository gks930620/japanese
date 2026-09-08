package com.test.test.library;

import java.util.List;

/**
 * 자료실 공통 페이지 보정 규칙 (설계 §4-B 공통 파라미터, §7-13 ③)
 *
 * <ul>
 *   <li>size: 미지정/0 이하 → 자료실별 기본값, 최대 100으로 절삭</li>
 *   <li>page: 음수 → 0, 총 페이지 수 이상 → 0 (빈 화면 금지 — 프론트 3화면이 각자 구현하지 않도록 서버가 보정)</li>
 * </ul>
 */
public final class LibraryPaging {

    /** 과대 요청 방어 — 기존 max-page-size 정책과 동일 */
    public static final int MAX_PAGE_SIZE = 100;

    private LibraryPaging() {
    }

    public static int resolveSize(Integer requestedSize, int defaultSize) {
        if (requestedSize == null || requestedSize <= 0) {
            return defaultSize;
        }
        return Math.min(requestedSize, MAX_PAGE_SIZE);
    }

    public static int resolvePage(Integer requestedPage, long totalElements, int size) {
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
     * 메모리에 올린 목록을 잘라 한 페이지로 만든다.
     * (어휘 병합·{@code ids}+{@code GIVEN} 정렬처럼 DB에서 자를 수 없는 경우에만 쓴다 — 설계 §4-B-7)
     */
    public static <T> List<T> slice(List<T> items, int page, int size) {
        int fromIndex = Math.min(page * size, items.size());
        int toIndex = Math.min(fromIndex + size, items.size());
        return items.subList(fromIndex, toIndex);
    }
}
