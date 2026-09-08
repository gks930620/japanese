package com.test.test.jwt.filter;

import com.test.test.jwt.JwtUtil;
import com.test.test.jwt.model.CustomUserAccount;
import com.test.test.jwt.service.LoginAttemptGuard;
import com.test.test.jwt.service.RefreshService;
import com.test.test.jwt.service.TooManyLoginAttemptsException;
import com.fasterxml.jackson.databind.ObjectMapper;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import java.io.IOException;
import java.util.Map;
import org.springframework.http.ResponseCookie;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.AuthenticationServiceException;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.AuthenticationException;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;



//  /login URL일 때 동작  , oauth2로그인이랑은 상관없음!
public class JwtLoginFilter extends UsernamePasswordAuthenticationFilter {

    private static final ObjectMapper OBJECT_MAPPER = new ObjectMapper();

    /** 실패 응답에서 다시 꺼내 쓰기 위한 요청 속성 키 — 요청 본문은 한 번만 읽힌다 */
    private static final String ATTEMPTED_USERNAME = "LOGIN_ATTEMPTED_USERNAME";

    private final AuthenticationManager authenticationManager;
    private final JwtUtil jwtUtil;
    private final RefreshService refreshService;
    private final LoginAttemptGuard loginAttemptGuard;
    private final boolean secureCookie;

    public JwtLoginFilter(AuthenticationManager authenticationManager, JwtUtil jwtUtil, RefreshService refreshService,
                          LoginAttemptGuard loginAttemptGuard, String loginProcessingUrl, boolean secureCookie) {
        this.authenticationManager = authenticationManager;
        this.jwtUtil = jwtUtil;
        this.refreshService = refreshService;
        this.loginAttemptGuard = loginAttemptGuard;
        this.secureCookie = secureCookie;
        setFilterProcessesUrl(loginProcessingUrl);
    }
    // 로그인 시도
    @Override
    public Authentication attemptAuthentication(HttpServletRequest request, HttpServletResponse response) throws AuthenticationException {
        try {
            // 요청에서 username, password 추출
            // jwt는 API서버 분리된방식.  username,password는  body에 포함되서 옴.
            // 파라미터에 포함되서 오지않음 보통.  이것때문에 재정의. UsernamePasswordAuthetnctionFilter는 parameter 를 처리함.
            Map<String, String> credentials = OBJECT_MAPPER.readValue(request.getInputStream(), new com.fasterxml.jackson.core.type.TypeReference<Map<String, String>>() {});
            String username = credentials.get("username");
            String password = credentials.get("password");

            // 시도 제한(판정 B-1) — <b>비밀번호 대조 전에</b> 본다.
            // 대조 후에 보면 "맞으면 통과"가 되어 제한이 아니게 된다.
            // username을 요청에 남겨 두는 이유: 실패 응답 경로(unsuccessfulAuthentication)는 본문을 다시 읽을 수 없다.
            request.setAttribute(ATTEMPTED_USERNAME, username);
            loginAttemptGuard.requireNotBlocked(username);


            //이 부분은 UsernamePasswordAuthetnctionFilter 코드 그대로.
            // AuthenticationManger를 통해 확인하는건
            // 결국 username,password를 가지고 CustomUserDetailsService의 return값(CustomUserAccount)이랑 비교.
            UsernamePasswordAuthenticationToken authRequest = UsernamePasswordAuthenticationToken.unauthenticated(username, password);
            this.setDetails(request, authRequest);
            return authenticationManager.authenticate(authRequest);  //여기서 AuthenticationException 발생.
        } catch (IOException e) {
            // 잘못된/깨진 JSON 본문은 클라이언트 입력 오류 → AuthenticationException으로 던져
            // unsuccessfulAuthentication에서 401로 응답(기존엔 RuntimeException이라 500으로 샜음).
            throw new AuthenticationServiceException("Failed to parse authentication request", e);
        }

    }

