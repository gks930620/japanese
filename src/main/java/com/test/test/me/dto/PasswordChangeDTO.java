package com.test.test.me.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;

/**
 * 비밀번호 변경 결과 (설계/04 §4-1).
 *
 * <p>토큰 두 값은 <b>앱(Authorization: Bearer)</b> 경로에서만 채워지고 웹(쿠키)에서는 null이다 —
 * 분기 기준은 /api/tokens/refresh와 완전히 같다. @JsonInclude를 걸지 않는다: 두 필드는 항상 내려간다
 * (설계/04 §1-3 — 프론트가 필드 유무로 분기하지 않는다).</p>
 */
@Getter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class PasswordChangeDTO {

    private Boolean changed;
    private String accessToken;
    private String refreshToken;

    /** 앱 경로 — 새 토큰 쌍을 바디로 돌려준다(현재 기기는 로그인이 유지된다 — AC-A-27) */
    public static PasswordChangeDTO withTokens(String accessToken, String refreshToken) {
        return PasswordChangeDTO.builder()
                .changed(true)
                .accessToken(accessToken)
                .refreshToken(refreshToken)
                .build();
    }

    /** 웹 경로 — 새 토큰은 Set-Cookie로 심었으므로 바디에는 싣지 않는다 */
    public static PasswordChangeDTO changedWithCookies() {
        return PasswordChangeDTO.builder().changed(true).build();
    }
}
