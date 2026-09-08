package com.test.test.bookmark.dto;

import jakarta.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

/** 담기/빼기 요청 (설계/04 §6-4) — 화면 동작이 토글 하나라 PUT + 불리언이다 */
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
public class BookmarkToggleRequest {

    @NotNull(message = "bookmarked는 필수입니다.")
    private Boolean bookmarked;
}
