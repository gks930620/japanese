package com.test.test.jwt.repository;

import com.test.test.jwt.entity.UserEntity;
import jakarta.persistence.LockModeType;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

/**
 * <p><b>이메일·아이디 조회는 전부 정확 일치다</b> (설계/04 §4 · 08 C-24). 대소문자 흡수는 쿼리가 아니라
 * <b>입구의 정규화</b>가 한다({@code IdentityNormalizer}) — 값이 이미 소문자로 저장돼 있기 때문이다.
 * 예전의 {@code existsByEmailAndProviderIgnoreCase}는 이름과 달리 {@code IgnoreCase}가 <b>바로 앞 속성
 * (provider)</b>에만 걸려, 의도했던 email은 정확 일치로 비교되고 있었다 — 그래서 대문자 이메일이 중복을 통과했다.
 * provider는 서버가 쓰는 상수({@code "LOCAL"})라 정확 일치가 맞다.</p>
 */
public interface UserRepository extends JpaRepository<UserEntity, Long> {
    Optional<UserEntity> findByUsername(String username);

    boolean existsByUsername(String username);

    /**
     * 회원정보 수정의 이메일 중복 검사 (설계/04 §4-1) — <b>로컬 계정끼리만</b> 보고, <b>나 자신은 제외</b>한다.
     * 로컬 한정인 이유는 가입 검사(아래)와 같다 — 가입과 수정이 다른 조건이면 "가입은 되는데
     * 같은 값으로 프로필 수정은 409"라는 모순이 생긴다. 시드에 이미 중복 이메일이 실재하므로(id 2·3)
     * 호출부는 <b>값이 바뀔 때만</b> 이 검사를 한다("아무것도 안 고치고 저장 → 409" 방지).
     */
    boolean existsByEmailAndProviderAndIdNot(String email, String provider, Long id);

    /**
     * 가입 시 이메일 중복 검사 — <b>로컬 계정끼리만</b> 본다(설계/04 §4-1의 실행).
     * 소셜 계정의 이메일은 사용자가 고른 값이 아니라 제공자가 준 값이고, 시드에도 로컬과 겹치는 값이 있다.
     * 탈퇴 계정은 이메일이 null이 되므로 자연히 빠진다 — "탈퇴한 이메일은 다시 쓸 수 있다".
     */
    boolean existsByEmailAndProvider(String email, String provider);

    /**
     * 사용자 행을 잠근다 — <b>그 사용자의 학습 데이터 쓰기를 직렬화</b>하기 위한 것이다.
     *
     * <p>진도·보관함은 users를 루트로 하는 소유 데이터인데(설계/03 §4-1), "조회 후 없으면 삽입"은 동시 요청에서
     * 둘 다 "없음"을 보고 둘 다 삽입해 한쪽이 UNIQUE에 걸린다. 그 예외는 이미 롤백 대상이 된 트랜잭션
     * 안에서는 삼킬 수 없으므로(= 500), <b>애초에 경합이 생기지 않게</b> 루트 행 잠금으로 줄을 세운다.</p>
     *
     * <p>엔티티가 아니라 id만 뽑는 이유: 잠그는 것이 목적이라 로딩할 필드가 필요 없다.
     * 잠금 순서가 항상 "사용자 행 먼저"라 교착이 생기지 않는다.</p>
     */
    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("select u.id from UserEntity u where u.id = :userId")
    Optional<Long> lockForUserDataWrite(@Param("userId") Long userId);
}