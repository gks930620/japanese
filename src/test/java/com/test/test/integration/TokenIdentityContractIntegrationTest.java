package com.test.test.integration;

import static org.assertj.core.api.Assertions.assertThat;

import io.jsonwebtoken.Claims;
import io.jsonwebtoken.Jwts;
import java.nio.charset.StandardCharsets;
import javax.crypto.SecretKey;
import io.jsonwebtoken.security.Keys;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Value;

/**
 * 토큰 식별자(jti) 계약 (TDD Red — senior-dev 작성 / 판정 2026-08-25 A-1)
 *
 * <p><b>문제</b>: JWT의 {@code iat}·{@code exp}는 <b>초 단위</b>로 직렬화된다. 같은 사용자가 같은 초에 두 번
 * 로그인하면 클레임이 완전히 같아 <b>서명까지 같은 문자열</b>이 나온다(라이브 확인: 동시 로그인 6건이 전부 동일 토큰).
 *
 * <p><b>왜 문제인가</b>: {@code PasswordChangeApiIntegrationTest}는 "다른 기기 2대"를 만들려고 두 번 로그인하는데,
 * 같은 초에 실행되면 <b>같은 토큰을 두 번 받는다</b> — 검증하려던 시나리오가 구성되지 않는다.
 * {@code refresh_entity.token}에는 UNIQUE가 걸려 있어 저장 경합 여지도 남는다.
 *
 * <p><b>계약</b>: 발급되는 모든 토큰은 <b>서로 다르다.</b> 그 근거를 시각이 아니라 {@code jti} 클레임에 둔다 —
 * 시각은 초 단위라 근거가 될 수 없다. access에도 넣는다: 서버는 무상태 검증이라 안 쓰지만,
 * <b>두 세션을 구분하지 못하면 테스트도 사고 조사도 불가능</b>하기 때문이다.
 *
 * <p>이 테스트를 수정하지 말 것 — 계약 변경은 senior-dev 경유 (CLAUDE.md TDD 규칙 2).
 */
class TokenIdentityContractIntegrationTest extends ApiIntegrationTestSupport {

    @Value("${jwt.secret}")
    private String jwtSecret;

    @Test
    void an_access_token_carries_a_unique_id() throws Exception {
        Claims claims = claimsOf(loginDefaultUser().accessToken());

        assertThat(claims.getId()).as("access 토큰의 jti").isNotBlank();
    }

    @Test
    void a_refresh_token_carries_a_unique_id() throws Exception {
        Claims claims = claimsOf(loginDefaultUser().refreshToken());

        assertThat(claims.getId()).as("refresh 토큰의 jti").isNotBlank();
    }

    @Test
    void two_logins_never_produce_the_same_token(/* 같은 초에 로그인해도 */) throws Exception {
        Tokens first = loginDefaultUser();
        Tokens second = loginDefaultUser();

        assertThat(claimsOf(second.accessToken()).getId())
                .as("두 번째 로그인의 access jti")
                .isNotEqualTo(claimsOf(first.accessToken()).getId());
        assertThat(second.refreshToken())
                .as("두 번째 로그인의 refresh 토큰 문자열")
                .isNotEqualTo(first.refreshToken());
    }

    @Test
    void the_existing_claims_are_kept(/* 회귀 가드 — jti를 넣느라 계약을 흔들지 않는다 */) throws Exception {
        Claims access = claimsOf(loginDefaultUser().accessToken());

        assertThat(access.getSubject()).isEqualTo(DEFAULT_USERNAME);
        assertThat(access.get("token_type", String.class)).isEqualTo("access");
        assertThat(access.get("tv", Number.class)).as("토큰 버전(설계/03 §4)").isNotNull();
    }

    private Claims claimsOf(String token) {
        SecretKey key = Keys.hmacShaKeyFor(jwtSecret.getBytes(StandardCharsets.UTF_8));
        return Jwts.parser().verifyWith(key).build().parseSignedClaims(token).getPayload();
    }
}
