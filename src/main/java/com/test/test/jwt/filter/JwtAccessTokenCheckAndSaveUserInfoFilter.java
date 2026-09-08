package com.test.test.jwt.filter;

import com.test.test.jwt.JwtUtil;
import com.test.test.jwt.model.CustomUserAccount;
import io.jsonwebtoken.JwtException;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.Cookie;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import java.io.IOException;
import java.util.Arrays;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.core.userdetails.UsernameNotFoundException;
import org.springframework.security.web.authentication.WebAuthenticationDetailsSource;
import org.springframework.util.StringUtils;
import org.springframework.web.filter.OncePerRequestFilter;

@Slf4j
@RequiredArgsConstructor
public class JwtAccessTokenCheckAndSaveUserInfoFilter extends OncePerRequestFilter {

    private final JwtUtil jwtUtil;
    private final UserDetailsService userDetailsService;

    @Override
    protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response, FilterChain chain)
            throws ServletException, IOException {

        String token = getTokenFromRequest(request);
        if (token == null) {
            chain.doFilter(request, response);
            return;
        }

        try {
            String tokenType = jwtUtil.getTokenType(token);
            if ("refresh".equals(tokenType)) {
                // Refresh token can pass through to /api/tokens/refresh.
                chain.doFilter(request, response);
                return;
            }

            if (!jwtUtil.validateToken(token)) {
                request.setAttribute("ERROR_CAUSE", "TOKEN_EXPIRED");
                chain.doFilter(request, response);
                return;
            }

            String username = jwtUtil.extractUsername(token);
            UserDetails userDetails = userDetailsService.loadUserByUsername(username);

            // 토큰 버전 대조(설계/03 §4) — 비밀번호 변경·탈퇴로 users.token_version이 오르면 그 이전 토큰은 여기서 죽는다.
            // 매 요청 이미 사용자를 읽고 있으므로 추가 쿼리는 0이다.
            // TOKEN_EXPIRED로 답하는 이유: 프론트 http.js가 이 코드에서만 갱신을 시도하고, 실패하면 게스트로 강등한다.
            // 다른 코드로 답하면 "로그인된 것처럼 보이지만 아무것도 안 되는" 상태가 남는다(설계/04 §4).
            if (userDetails instanceof CustomUserAccount account
                    && jwtUtil.getTokenVersion(token) != account.getUserDTO().getTokenVersion()) {
                request.setAttribute("ERROR_CAUSE", "TOKEN_EXPIRED");
                chain.doFilter(request, response);
                return;
            }

            UsernamePasswordAuthenticationToken authenticationToken =
                    new UsernamePasswordAuthenticationToken(userDetails, null, userDetails.getAuthorities());
            authenticationToken.setDetails(new WebAuthenticationDetailsSource().buildDetails(request));
            SecurityContextHolder.getContext().setAuthentication(authenticationToken);
            chain.doFilter(request, response);
        } catch (JwtException e) {
            request.setAttribute("ERROR_CAUSE", "INVALID_TOKEN");
            chain.doFilter(request, response);
        } catch (UsernameNotFoundException e) {
            log.warn("User from JWT token not found: {}", e.getMessage());

            Cookie accessTokenCookie = new Cookie("access_token", null);
            accessTokenCookie.setMaxAge(0);
            accessTokenCookie.setPath("/");
            response.addCookie(accessTokenCookie);

            Cookie refreshTokenCookie = new Cookie("refresh_token", null);
            refreshTokenCookie.setMaxAge(0);
            refreshTokenCookie.setPath("/");
            response.addCookie(refreshTokenCookie);

            chain.doFilter(request, response);
        }
    }

    private String getTokenFromRequest(HttpServletRequest request) {
        String bearerToken = request.getHeader("Authorization");
        if (StringUtils.hasText(bearerToken) && bearerToken.startsWith("Bearer ")) {
            return bearerToken.substring(7);
        }

        if (request.getCookies() != null) {
            return Arrays.stream(request.getCookies())
                    .filter(cookie -> "access_token".equals(cookie.getName()))
                    .map(Cookie::getValue)
                    .findFirst()
                    .orElse(null);
        }
        return null;
    }
}
