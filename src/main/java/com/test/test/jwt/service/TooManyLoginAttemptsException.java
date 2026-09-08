package com.test.test.jwt.service;

import org.springframework.security.core.AuthenticationException;

/**
 * 로그인 시도 제한에 걸렸다 (판정 2026-08-25 B-1) — 429 {@code TOO_MANY_LOGIN_ATTEMPTS}.
 *
 * <p>{@link AuthenticationException}을 상속하는 이유: 로그인은 {@code UsernamePasswordAuthenticationFilter}가
 * 처리하므로 {@code GlobalExceptionHandler}(DispatcherServlet 아래)까지 오지 않는다. 필터의 실패 경로로
 * 흘려보내야 하고, 그 경로가 받는 타입이 이것이다.</p>
 *
 * <p>"비밀번호가 틀렸다"({@code AUTHENTICATION_FAILED})와 <b>구분</b>한다 — 사용자는 지금 자기가
 * 틀린 것인지 잠긴 것인지 알아야 다음 행동을 정할 수 있다.</p>
 */
public class TooManyLoginAttemptsException extends AuthenticationException {

    public TooManyLoginAttemptsException(long windowMinutes) {
        super("로그인 시도가 너무 많습니다. " + windowMinutes + "분 뒤에 다시 시도해 주세요.");
    }
}
