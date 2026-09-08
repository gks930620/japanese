package com.test.test.library;

import com.test.test.common.dto.ApiResponse;
import com.test.test.course.CourseLanguage;
import com.test.test.library.dto.GrammarDetailDTO;
import com.test.test.library.dto.GrammarListItemDTO;
import com.test.test.library.dto.LibraryPageResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

/**
 * 문법 자료실 API (설계 §4-B-3·§4-B-4) — GET 2개, 인증 불필요(permitAll).
 */
@RestController
@RequestMapping("/api/library/grammar")
@RequiredArgsConstructor
public class LibraryGrammarController {

    private final LibraryGrammarService libraryGrammarService;

    @GetMapping
    public ResponseEntity<ApiResponse<LibraryPageResponse<GrammarListItemDTO>>> getGrammarList(
            @RequestParam(required = false) Integer page,
            @RequestParam(required = false) Integer size,
            @RequestParam(required = false) String q,
            @RequestParam(required = false) String level,
            @RequestParam(required = false) Boolean hasRules,
            @RequestParam(required = false) String ids,
            @RequestParam(required = false) String sort) {

        LibraryPageResponse<GrammarListItemDTO> grammarPage =
                libraryGrammarService.getGrammarList(page, size, q, level, hasRules, ids, sort, CourseLanguage.JA);
        return ResponseEntity.ok(ApiResponse.success("Grammar list fetched", grammarPage));
    }

    @GetMapping("/{grammarId}")
    public ResponseEntity<ApiResponse<GrammarDetailDTO>> getGrammarDetail(@PathVariable Long grammarId) {
        GrammarDetailDTO grammar = libraryGrammarService.getGrammarDetail(grammarId, CourseLanguage.JA);
        return ResponseEntity.ok(ApiResponse.success("Grammar fetched", grammar));
    }
}
