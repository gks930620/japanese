package com.test.test.english;

import com.test.test.common.dto.ApiResponse;
import com.test.test.course.CourseLanguage;
import com.test.test.library.LibraryGrammarService;
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
 * 영어 문법 자료실 API (설계/04 §8-2) — <b>일본어 서비스를 그대로 쓴다</b>(복제 금지 — 설계/04 §8).
 * 이 클래스가 하는 일은 "언어를 EN으로 고정해 넘기는 것"뿐이고, 그것이 경로를 가른 이유다(판정 J-7).
 */
@RestController
@RequestMapping("/api/en/library/grammar")
@RequiredArgsConstructor
public class EnLibraryGrammarController {

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
                libraryGrammarService.getGrammarList(page, size, q, level, hasRules, ids, sort, CourseLanguage.EN);
        return ResponseEntity.ok(ApiResponse.success("Grammar list fetched", grammarPage));
    }

    @GetMapping("/{grammarId}")
    public ResponseEntity<ApiResponse<GrammarDetailDTO>> getGrammarDetail(@PathVariable Long grammarId) {
        GrammarDetailDTO grammar = libraryGrammarService.getGrammarDetail(grammarId, CourseLanguage.EN);
        return ResponseEntity.ok(ApiResponse.success("Grammar fetched", grammar));
    }
}
