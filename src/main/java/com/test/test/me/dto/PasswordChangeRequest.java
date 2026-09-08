package com.test.test.me.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.Getter;
import lombok.Setter;

/** 비밀번호 변경 요청 (설계/04 §4-1) — newPassword 길이 기준은 가입과 같다(4~100자) */
@Getter
@Setter
public class PasswordChangeRequest {

    @NotBlank(message = "현재 비밀번호는 필수입니다")
    private String currentPassword;

    @NotBlank(message = "새 비밀번호는 필수입니다")
    @Size(min = 4, max = 100, message = "비밀번호는 4자 이상이어야 합니다")
    private String newPassword;

    @NotBlank(message = "새 비밀번호 확인은 필수입니다")
    private String newPasswordConfirm;
}
