package com.test.test.bookmark.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;

/**
 * 종류별 보관 개수 (설계/04 §6-4) — 자료실 상단 [내 보관함 (n)] 배지·마이페이지 카드·기본 탭 판정이 쓴다.
 * 담기/빼기 응답에도 함께 실린다 — 별 한 번에 요청이 두 번 되지 않게 하기 위해서다(설계/04 §6-4).
 *
 * <p>지금 존재하는 항목만 센다(설계/03 §4-1) — 사라진 콘텐츠를 담아 뒀다면 개수도 함께 줄어든다.</p>
 */
@Getter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class BookmarkCountsDTO {

    private int kanji;
    private int grammar;
    private int vocabulary;
    private int total;

    public static BookmarkCountsDTO of(int kanji, int grammar, int vocabulary) {
        return BookmarkCountsDTO.builder()
                .kanji(kanji)
                .grammar(grammar)
                .vocabulary(vocabulary)
                .total(kanji + grammar + vocabulary)
                .build();
    }
}
