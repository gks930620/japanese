package com.test.test.jwt;

import io.jsonwebtoken.*;
import io.jsonwebtoken.security.Keys;
import javax.crypto.SecretKey;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

import java.nio.charset.StandardCharsets;
import java.util.Date;
import java.util.UUID;
@Component
public class JwtUtil {

    @Value("${jwt.secret}")
    private String secretKey;

    @Value("${jwt.expiration_access}")
    private long expirationAccess;


    @Value("${jwt.expiration_refresh}")
    private long expirationRefresh;

    /**
     * 발급마다 고유한 토큰 식별자(jti) — 판정 2026-08-25 A-1.
     *
     * <p>JWT의 {@code iat}·{@code exp}는 <b>초 단위</b>로 직렬화된다. 그래서 같은 사용자가 같은 초에 두 번
     * 로그인하면 클레임이 전부 같고 <b>서명까지 같은 문자열</b>이 나온다. 그 상태에서는
     * 비밀번호 변경이 "옛 리프레시 행을 지우고 새 리프레시를 저장"할 때 새 값이 지운 값과 같아져
     * <b>폐기했어야 할 토큰이 되살아난다</b>(AC-A-28이 실제로 깨졌다).</p>
     *
     * <p>유일성의 근거를 시각이 아니라 이 값에 둔다 — 시각은 초 단위라 근거가 될 수 없다.
     * access에도 싣는다: 서버는 무상태 검증이라 쓰지 않지만, 두 세션을 구분하지 못하면
     * 테스트도 사고 조사도 불가능하다.</p>
     */
    private String newTokenId() {
        return UUID.randomUUID().toString();
    }

    private SecretKey getSigningKey() {
        // charset을 UTF-8로 고정 — 플랫폼 기본 charset에 따라 서명키가 달라지는 것 방지
        // (예: Windows 개발 ↔ Linux 컨테이너 배포 조합에서 동일 시크릿이라도 키가 달라질 수 있음)
        return Keys.hmacShaKeyFor(secretKey.getBytes(StandardCharsets.UTF_8));
    }




    /**
     * Access Token 생성 — `tv`(token version) 클레임을 함께 싣는다(설계/03 §4).
     *
     * <p>access 토큰은 서명만으로 검증되는 무상태 JWT라 서버에 폐기 목록이 없다. 비밀번호 변경·탈퇴가
     * 다른 기기를 즉시 풀려면 <b>토큰 안에 대조할 값</b>이 있어야 한다 — 그것이 `tv`다.
     * refresh 토큰에는 넣지 않는다(DB에 있으니 지우면 끝).</p>
     */
    public String   createAccessToken(String username, long tokenVersion) {
        return Jwts.builder()
            .id(newTokenId())
            .subject(username) // ✅ setSubject() -> subject()
            .claim("token_type", "access")   //타입구분을 위해 추가.
            .claim("tv", tokenVersion)
            .issuedAt(new Date())
            .expiration(new Date(System.currentTimeMillis() + expirationAccess))
            .signWith(getSigningKey()) // ✅ SignatureAlgorithm.HS256 대신 Jwts.SIG.HS256 사용
            .compact();
    }

    public String   createRefreshToken(String username) {
        return Jwts.builder()
            .id(newTokenId())
            .subject(username)
            .issuedAt(new Date())
            .claim("token_type" ,"refresh")
            .expiration(new Date(System.currentTimeMillis() + expirationRefresh))
            .signWith(getSigningKey()) // ✅ SignatureAlgorithm.HS256 대신 Jwts.SIG.HS256 사용
            .compact();
    }



    public String getUsername(String token) {
        return extractUsername(token);
    }

    //토큰에서 username 추출.  뭐 subject에 uuid를 넣기도하지만.. 여기서는 subject에 username세팅했었음.
    public String extractUsername(String token) {
        return Jwts.parser()
            .verifyWith(getSigningKey())  // 0.12.3버전에서는 verifyWith에 Key말고 SecretKey가 와야한다.
            .build()
            .parseSignedClaims(token)
            .getPayload()
            .getSubject();
    }


    //토큰에서 인증여부 확인.  코드상 문제가없다면 보통 만료됐을 때 false
    public boolean validateToken(String token) {
        try {
            Claims claims = Jwts.parser()
                .verifyWith(getSigningKey())  // ✅ 서명 검증
                .build()
                .parseSignedClaims(token)    // ✅ JWT 파싱
                .getPayload();               // ✅ claims(토큰 정보) 추출
            //  토큰 만료 확인
            Date expiration = claims.getExpiration();
            return expiration.after(new Date()); // 현재 시간보다 만료 시간이 뒤에 있어야 유효

        } catch (JwtException | IllegalArgumentException e) {
            return false;
        }
    }


    // JWT 검증 후 username 추출
    public String validateAndExtractUsername(String token) {
        try {
            if (!validateToken(token)) return null;
            return extractUsername(token);
        } catch (Exception e) {
            return null;
        }
    }

    /**
     * 토큰의 `tv` 클레임 — <b>없으면 무효</b>다(판정 2026-08-25 A-2).
     *
     * <p>예전에는 "없으면 0"으로 관대하게 봤다. 그 관대함의 명분은 <i>이 기능 이전에 발급된 토큰과의 호환</i>이었는데,
     * 이 제품은 <b>배포된 적이 없어</b> 밖에 나가 있는 구토큰이 0개다 — 호환 대상이 실재하지 않는다.
     * 남는 것은 "tv 없는 토큰도 유효"라는 경로 하나뿐이고, 그 경로가 무엇을 통과시키는지 매번 따져야 한다.</p>
     *
     * <p>{@code -1}은 실제 {@code token_version}(0 이상)과 절대 같아질 수 없는 값이라, 호출부의
     * 대조가 자연히 실패해 401 {@code TOKEN_EXPIRED}가 된다. 파싱 불가·변조도 같은 값이다.</p>
     */
    public long getTokenVersion(String token) {
        try {
            Claims claims = Jwts.parser()
                .verifyWith(getSigningKey())
                .build()
                .parseSignedClaims(token)
                .getPayload();
            Number tokenVersion = claims.get("tv", Number.class);
            return tokenVersion == null ? -1L : tokenVersion.longValue();
        } catch (JwtException | IllegalArgumentException e) {
            return -1L;
        }
    }

    // 토큰에서 token_type 클레임 추출
    public  String getTokenType(String token) {
        try {
            Claims claims = Jwts.parser()
                .verifyWith(getSigningKey())
                .build()
                .parseSignedClaims(token)
                .getPayload();
            return claims.get("token_type", String.class); // token_type 값 반환
        } catch (ExpiredJwtException e) {   //만료되었어도 token type은 return
            Claims claims = e.getClaims();
            return claims != null ? claims.get("token_type", String.class) : null;
        } catch (JwtException | IllegalArgumentException e) {  // 변조, 잘못된 형식 등
            return null;
        }
    }
}

//jjwt 버전에 따라 구현방식이 다르다. 현재는 0.12.3 버전.