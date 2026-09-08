package com.test.test.bookmark.dto;

import com.test.test.bookmark.BookmarkType;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;

/**
 * 담기/빼기 결과 (설계/04 §6-4)
 *
 * <p>{@code targetId}는 <b>정규화된 값</b>이다 — 어휘는 클라이언트가 member id(3024)를 보내도
 * 표제어 대표 id(1217)가 돌아온다. 프론트는 요청값이 아니라 응답값으로 상태를 갱신한다.</p>
 */
@Getter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class BookmarkToggleDTO {

    private String type;
    private Long targetId;
    private Boolean bookmarked;
    private BookmarkCountsDTO counts;

    public static BookmarkToggleDTO of(BookmarkType type, Long targetId, boolean bookmarked,
                                       BookmarkCountsDTO counts) {
        return BookmarkToggleDTO.builder()
                .type(type.name())
                .targetId(targetId)
                .bookmarked(bookmarked)
                .counts(counts)
                .build();
    }
}
