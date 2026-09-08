package com.test.test.library;

import com.test.test.common.dto.ApiResponse;
import com.test.test.course.CourseLanguage;
import com.test.test.library.dto.LibraryPageResponse;
import com.test.test.library.dto.VocabularyEntryDTO;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

/**
 * 어휘 자료실 API (설계 §4-B-5) — 목록 1개(상세 화면 없음), 인증 불필요(permitAll).
 */
@RestController
@RequestMapping("/api/library/vocabulary")
@RequiredArgsConstructor
public class LibraryVocabularyController {

    private final LibraryVocabularyService libraryVocabularyService;

    @GetMapping
    public ResponseEntity<ApiResponse<LibraryPageResponse<VocabularyEntryDTO>>> getVocabularyList(
            @RequestParam(required = false) Integer page,
            @RequestParam(required = false) Integer size,
            @RequestParam(required = false) String q,
            @RequestParam(required = false) String level,
            @RequestParam(required = false) String pos,
            @RequestParam(required = false) String ids,
            @RequestParam(required = false) String sort) {

        LibraryPageResponse<VocabularyEntryDTO> vocabularyPage =
                libraryVocabularyService.getVocabularyList(page, size, q, level, pos, ids, sort, CourseLanguage.JA);
        return ResponseEntity.ok(ApiResponse.success("Vocabulary list fetched", vocabularyPage));
    }
}
