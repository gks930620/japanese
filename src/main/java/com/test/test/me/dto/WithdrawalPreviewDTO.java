package com.test.test.me.dto;

import com.test.test.bookmark.dto.BookmarkCountsDTO;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;

/**
 * 탈퇴 화면이 보여줄 <b>실제 숫자</b> (설계/04 §4-1).
 *
 * <p>보관 개수는 GET /api/bookmarks/summary와 <b>같은 DTO</b>를 재사용한다 —
 * 같은 사실을 두 모양으로 두면 곧 갈린다.</p>
 *
 * <p>확인 문구("탈퇴합니다")는 <b>싣지 않는다</b>: 서버가 문구를 내려주면 문구의 주인이 designer가 아니라
 * 서버가 된다. 계약 상수로 못 박고, 서버는 검증만 한다.</p>
 */
@Getter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class WithdrawalPreviewDTO {

    /** 지금 존재하는 유닛만 센다(설계/03 §4-1 읽기 시점 필터) */
    private Integer completedUnitCount;
    private BookmarkCountsDTO bookmarkCounts;
    /** 삭제되지 않은 내 글 수 */
    private Integer communityCount;
    private Integer commentCount;
    /** "PASSWORD"(로컬) | "TEXT"(소셜) — 화면이 어떤 입력칸을 그릴지 정하는 근거(AC-A-18) */
    private String confirmationType;

    public static WithdrawalPreviewDTO of(int completedUnitCount, BookmarkCountsDTO bookmarkCounts,
                                          long communityCount, long commentCount, boolean social) {
        return WithdrawalPreviewDTO.builder()
                .completedUnitCount(completedUnitCount)
                .bookmarkCounts(bookmarkCounts)
                .communityCount((int) communityCount)
                .commentCount((int) commentCount)
                .confirmationType(social ? "TEXT" : "PASSWORD")
                .build();
    }
}
