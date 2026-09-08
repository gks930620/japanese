package com.test.test.library;

import com.test.test.common.exception.BusinessRuleException;

/**
 * 어휘 자료실 정렬 기준 (설계/04 §3-7 · 04 §6-7)
 *
 * <ul>
 *   <li>{@code LEARNING} — 기본. 코스 → 유닛 → 유닛 내 순서</li>
 *   <li>{@code KANA} — 사전순. 가타카나를 히라가나와 같은 자리에 섞어 정렬하고, 읽기가 없으면 표기로 정렬</li>
 *   <li>{@code GIVEN} — {@code ids}로 준 순서 그대로(설계/04 §6-7). ids 없이 쓰면 400</li>
 * </ul>
 */
public enum VocabularySort {

    LEARNING,
    KANA,
    GIVEN;

    public static VocabularySort from(String code) {
        if (code == null || code.isBlank()) {
            return LEARNING;
        }
        for (VocabularySort sort : values()) {
            if (sort.name().equalsIgnoreCase(code.trim())) {
                return sort;
            }
        }
        throw new BusinessRuleException("지원하지 않는 정렬입니다: " + code + " (LEARNING·KANA·GIVEN 중 하나)");
    }
}
