package com.test.test.me.dto;

import com.test.test.bookmark.dto.BookmarkCountsDTO;
import com.test.test.progress.dto.LastPositionDTO;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;

/**
 * 병합 결과 = 병합 <b>후</b> 상태 (설계/04 §6-5)
 *
 * <p>배너의 "완료 12유닛 · 보관함 34개"는 호출 <b>전</b> localStorage 값으로 프론트가 만든다 —
 * 그 숫자는 브라우저에만 있는 사실이라 서버에 미리 물어보는 API를 두지 않는다(AC-G-07).</p>
 */
@Getter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class UserDataMergeResultDTO {

    private int completedUnitCount;
    private LastPositionDTO lastPosition;
    private BookmarkCountsDTO bookmarkCounts;

    public static UserDataMergeResultDTO of(int completedUnitCount, LastPositionDTO lastPosition,
                                            BookmarkCountsDTO bookmarkCounts) {
        return UserDataMergeResultDTO.builder()
                .completedUnitCount(completedUnitCount)
                .lastPosition(lastPosition)
                .bookmarkCounts(bookmarkCounts)
                .build();
    }
}