    // 로그인 성공 → JWT 토큰 발급
    @Override
    protected void successfulAuthentication(HttpServletRequest request, HttpServletResponse response, FilterChain chain, Authentication authResult) throws IOException, ServletException {
        CustomUserAccount customUserAccount = (CustomUserAccount) authResult.getPrincipal();
        String username = customUserAccount.getUsername();

        // 성공하면 연속 실패 카운터를 지운다(판정 B-1) — 오타를 낸 사용자가 다음 로그인부터 정상으로 돌아와야 한다
        loginAttemptGuard.recordSuccess(username);

        // 1. 토큰 생성
        // tv 클레임에 현재 토큰 버전을 실는다 — 비밀번호 변경·탈퇴가 이 값을 올려 옛 토큰을 죽인다(설계/03 §4)
        String accessToken = jwtUtil.createAccessToken(username, customUserAccount.getUserDTO().getTokenVersion());
        String refreshToken = jwtUtil.createRefreshToken(username);

        // 2. Refresh 토큰 저장 (DB)
        refreshService.saveRefresh(refreshToken);

        // 3. 응답 분기 처리 (웹/앱)
        String accept = request.getHeader("Accept");
        boolean isBrowser = accept != null && accept.contains("text/html");

        if (isBrowser) {
            // ✅ 웹: 쿠키 설정 + 성공 응답
            // 브라우저 종료 시 로그아웃 되도록 세션 쿠키(-1)로 설정
            // (브라우저가 켜져있는 동안의 보안은 JWT 토큰 자체의 만료 시간으로 검증됨)
            addCookie(response, "access_token", accessToken, -1);
            addCookie(response, "refresh_token", refreshToken, -1);
            response.setStatus(HttpServletResponse.SC_OK);
        } else {
            // ✅ 앱: JSON 응답
            response.setContentType("application/json");
            response.setCharacterEncoding("UTF-8");
            response.getWriter().write(OBJECT_MAPPER.writeValueAsString(
                Map.of("access_token", accessToken, "refresh_token", refreshToken)
            ));
        }
    }

    private void addCookie(HttpServletResponse response, String name, String value, int maxAge) {
        ResponseCookie.ResponseCookieBuilder cookieBuilder = ResponseCookie.from(name, value)
            .httpOnly(true)
            .secure(secureCookie)  // 로컬(HTTP): false, 운영(HTTPS): true
            .sameSite("Lax")
            .path("/");

        if (maxAge > 0) {
            cookieBuilder.maxAge(maxAge);
        }

        response.addHeader("Set-Cookie", cookieBuilder.build().toString());
    }


    //로그인 시도하려고 할 때.. 즉 id pw입력한거 비교할 때
    //securityconfig의 authEntryPoin는  로그인필요한곳에 토큰없이 요청할때
    @Override
    protected void unsuccessfulAuthentication(HttpServletRequest request,
        HttpServletResponse response, AuthenticationException failed)
        throws IOException, ServletException {

        // 시도 제한(판정 B-1): "잠겼다"와 "비밀번호가 틀렸다"를 구분한다 —
        // 사용자는 지금 자기가 틀린 것인지 잠긴 것인지 알아야 다음 행동을 정할 수 있다.
        // 잠긴 요청은 실패로 세지 않는다(세면 차단이 스스로 연장돼 영영 풀리지 않는다).
        boolean blocked = failed instanceof TooManyLoginAttemptsException;
        if (!blocked) {
            loginAttemptGuard.recordFailure((String) request.getAttribute(ATTEMPTED_USERNAME));
        }

        response.setStatus(blocked ? 429 : HttpServletResponse.SC_UNAUTHORIZED);
        response.setContentType("application/json;charset=UTF-8");

        // 직접 JSON 문자열 생성 (ObjectMapper의 JavaTimeModule 미등록 이슈 회피)
        String jsonResponse = String.format(
            "{\"success\":false,\"message\":\"%s\",\"errorCode\":\"%s\",\"timestamp\":\"%s\"}",
            blocked ? failed.getMessage() : "아이디 또는 비밀번호가 일치하지 않습니다.",
            blocked ? "TOO_MANY_LOGIN_ATTEMPTS" : "AUTHENTICATION_FAILED",
            java.time.LocalDateTime.now()
        );
        response.getWriter().write(jsonResponse);
    }

}
