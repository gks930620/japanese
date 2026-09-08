package com.test.test.progress.dto;

import jakarta.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

/**
 * 완료 켜기/끄기 요청 (설계/04 §6-3)
 * POST/DELETE 한 쌍이 아니라 PUT 하나에 불리언을 둔다 — 화면 동작이 토글 하나이고 멱등성도 명확하다.
 */
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
public class UnitCompletionRequest {

    @NotNull(message = "completed는 필수입니다.")
    private Boolean completed;
}
