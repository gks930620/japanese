package com.test.test.english;

import com.test.test.common.dto.ApiResponse;
import com.test.test.course.CourseLanguage;
import com.test.test.library.LibraryExpressionService;
import com.test.test.library.dto.ExpressionDetailDTO;
import com.test.test.library.dto.ExpressionListItemDTO;
import com.test.test.library.dto.LibraryPageResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

/**
 * 영어 표현 자료실 API (설계/04 §8-2 — 3탭 중 기본 탭) — GET 2개, 인증 불필요(permitAll).
 * 일본어의 한자 탭 자리이며, <b>영어에는 한자 탭이 없다</b>({@code /api/en/library/kanji}는 미매핑 404).
 */
@RestController
@RequestMapping("/api/en/library/expressions")
@RequiredArgsConstructor
public class EnLibraryExpressionController {

    private final LibraryExpressionService libraryExpressionService;

    @GetMapping
    public ResponseEntity<ApiResponse<LibraryPageResponse<ExpressionListItemDTO>>> getExpressionList(
            @RequestParam(required = false) Integer page,
            @RequestParam(required = false) Integer size,
            @RequestParam(required = false) String q,
            @RequestParam(required = false) String level,
            @RequestParam(required = false) String ids,
            @RequestParam(required = false) String sort) {

        LibraryPageResponse<ExpressionListItemDTO> expressionPage = libraryExpressionService
                .getExpressionList(page, size, q, level, ids, sort, CourseLanguage.EN);
        return ResponseEntity.ok(ApiResponse.success("Expression list fetched", expressionPage));
    }

    @GetMapping("/{expressionId}")
    public ResponseEntity<ApiResponse<ExpressionDetailDTO>> getExpressionDetail(@PathVariable Long expressionId) {
        ExpressionDetailDTO expression =
                libraryExpressionService.getExpressionDetail(expressionId, CourseLanguage.EN);
        return ResponseEntity.ok(ApiResponse.success("Expression fetched", expression));
    }
}
