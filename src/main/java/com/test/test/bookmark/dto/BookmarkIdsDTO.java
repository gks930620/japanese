package com.test.test.bookmark.dto;

import java.util.List;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;

/**
 * ★ 표시용 id 집합 (설계/04 §6-4)
 *
 * <p>자료실 목록·상세와 유닛 학습의 ★/☆ 판정이 이 집합 하나로 끝난다 —
 * 공개 콘텐츠 응답에 {@code bookmarked} 필드를 넣으면 "콘텐츠(공개)/사용자 상태(인증)"의 경계가
 * 응답 본문에서 무너진다(결정기록 B-8). 비로그인은 localStorage에서 같은 모양의 집합을 얻는다.</p>
 *
 * <p>어휘는 <b>표제어 대표 id</b>만 담긴다. 세 키는 항상 존재하고, 없으면 빈 배열이다(B-5).</p>
 */
@Getter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class BookmarkIdsDTO {

    private List<Long> kanji;
    private List<Long> grammar;
    private List<Long> vocabulary;

    public static BookmarkIdsDTO of(List<Long> kanji, List<Long> grammar, List<Long> vocabulary) {
        return BookmarkIdsDTO.builder()
                .kanji(kanji)
                .grammar(grammar)
                .vocabulary(vocabulary)
                .build();
    }
}
