package com.test.test.library;

import com.test.test.common.exception.BusinessRuleException;
import java.util.List;

/**
 * 한자·문법 자료실 정렬 기준 (설계/04 §6-7)
 *
 * <ul>
 *   <li>{@code LEARNING} — 기본. 코스 → 유닛 → 유닛 내 순서</li>
 *   <li>{@code GIVEN} — {@code ids}로 준 순서 그대로. 게스트 보관함의 "최근 담은 순"이 이것으로 표현된다</li>
 * </ul>
 */
public enum LibrarySort {

    LEARNING,
    GIVEN;

    public static LibrarySort from(String code) {
        if (code == null || code.isBlank()) {
            return LEARNING;
        }
        for (LibrarySort sort : values()) {
            if (sort.name().equalsIgnoreCase(code.trim())) {
                return sort;
            }
        }
        throw new BusinessRuleException("지원하지 않는 정렬입니다: " + code + " (LEARNING·GIVEN 중 하나)");
    }

    /** {@code ids} 없이 GIVEN이면 "준 순서"가 존재하지 않는다 → 400 (설계/04 §6-7) */
    public static void requireIdsForGivenOrder(LibrarySort sort, List<Long> ids) {
        if (sort == GIVEN && (ids == null || ids.isEmpty())) {
            throw new BusinessRuleException("sort=GIVEN은 ids와 함께 사용해야 합니다.");
        }
    }
}
