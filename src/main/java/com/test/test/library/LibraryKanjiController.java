package com.test.test.library;

import com.test.test.common.dto.ApiResponse;
import com.test.test.library.dto.KanjiDetailDTO;
import com.test.test.library.dto.KanjiListItemDTO;
import com.test.test.library.dto.LibraryPageResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

/**
 * 한자 자료실 API (설계 §4-B-1·§4-B-2) — GET 2개, 인증 불필요(permitAll).
 * {@code ids}·{@code sort}(설계/04 §6-7)는 콘텐츠 필터라 공개 경로에 있어도 결정기록 B-8을 어기지 않는다.
 */
@RestController
@RequestMapping("/api/library/kanji")
@RequiredArgsConstructor
public class LibraryKanjiController {

    private final LibraryKanjiService libraryKanjiService;

    @GetMapping
    public ResponseEntity<ApiResponse<LibraryPageResponse<KanjiListItemDTO>>> getKanjiList(
            @RequestParam(required = false) Integer page,
            @RequestParam(required = false) Integer size,
            @RequestParam(required = false) String q,
            @RequestParam(required = false) String level,
            @RequestParam(required = false) String ids,
            @RequestParam(required = false) String sort) {

        LibraryPageResponse<KanjiListItemDTO> kanjiPage =
                libraryKanjiService.getKanjiList(page, size, q, level, ids, sort);
        return ResponseEntity.ok(ApiResponse.success("Kanji list fetched", kanjiPage));
    }

    @GetMapping("/{kanjiId}")
    public ResponseEntity<ApiResponse<KanjiDetailDTO>> getKanjiDetail(@PathVariable Long kanjiId) {
        KanjiDetailDTO kanji = libraryKanjiService.getKanjiDetail(kanjiId);
        return ResponseEntity.ok(ApiResponse.success("Kanji fetched", kanji));
    }
}
