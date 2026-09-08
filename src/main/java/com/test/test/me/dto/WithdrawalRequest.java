package com.test.test.me.dto;

import lombok.Getter;
import lombok.Setter;

/**
 * 탈퇴 요청 (설계/04 §4-1) — 두 필드 모두 <b>선택</b>이다.
 *
 * <p>bean validation을 걸지 않는 이유: 로컬은 password, 소셜은 confirmText로 본인을 확인하므로
 * 무엇이 필수인지가 계정 종류에 따라 다르다. 검증은 서비스가 하고 errorCode도 그에 따라 갈린다
 * (PASSWORD_MISMATCH / CONFIRM_TEXT_MISMATCH).</p>
 *
 * <p>여기에 <b>대상 사용자를 지정하는 값이 없다</b> — 지울 대상은 언제나 토큰에서 온다(설계/04 §4-1).</p>
 */
@Getter
@Setter
public class WithdrawalRequest {

    private String password;
    private String confirmText;
}
