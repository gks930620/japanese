package com.test.test.integration;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.security.Keys;
import java.nio.charset.StandardCharsets;
import java.util.Date;
import javax.crypto.SecretKey;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpHeaders;

/**
 * `tv`(토큰 버전) 클레임이 <b>없는</b> 토큰은 받아 주지 않는다 (TDD Red — senior-dev 작성 / 판정 2026-08-25 A-2)
 *
 * <p><b>문제</b>: {@code JwtUtil.getTokenVersion}은 {@code tv}가 없으면 <b>0으로 간주</b>한다.
 * "이 기능 이전에 발급된 토큰과의 호환"이 이유인데, <b>이 제품은 배포된 적이 없다</b>(진행사항/README — 배포 ❌).
 * 밖에 나가 있는 구토큰이 0개이므로 <b>호환 대상이 존재하지 않는다.</b>
 * 남은 것은 "tv 없는 토큰도 유효"라는 경로 하나뿐이고, 그 경로가 무엇을 통과시키는지 매번 따져야 한다.
 *
 * <p><b>계약</b>: {@code tv}가 없는 access 토큰은 <b>무효</b>다.
 * 응답 코드는 {@code TOKEN_EXPIRED} — 프론트 `lib/http.js`가 이 코드에서만 갱신을 시도하고, 실패하면 게스트로 강등한다(04 §4).
 * 다른 코드로 답하면 "로그인된 것처럼 보이지만 아무것도 안 되는" 상태가 남는다.
 *
 * <p>이 테스트를 수정하지 말 것 — 계약 변경은 senior-dev 경유 (CLAUDE.md TDD 규칙 2).
 */
class TokenVersionClaimContractIntegrationTest extends ApiIntegrationTestSupport {

    @Value("${jwt.secret}")
    private String jwtSecret;

    @Test
    void an_access_token_without_the_tv_claim_is_rejected() throws Exception {
        String withoutTokenVersion = signedAccessToken(false);

        mockMvc.perform(get("/api/users/me")
                        .header(HttpHeaders.AUTHORIZATION, bearer(withoutTokenVersion)))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.errorCode").value("TOKEN_EXPIRED"));
    }

    @Test
    void an_access_token_with_the_tv_claim_still_works(/* 가드 — 정상 토큰까지 막지 않는다 */) throws Exception {
        mockMvc.perform(get("/api/users/me")
                        .header(HttpHeaders.AUTHORIZATION, bearer(signedAccessToken(true))))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.username").value(DEFAULT_USERNAME));
    }

    /** 시크릿을 알고 서명만 맞춘 토큰 — 서명 검증은 통과하고 <b>클레임 구성만</b> 다르다 */
    private String signedAccessToken(boolean withTokenVersion) {
        SecretKey key = Keys.hmacShaKeyFor(jwtSecret.getBytes(StandardCharsets.UTF_8));
        var builder = Jwts.builder()
                .subject(DEFAULT_USERNAME)
                .claim("token_type", "access")
                .issuedAt(new Date())
                .expiration(new Date(System.currentTimeMillis() + 600_000));
        if (withTokenVersion) {
            builder.claim("tv", 0);
        }
        return builder.signWith(key).compact();
    }
}
