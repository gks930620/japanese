package com.test.test.editor;

import com.test.test.common.dto.ApiResponse;
import com.test.test.editor.dto.DialogUpdateRequest;
import com.test.test.editor.dto.EditorDialogDTO;
import com.test.test.editor.dto.EditorGrammarDTO;
import com.test.test.editor.dto.EditorKanjiDTO;
import com.test.test.editor.dto.EditorStatusDTO;
import com.test.test.editor.dto.EditorVocabularyDTO;
import com.test.test.editor.dto.GrammarUpdateRequest;
import com.test.test.editor.dto.KanjiUpdateRequest;
import com.test.test.editor.dto.VocabularyUpdateRequest;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/**
 * 관리자 편집 API (설계/04 §9) — <b>환경 플래그로 빈 자체가 조건 등록</b>된다.
 *
 * <p>꺼진 환경(기본값·운영)에서는 이 컨트롤러가 존재하지 않아 {@code /api/editor/**}가 전부
 * <b>미매핑 404</b>다 — 다른 없는 주소와 구별할 수 없어 "흔적이 없다"(A1·C4·A14)가 코드 구조로 성립한다.
 * 403/401로 막는 방식은 경로의 존재를 노출하므로 쓰지 않는다.</p>
 *
 * <p><b>전부 로그인 불요</b>(설계/04 §9 사용자 확정 — 켜고 끄는 기준은 역할이 아니라 실행 환경이다).
 * B-9(비인증 쓰기 금지)의 의도된 예외 — prod에서는 {@code RailwayDeploymentValidator}가
 * enabled=true 기동 자체를 거부해 운영 유입이 막힌다.</p>
 */
@RestController
@RequestMapping("/api/editor")
@RequiredArgsConstructor
@ConditionalOnProperty(name = "app.editor.enabled", havingValue = "true")
public class EditorController {

    private final EditorService editorService;

    /** 프론트의 유일한 판단 근거 — 200이면 켜짐, 404/실패면 꺼짐(UI 흔적 0) */
    @GetMapping("/status")
    public ResponseEntity<ApiResponse<EditorStatusDTO>> getStatus() {
        return ResponseEntity.ok(ApiResponse.success("Editor enabled", EditorStatusDTO.enabled()));
    }

    @PutMapping("/kanji/{kanjiId}")
    public ResponseEntity<ApiResponse<EditorKanjiDTO>> updateKanji(
            @PathVariable Long kanjiId, @Valid @RequestBody KanjiUpdateRequest request) {
        return ResponseEntity.ok(ApiResponse.success("Kanji updated",
                editorService.updateKanji(kanjiId, request)));
    }

    @PutMapping("/grammar/{grammarId}")
    public ResponseEntity<ApiResponse<EditorGrammarDTO>> updateGrammar(
            @PathVariable Long grammarId, @Valid @RequestBody GrammarUpdateRequest request) {
        return ResponseEntity.ok(ApiResponse.success("Grammar updated",
                editorService.updateGrammar(grammarId, request)));
    }

    @PutMapping("/vocabulary/{vocabularyId}")
    public ResponseEntity<ApiResponse<EditorVocabularyDTO>> updateVocabulary(
            @PathVariable Long vocabularyId, @Valid @RequestBody VocabularyUpdateRequest request) {
        return ResponseEntity.ok(ApiResponse.success("Vocabulary updated",
                editorService.updateVocabulary(vocabularyId, request)));
    }

    @PutMapping("/dialogs/{dialogId}")
    public ResponseEntity<ApiResponse<EditorDialogDTO>> updateDialog(
            @PathVariable Long dialogId, @Valid @RequestBody DialogUpdateRequest request) {
        return ResponseEntity.ok(ApiResponse.success("Dialog updated",
                editorService.updateDialog(dialogId, request)));
    }
}
