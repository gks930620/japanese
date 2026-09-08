package com.test.test.common.exception;

import org.springframework.http.HttpStatus;

/**
 * 계정 도메인의 규칙 위반 (설계/04 §1-2).
 *
 * <p>비밀번호 변경의 400을 <b>세 코드로 쪼갠 이유</b>: 셋은 화면 동작이 다르다
 * (어느 칸 아래에 문구가 붙는가 / 어느 칸을 비우는가). 하나로 뭉치면 프론트가 {@code message} 문자열을
 * 비교하게 되는데, message는 로그성 문구라 분기 근거가 될 수 없다(설계/04 §1-1).</p>
 */
public class AccountRuleException extends BusinessException {

    private AccountRuleException(String message, HttpStatus status, String errorCode) {
        super(message, status, errorCode);
    }

    /** 현재 비밀번호 불일치 (비밀번호 변경 AC-A-22 · 탈퇴 AC-A-33) — 화면은 그 칸만 비운다 */
    public static AccountRuleException passwordMismatch() {
        return new AccountRuleException("현재 비밀번호가 일치하지 않습니다.", HttpStatus.BAD_REQUEST,
                "PASSWORD_MISMATCH");
    }

    /** 새 비밀번호 != 확인 (AC-A-23) */
    public static AccountRuleException newPasswordConfirmMismatch() {
        return new AccountRuleException("새 비밀번호가 서로 일치하지 않습니다.", HttpStatus.BAD_REQUEST,
                "NEW_PASSWORD_CONFIRM_MISMATCH");
    }

    /** 새 비밀번호 == 현재 비밀번호 (AC-A-25) */
    public static AccountRuleException newPasswordSameAsCurrent() {
        return new AccountRuleException("현재 비밀번호와 다른 비밀번호를 입력해 주세요.", HttpStatus.BAD_REQUEST,
                "NEW_PASSWORD_SAME_AS_CURRENT");
    }

    /** 소셜 계정은 비밀번호가 없다 (AC-A-17) — 화면이 메뉴를 숨기는 것과 같은 출처에서 서버도 막는다 */
    public static AccountRuleException passwordNotSupported() {
        return new AccountRuleException("소셜 로그인 계정은 비밀번호를 변경할 수 없습니다.", HttpStatus.FORBIDDEN,
                "PASSWORD_NOT_SUPPORTED");
    }

    /** 탈퇴 확인 문구 불일치 (설계/04 §4-1) */
    public static AccountRuleException confirmTextMismatch() {
        return new AccountRuleException("확인 문구가 일치하지 않습니다.", HttpStatus.BAD_REQUEST,
                "CONFIRM_TEXT_MISMATCH");
    }
}
