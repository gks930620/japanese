package com.test.test.jwt.service;

import java.time.Duration;
import java.time.Instant;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

/**
 * 로그인 시도 제한 (판정 2026-08-25 B-1)
 *
 * <p><b>왜 필요한가</b>: 공개 API가 로그인 아이디를 통째로 노출하고 있었고(C-1), 비밀번호 최소 길이는 4자다
 * (<b>사용자가 의도한 결정</b> — 시드·테스트 계정 편의라 건드리지 않는다). 둘이 합쳐지면
 * <b>대상 목록 + 무제한 시도</b>가 동시에 성립한다. 비밀번호 규칙을 뒤집는 대신 시도 제한으로 그 대가를 줄인다.
 *
 * <p><b>라이브러리를 넣지 않는다</b>(senior-dev 판정). 인메모리 카운터로 충분하고, 이 저장소에는 같은 성격의
 * 선례가 있다 — {@code InMemoryAuthorizationRequestRepository}(만료 있는 인메모리 맵 + 다중화 시 Redis TODO).</p>
 *
 * <p><b>키가 username인 이유</b>: IP 단위는 NAT·모바일 캐리어 뒤에서 무고한 사용자를 함께 막는다.
 * 계정 단위면 표적이 된 계정만 잠기고, 그 계정의 주인은 창이 지나면 스스로 돌아온다.</p>
 *
 * <p><b>한계(의도적)</b>: 카운터는 인스턴스에 있다. 지금은 단일 인스턴스이고, 다중화하면
 * {@code InMemoryAuthorizationRequestRepository}와 <b>같은 시점에 함께</b> Redis로 옮긴다 —
 * 저장소가 둘로 갈리는 것을 피하기 위해서다.</p>
 */
@Component
@Slf4j
public class LoginAttemptGuard {

    /** 연속 실패 허용 횟수 — 사람의 오타 여유(3~4회)보다 크고 자동 시도에는 충분히 낮다 */
    @Value("${app.login.attempt.max:5}")
    private int maxAttempts;

    /** 차단 지속 시간(분) */
    @Value("${app.login.attempt.window-minutes:15}")
    private long windowMinutes;

    private final Map<String, Attempts> attemptsByUsername = new ConcurrentHashMap<>();

    /**
     * 차단 중이면 예외를 던진다 — <b>비밀번호 대조 전에</b> 부른다.
     * 맞으면 통과시키는 제한은 제한이 아니다(맞을 때까지 시도하면 되기 때문이다).
     */
    public void requireNotBlocked(String username) {
        if (username == null || username.isBlank()) {
            return;
        }
        Attempts attempts = attemptsByUsername.get(username);
        if (attempts != null && attempts.isBlockedAt(Instant.now())) {
            throw new TooManyLoginAttemptsException(windowMinutes);
        }
    }

    /** 실패 1회 기록 — 임계에 닿는 순간부터 창이 시작된다 */
    public void recordFailure(String username) {
        if (username == null || username.isBlank()) {
            return;
        }
        attemptsByUsername.compute(username, (key, existing) -> {
            Instant now = Instant.now();
            Attempts attempts = (existing == null || existing.isExpiredAt(now)) ? new Attempts() : existing;
            attempts.fail(now, maxAttempts, Duration.ofMinutes(windowMinutes));
            return attempts;
        });
    }

    /** 성공하면 카운터를 지운다 — 오타를 낸 사용자가 다음 로그인부터 정상으로 돌아와야 한다 */
    public void recordSuccess(String username) {
        if (username == null || username.isBlank()) {
            return;
        }
        attemptsByUsername.remove(username);
    }

    /** 계정 하나의 연속 실패 상태 — 맵의 값이라 인스턴스당 계정 수만큼만 존재한다 */
    private static final class Attempts {

        private int consecutiveFailures;
        private Instant blockedUntil;

        void fail(Instant now, int maxAttempts, Duration window) {
            this.consecutiveFailures++;
            if (this.consecutiveFailures >= maxAttempts) {
                this.blockedUntil = now.plus(window);
            }
        }

        boolean isBlockedAt(Instant now) {
            return blockedUntil != null && blockedUntil.isAfter(now);
        }

        /** 차단이 풀린 뒤의 기록은 버린다 — 몇 달 전 오타가 오늘의 카운터에 남지 않게 한다 */
        boolean isExpiredAt(Instant now) {
            return blockedUntil != null && !blockedUntil.isAfter(now);
        }
    }
}
