package com.test.test.bookmark;

import com.test.test.bookmark.dto.BookmarkClearDTO;
import com.test.test.bookmark.dto.BookmarkCountsDTO;
import com.test.test.bookmark.dto.BookmarkIdsDTO;
import com.test.test.bookmark.dto.BookmarkToggleDTO;
import com.test.test.bookmark.dto.BookmarkToggleRequest;
import com.test.test.common.dto.ApiResponse;
import com.test.test.jwt.model.CustomUserAccount;
import com.test.test.library.dto.LibraryPageResponse;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

/**
 * 보관함 API (설계/04 §6-4) — 5개 전부 <b>인증 필요</b>(결정기록 B-8).
 *
 * <p>{@code {type}}은 경로에서 소문자(자료실 경로와 맞춘다), 응답 바디의 {@code type}은 대문자 enum 코드다.
 * 모르는 종류는 404 — 존재하지 않는 주소이기 때문이다(BookmarkType.fromPath).</p>
 */
@RestController
@RequestMapping("/api/bookmarks")
@RequiredArgsConstructor
public class BookmarkController {

    private final BookmarkService bookmarkService;

    @GetMapping("/summary")
    public ResponseEntity<ApiResponse<BookmarkCountsDTO>> getSummary(
            @AuthenticationPrincipal CustomUserAccount userAccount) {

        BookmarkCountsDTO counts = bookmarkService.getCounts(userAccount.getUserDTO().getId());
        return ResponseEntity.ok(ApiResponse.success("Bookmark summary fetched", counts));
    }

    @GetMapping("/ids")
    public ResponseEntity<ApiResponse<BookmarkIdsDTO>> getIds(
            @AuthenticationPrincipal CustomUserAccount userAccount) {

        BookmarkIdsDTO ids = bookmarkService.getIds(userAccount.getUserDTO().getId());
        return ResponseEntity.ok(ApiResponse.success("Bookmark ids fetched", ids));
    }

    @GetMapping("/{type}")
    public ResponseEntity<ApiResponse<LibraryPageResponse<?>>> getList(
            @PathVariable String type,
            @RequestParam(required = false) Integer page,
            @RequestParam(required = false) Integer size,
            @RequestParam(required = false) String q,
            @RequestParam(required = false) String level,
            @RequestParam(required = false) String sort,
            @AuthenticationPrincipal CustomUserAccount userAccount) {

        LibraryPageResponse<?> bookmarkPage = bookmarkService.getList(
                userAccount.getUserDTO().getId(), BookmarkType.fromPath(type), page, size, q, level, sort);
        return ResponseEntity.ok(ApiResponse.success("Bookmark list fetched", bookmarkPage));
    }

    @PutMapping("/{type}/{targetId}")
    public ResponseEntity<ApiResponse<BookmarkToggleDTO>> setBookmark(
            @PathVariable String type,
            @PathVariable Long targetId,
            @Valid @RequestBody BookmarkToggleRequest request,
            @AuthenticationPrincipal CustomUserAccount userAccount) {

        BookmarkToggleDTO bookmark = bookmarkService.setBookmark(userAccount.getUserDTO().getId(),
                BookmarkType.fromPath(type), targetId, request.getBookmarked());
        return ResponseEntity.ok(ApiResponse.success("Bookmark saved", bookmark));
    }

    @DeleteMapping("/{type}")
    public ResponseEntity<ApiResponse<BookmarkClearDTO>> clear(
            @PathVariable String type,
            @AuthenticationPrincipal CustomUserAccount userAccount) {

        BookmarkClearDTO cleared = bookmarkService.clear(
                userAccount.getUserDTO().getId(), BookmarkType.fromPath(type));
        return ResponseEntity.ok(ApiResponse.success("Bookmarks cleared", cleared));
    }
}
