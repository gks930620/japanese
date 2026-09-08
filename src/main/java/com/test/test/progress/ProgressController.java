package com.test.test.progress;

import com.test.test.common.dto.ApiResponse;
import com.test.test.jwt.model.CustomUserAccount;
import com.test.test.progress.dto.LastPositionDTO;
import com.test.test.progress.dto.LastPositionSaveRequest;
import com.test.test.progress.dto.ProgressClearDTO;
import com.test.test.progress.dto.ProgressDTO;
import com.test.test.progress.dto.UnitCompletionDTO;
import com.test.test.progress.dto.UnitCompletionRequest;
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
import org.springframework.web.bind.annotation.RestController;

/**
 * 진도 API (설계/04 §6-3) — 4개 전부 <b>인증 필요</b>(결정기록 B-8, SecurityConfig에 명시).
 * 사용자는 토큰에서 꺼낸다 — 클라이언트가 준 id로 남의 기록을 건드릴 수 없다(컨벤션 §4-1).
 */
@RestController
@RequestMapping("/api/progress")
@RequiredArgsConstructor
public class ProgressController {

    private final ProgressService progressService;

    @GetMapping
    public ResponseEntity<ApiResponse<ProgressDTO>> getProgress(
            @AuthenticationPrincipal CustomUserAccount userAccount) {

        ProgressDTO progress = progressService.getProgress(userAccount.getUserDTO().getId());
        return ResponseEntity.ok(ApiResponse.success("Progress fetched", progress));
    }

    @PutMapping("/last-position")
    public ResponseEntity<ApiResponse<LastPositionDTO>> saveLastPosition(
            @Valid @RequestBody LastPositionSaveRequest request,
            @AuthenticationPrincipal CustomUserAccount userAccount) {

        LastPositionDTO lastPosition = progressService.saveLastPosition(userAccount.getUserDTO().getId(), request);
        return ResponseEntity.ok(ApiResponse.success("Last position saved", lastPosition));
    }

    @PutMapping("/units/{courseId}/{unitNo}/completion")
    public ResponseEntity<ApiResponse<UnitCompletionDTO>> setUnitCompletion(
            @PathVariable Long courseId,
            @PathVariable Integer unitNo,
            @Valid @RequestBody UnitCompletionRequest request,
            @AuthenticationPrincipal CustomUserAccount userAccount) {

        UnitCompletionDTO completion = progressService.setUnitCompleted(
                userAccount.getUserDTO().getId(), courseId, unitNo, request.getCompleted());
        return ResponseEntity.ok(ApiResponse.success("Unit completion saved", completion));
    }

    @DeleteMapping
    public ResponseEntity<ApiResponse<ProgressClearDTO>> clearProgress(
            @AuthenticationPrincipal CustomUserAccount userAccount) {

        ProgressClearDTO cleared = progressService.clearProgress(userAccount.getUserDTO().getId());
        return ResponseEntity.ok(ApiResponse.success("Progress cleared", cleared));
    }
}
