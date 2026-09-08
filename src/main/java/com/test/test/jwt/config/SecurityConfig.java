package com.test.test.jwt.config;

import com.test.test.jwt.JwtUtil;
import com.test.test.jwt.filter.JwtAccessTokenCheckAndSaveUserInfoFilter;
import com.test.test.jwt.filter.JwtLoginFilter;
import com.test.test.jwt.handler.CustomLogoutSuccessHandler;
import com.test.test.jwt.handler.OAuth2LoginSuccessHandler;
import com.test.test.jwt.service.CustomOAuth2UserService;
import com.test.test.jwt.service.CustomUserDetailsService;
import com.test.test.jwt.service.LoginAttemptGuard;
import com.test.test.jwt.service.RefreshService;
import jakarta.servlet.http.HttpServletResponse;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.HttpMethod;
import org.springframework.security.config.Customizer;
import org.springframework.security.config.annotation.authentication.configuration.AuthenticationConfiguration;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.oauth2.client.web.AuthorizationRequestRepository;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;

@Slf4j
@Configuration
@EnableWebSecurity
@RequiredArgsConstructor
public class SecurityConfig {

    private final JwtUtil jwtUtil;
    private final CustomUserDetailsService customUserDetailsService;
    private final CustomOAuth2UserService customOAuth2UserService;
    private final AuthenticationConfiguration authenticationConfiguration;
    private final RefreshService refreshService;
    private final AuthorizationRequestRepository authorizationRequestRepository;
    private final OAuth2LoginSuccessHandler oAuth2LoginSuccessHandler;
    private final CustomLogoutSuccessHandler customLogoutSuccessHandler;
    private final LoginAttemptGuard loginAttemptGuard;

    @Value("${app.cookie.secure:false}")
    private boolean secureCookie;

    /**
     * H2 콘솔이 켜져 있는가 (감사 2026-08-25 H1).
     *
     * <p>콘솔 화이트리스트와 프레이밍 완화는 <b>콘솔이 실제로 켜졌을 때만</b> 존재한다.
     * 무조건 열어 두면, 설정이 실수로 켜지는 순간 <b>인증 없이</b> DB 콘솔이 열린다 —
     * 콘솔은 접속자가 임의 JDBC URL을 넣을 수 있어 정보 노출로 끝나지 않는다.
     * 기본값 false: 이 값이 없는 환경은 곧 "콘솔 없음"이다(안전한 기본값).</p>
     */
    @Value("${spring.h2.console.enabled:false}")
    private boolean h2ConsoleEnabled;

