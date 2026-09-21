package com.test.test.me.dto;

import com.test.test.common.util.IdentityNormalizer;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.Getter;

/**
 * 회원정보 수정 요청 (설계/04 §4-1) — 검증 기준은 <b>가입과 같다</b>.
 *
 * <p>email을 "로컬만 필수"로 만들지 않은 이유: 조건부 필수는 @Valid로 표현되지 않아 400이 두 종류
 * (VALIDATION_ERROR·BUSINESS_RULE_VIOLATION)로 갈린다. 소셜 계정은 <b>값을 무시하고</b> 현재 값을 응답한다.</p>
 *
 * <p><b>trim은 바인딩(setter)에서 한다</b> — 검증은 바인딩 뒤에 돌므로 @Size가 <b>trim된 값</b>을 잰다.
 * 서비스에서 trim하면 검증(원문)과 저장(trim 후)이 다른 값을 봐서, {@code " 가 "}(공백 포함 3자)가
 * 검증을 통과해 1자 닉네임이 저장되는 구멍이 생긴다. 검증과 저장이 같은 값을 보게 하는 것이 규칙이다.</p>
 */
@Getter
public class ProfileUpdateRequest {

    @NotBlank(message = "닉네임은 필수입니다")
    @Size(min = 2, max = 20, message = "닉네임은 2~20자여야 합니다")
    private String nickname;

    @NotBlank(message = "이메일은 필수입니다")
    @Email(message = "이메일 형식이 올바르지 않습니다")
    private String email;

    public void setNickname(String nickname) {
        this.nickname = nickname == null ? null : nickname.trim();
    }

    /**
     * 이메일은 trim에 더해 <b>소문자로 정규화</b>한다 (설계/04 §4 · 08 C-24).
     *
     * <p>정규화를 바인딩에서 하면 중복 검사·비교·저장이 전부 같은 값을 본다.
     * 덕분에 "대소문자만 바꾼 내 이메일"은 §4-1의 "값이 바뀔 때만 검사"에서 <b>바뀌지 않은 것</b>이 되고,
     * 남의 이메일을 대문자로 적는 것은 그대로 409다.</p>
     */
    public void setEmail(String email) {
        this.email = IdentityNormalizer.normalize(email == null ? null : email.trim());
    }
}
