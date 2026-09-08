package com.test.test.progress.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;
import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

/**
 * 마지막 위치 저장 요청 (설계/04 §6-3)
 *
 * <p>{@code stepKey}는 서버가 스텝 구성을 알 수 없으므로 <b>형식만</b> 본다(설계/04 §6-2):
 * 1~40자, {@code ^[a-z]+(-[0-9]{1,2})?$} — {@code grammar-0} {@code dialog} {@code summary} 등.
 * {@code updatedAt}은 받지 않는다 — 서버 시각이 기준이다.</p>
 */
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
public class LastPositionSaveRequest {

    /** 스텝 식별자 형식 (설계/04 §6-2) — 프론트·병합 payload와 같은 규칙을 쓴다 */
    public static final String STEP_KEY_PATTERN = "^[a-z]+(-[0-9]{1,2})?$";

    @NotNull(message = "courseId는 필수입니다.")
    private Long courseId;

    @NotNull(message = "unitNo는 필수입니다.")
    private Integer unitNo;

    @NotBlank(message = "stepKey는 필수입니다.")
    @Size(max = 40, message = "stepKey는 40자 이하여야 합니다.")
    @Pattern(regexp = STEP_KEY_PATTERN, message = "stepKey 형식이 올바르지 않습니다.")
    private String stepKey;
}