    @Bean
    public SecurityFilterChain securityFilterChain(HttpSecurity http) throws Exception {
        // H2 콘솔 관련 완화는 콘솔이 켜진 환경(로컬)에만 존재한다 — 꺼지면 규칙 자체가 없다(감사 H1).
        // csrf.ignoringRequestMatchers("/h2-console/**")는 지웠다: 아래 csrf.disable()이 전역으로 끄고 있어
        // 효과가 없는 죽은 줄이었고, 남아 있으면 "콘솔만 예외"라는 오해를 만든다.
        if (h2ConsoleEnabled) {
            http.authorizeHttpRequests(auth -> auth
                            .requestMatchers("/h2-console/**").permitAll())
                    // frameOptions는 sameOrigin으로 제한: h2-console(동일 출처) iframe은 허용되면서
                    // X-Frame-Options: SAMEORIGIN 이 유지되어 클릭재킹은 계속 방어된다.
                    .headers(headers -> headers.frameOptions(frame -> frame.sameOrigin()));
        } else {
            // 콘솔이 없는 환경(운영)에서는 프레이밍을 완화할 이유가 없다 — 기본값으로 되돌린다.
            http.headers(headers -> headers.frameOptions(frame -> frame.deny()));
        }

        http.cors(Customizer.withDefaults())
                .csrf(csrf -> csrf.disable())
                .sessionManagement(session -> session.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
                .formLogin(form -> form.disable())
                .httpBasic(basic -> basic.disable());

        http.logout(logout -> logout
                .logoutUrl("/api/logout")
                .logoutSuccessHandler(customLogoutSuccessHandler));

        http.authorizeHttpRequests(auth -> auth
                .requestMatchers(
                        // 정적 리소스 (Vite 번들은 /assets/**, 아이콘/파비콘 포함)
                        "/", "/index.html", "/assets/**",
                        "/css/**", "/js/**", "/images/**",
                        "/favicon.ico", "/favicon.svg", "/icons.svg", "/uploads/**",
                        "/error",
                        // h2-console은 여기에 없다 — 콘솔이 켜진 환경에서만 위쪽 조건부 블록이 등록한다(감사 H1)
                        "/swagger-ui/**", "/swagger-ui.html", "/v3/api-docs/**", "/swagger-resources/**",
                        // actuator는 health/info만 공개(헬스체크용). metrics 등 나머지는 인증 필요(anyRequest로 처리).
                        "/actuator/health", "/actuator/health/**", "/actuator/info",
                        // SPA 페이지 라우트 (HomeController가 index.html로 forward)
                        "/login", "/signup", "/mypage", "/mypage/**", "/community/**",
                        "/courses", "/courses/**",
                        "/library", "/library/**",
                        // 영어 과정 화면 (설계/05 §16) — /en 단독 홈은 없고 SPA가 /en/courses로 보낸다.
                        // 학습에 관한 모든 것은 비로그인 공개라 일본어와 같은 정책이다.
                        "/en", "/en/**",
                        // 보관함 화면 — 비로그인도 본다(게스트는 localStorage 기록을 그린다)
                        "/bookmarks",
                        "/diagnosis",
                        // OAuth2: 커스텀 시작점 + 스프링 표준 인가/콜백 엔드포인트
                        "/custom-oauth2/login/**", "/oauth2/**", "/login/oauth2/**"
                ).permitAll()
                .requestMatchers(
                        "/api/login",
                        "/api/users",
                        "/api/tokens/refresh",
                        "/api/oauth2/**",
                        // 편집 모드(설계/04 §9) — 로그인 무관(설계/04 §9 확정). B-9의 문서화된 예외:
                        // 꺼진 환경에선 컨트롤러 빈이 없어 미매핑 404라 아무것도 노출되지 않고,
                        // prod는 RailwayDeploymentValidator가 enabled=true 기동을 거부한다.
                        "/api/editor/**"
                ).permitAll()
                .requestMatchers(HttpMethod.GET,
                        // 코스·자료실 조회는 전부 비로그인 공개(설계 §4-B-6·§5).
                        // 하위 경로까지 **로 여는 이유: 없는 하위 경로에 401을 주면 "로그인하면 되나?"로 읽히지만
                        // 실제로는 존재하지 않는 주소다 — 404로 드러나야 한다(§7-17 ②).
                        // 두 접두사 아래에는 GET 공개 핸들러만 존재하므로 새로 노출되는 것은 없다.
                        "/api/courses", "/api/courses/**",
                        "/api/library/**",
                        // 영어 과정 API (설계/04 §8) — 공개 정책은 일본어와 동일하다.
                        // 이 접두사 아래에도 GET 공개 핸들러만 존재하므로 새로 노출되는 것은 없고,
                        // 없는 하위 경로(/api/en/library/kanji)는 401이 아니라 404로 드러나야 한다(§7-17 ②).
                        "/api/en/**",
                        "/api/communities",
                        "/api/communities/*",
                        "/api/communities/*/comments",
                        "/api/files",
                        "/api/files/paths",
                        "/api/files/*/content"
                ).permitAll()
                .requestMatchers(
                        "/api/logout",
                        "/api/users/me",
                        // 사용자 학습 데이터(진도·보관함·병합)는 전부 인증 필요 (설계/04 §6 · 설계/07 §5-4).
                        // anyRequest().authenticated()가 이미 막고 있지만 명시한다 —
                        // 나중에 누가 permitAll을 넓힐 때 이 줄과 충돌해 눈에 보이게 하기 위해서다(설계/07 §5-2).
                        "/api/progress", "/api/progress/**",
                        "/api/bookmarks", "/api/bookmarks/**",
                        "/api/me", "/api/me/**"
                ).authenticated()
                .requestMatchers(HttpMethod.POST,
                        "/api/communities",
                        "/api/communities/*/comments",
                        "/api/files"
                ).authenticated()
                .requestMatchers(HttpMethod.PUT,
                        "/api/communities/**",
                        "/api/comments/**"
                ).authenticated()
                .requestMatchers(HttpMethod.DELETE,
                        "/api/communities/**",
                        "/api/comments/**",
                        "/api/files/**"
                ).authenticated()
                // 화이트리스트 방식: 위에서 공개(permitAll) 경로를 명시했고,
                // 그 외 모든 요청은 인증 필요. 신규 엔드포인트가 실수로 공개되지 않도록 하는 안전 기본값.
                // 새 공개 API/페이지를 추가하면 위 permitAll 목록에도 반드시 등록할 것.
                .anyRequest().authenticated());

        http.oauth2Login(oauth2 -> oauth2
                .authorizationEndpoint(authEndpoint ->
                        authEndpoint.authorizationRequestRepository(authorizationRequestRepository))
                .userInfoEndpoint(userInfo -> userInfo.userService(customOAuth2UserService))
                .successHandler(oAuth2LoginSuccessHandler)
                .failureHandler((request, response, exception) -> {
                    log.error("OAuth2 login failed", exception);
                    response.sendError(HttpServletResponse.SC_UNAUTHORIZED);
                }));

        http.userDetailsService(customUserDetailsService)
                .addFilterAt(
                        new JwtLoginFilter(authenticationConfiguration.getAuthenticationManager(), jwtUtil,
                                refreshService, loginAttemptGuard, "/api/login", secureCookie),
                        UsernamePasswordAuthenticationFilter.class)
                .addFilterBefore(
                        new JwtAccessTokenCheckAndSaveUserInfoFilter(jwtUtil, customUserDetailsService),
                        UsernamePasswordAuthenticationFilter.class);

        http.exceptionHandling(ex -> ex.authenticationEntryPoint((request, response, authException) -> {
            response.setStatus(HttpServletResponse.SC_UNAUTHORIZED);
            response.setContentType("application/json;charset=UTF-8");

            String errorCause = request.getAttribute("ERROR_CAUSE") != null
                    ? (String) request.getAttribute("ERROR_CAUSE")
                    : "NOT_AUTHENTICATED";

            String errorMessage;
            String errorCode;
            if ("TOKEN_EXPIRED".equals(errorCause)) {
                errorMessage = "Access token expired";
                errorCode = "TOKEN_EXPIRED";
            } else if ("INVALID_TOKEN".equals(errorCause)) {
                errorMessage = "Invalid token";
                errorCode = "INVALID_TOKEN";
            } else {
                errorMessage = "Authentication required";
                errorCode = "NOT_AUTHENTICATED";
            }

            String jsonResponse = String.format(
                    "{\"success\":false,\"message\":\"%s\",\"errorCode\":\"%s\",\"timestamp\":\"%s\"}",
                    errorMessage, errorCode, java.time.LocalDateTime.now()
            );
            response.getWriter().write(jsonResponse);
        }));

        return http.build();
    }
}
