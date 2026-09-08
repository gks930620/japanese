package com.test.test.me;

import com.test.test.common.dto.ApiResponse;
import com.test.test.jwt.model.CustomUserAccount;
import com.test.test.me.dto.AccountDTO;
import com.test.test.me.dto.PasswordChangeDTO;
import com.test.test.me.dto.PasswordChangeRequest;
import com.test.test.me.dto.ProfileUpdateRequest;
import com.test.test.me.dto.WithdrawalDTO;
import com.test.test.me.dto.WithdrawalPreviewDTO;
import com.test.test.me.dto.WithdrawalRequest;
import jakarta.servlet.http.HttpServletResponse;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.ResponseCookie;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/**
 * 계정 API (설계/04 §4-1) — 전부 <b>인증 필요</b>이고 경로는 전부 {@code /api/me/**}다(결정기록 B-8).
 *
 * <p>{@code /api/users/me}는 손대지 않는다 — 그것은 헤더·인증 상태를 그리는 경량 <b>신원</b> 조회다.
 * 계정 화면군이 필요로 하는 것은 신원이 아니라 <b>권한</b>(무엇이 되고 무엇이 안 되는가)이라 따로 둔다.</p>
 *
 * <p>컨트롤러가 하는 일은 HTTP 경계 처리뿐이다 — 쿠키 심기·만료가 그것이고, 규칙 판정은 서비스에 있다.</p>
 */
@RestController
@RequestMapping("/api/me")
@RequiredArgsConstructor
public class AccountController {

    private final AccountService accountService;

    @Value("${app.cookie.secure:false}")
    private boolean secureCookie;

    @GetMapping("/account")
    public ResponseEntity<ApiResponse<AccountDTO>> getAccount(
            @AuthenticationPrincipal CustomUserAccount userAccount) {
        return ResponseEntity.ok(ApiResponse.success("Account fetched",
                accountService.getAccount(userId(userAccount))));
    }

    @PutMapping("/profile")
    public ResponseEntity<ApiResponse<AccountDTO>> updateProfile(
            @Valid @RequestBody ProfileUpdateRequest request,
            @AuthenticationPrincipal CustomUserAccount userAccount) {
        return ResponseEntity.ok(ApiResponse.success("Profile updated",
                accountService.updateProfile(userId(userAccount), request)));
    }

    /**
     * 비밀번호 변경 — 웹(쿠키)과 앱(Bearer)의 분기는 {@code /api/tokens/refresh}와 <b>완전히 같다</b>.
     * 웹은 새 토큰을 Set-Cookie로 심고 바디에는 null을 보낸다(토큰을 JS가 읽을 수 있는 곳에 두지 않는다).
     */
    @PutMapping("/password")
    public ResponseEntity<ApiResponse<PasswordChangeDTO>> changePassword(
            @Valid @RequestBody PasswordChangeRequest request,
            @RequestHeader(value = "Authorization", required = false) String authHeader,
            @AuthenticationPrincipal CustomUserAccount userAccount,
            HttpServletResponse response) {

        PasswordChangeDTO changed = accountService.changePassword(userId(userAccount), request);
        if (isAppRequest(authHeader)) {
            return ResponseEntity.ok(ApiResponse.success("Password changed", changed));
        }

        setCookie(response, "access_token", changed.getAccessToken());
        setCookie(response, "refresh_token", changed.getRefreshToken());
        return ResponseEntity.ok(ApiResponse.success("Password changed", PasswordChangeDTO.changedWithCookies()));
    }

    @GetMapping("/withdrawal-preview")
    public ResponseEntity<ApiResponse<WithdrawalPreviewDTO>> getWithdrawalPreview(
            @AuthenticationPrincipal CustomUserAccount userAccount) {
        return ResponseEntity.ok(ApiResponse.success("Withdrawal preview fetched",
                accountService.getWithdrawalPreview(userId(userAccount))));
    }

    /**
     * 회원 탈퇴 — DELETE가 아니라 POST인 이유(설계/04 §4-1): ① 본인 확인 값을 반드시 실어야 하는데 DELETE 바디는
     * 프록시·클라이언트에 따라 유실될 수 있고, ② 되돌릴 수 없는 동작이 URL과 메서드만으로 실행되는 형태를 만들지 않는다.
     *
     * <p>성공하면 쿠키를 즉시 만료시킨다 — "자동 로그아웃"(AC-A-36)을 화면에 맡기지 않고 서버가 끝낸다.</p>
     */
    @PostMapping("/withdrawal")
    public ResponseEntity<ApiResponse<WithdrawalDTO>> withdraw(
            @RequestBody(required = false) WithdrawalRequest request,
            @AuthenticationPrincipal CustomUserAccount userAccount,
            HttpServletResponse response) {

        WithdrawalDTO withdrawn = accountService.withdraw(userId(userAccount),
                request == null ? new WithdrawalRequest() : request);

        expireCookie(response, "access_token");
        expireCookie(response, "refresh_token");
        return ResponseEntity.ok(ApiResponse.success("Withdrawn", withdrawn));
    }

    private boolean isAppRequest(String authHeader) {
        return authHeader != null && authHeader.startsWith("Bearer ");
    }

    private void setCookie(HttpServletResponse response, String name, String value) {
        response.addHeader("Set-Cookie", ResponseCookie.from(name, value)
                .httpOnly(true)
                .secure(secureCookie)
                .sameSite("Lax")
                .path("/")
                .build()
                .toString());
    }

    private void expireCookie(HttpServletResponse response, String name) {
        response.addHeader("Set-Cookie", ResponseCookie.from(name, "")
                .httpOnly(true)
                .secure(secureCookie)
                .sameSite("Lax")
                .path("/")
                .maxAge(0)
                .build()
                .toString());
    }

    private Long userId(CustomUserAccount userAccount) {
        return userAccount.getUserDTO().getId();
    }
}
