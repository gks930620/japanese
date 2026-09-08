package com.test.test.bookmark;

import com.test.test.common.exception.BusinessRuleException;

/**
 * 보관함 목록 정렬 (설계/04 §6-4)
 *
 * <ul>
 *   <li>{@code RECENT} — 기본. 최근 담은 순. 정렬 키는 {@code created_at DESC, id DESC}다 —
 *       같은 밀리초에 담긴 두 항목의 순서가 응답마다 달라지면 페이징이 흔들린다(같은 항목이 두 페이지에 보이거나 사라진다)</li>
 *   <li>{@code LEARNING} — 학습 순서(코스 → 유닛 → 유닛 내 순서)</li>
 * </ul>
 */
public enum BookmarkSort {

    RECENT,
    LEARNING;

    public static BookmarkSort from(String code) {
        if (code == null || code.isBlank()) {
            return RECENT;
        }
        for (BookmarkSort sort : values()) {
            if (sort.name().equalsIgnoreCase(code.trim())) {
                return sort;
            }
        }
        throw new BusinessRuleException("지원하지 않는 정렬입니다: " + code + " (RECENT·LEARNING 중 하나)");
    }
}
