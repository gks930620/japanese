package com.test.test.bookmark.dto;

import com.test.test.bookmark.BookmarkType;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;

/**
 * 종류별 비우기 결과 (설계/04 §6-4) — 현재 탭 종류만 비운다(AC-B-21).
 * 종류 없이 전부 비우는 API는 만들지 않는다: 실수 한 번으로 전 기록이 사라지면 안 된다.
 */
@Getter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class BookmarkClearDTO {

    private String type;
    private long removed;
    private BookmarkCountsDTO counts;

    public static BookmarkClearDTO of(BookmarkType type, long removed, BookmarkCountsDTO counts) {
        return BookmarkClearDTO.builder()
                .type(type.name())
                .removed(removed)
                .counts(counts)
                .build();
    }
}
