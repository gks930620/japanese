package com.test.test.jwt.entity;

import jakarta.persistence.CollectionTable;
import jakarta.persistence.Column;
import jakarta.persistence.ElementCollection;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.PrePersist;
import jakarta.persistence.PreUpdate;
import jakarta.persistence.Table;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Entity
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
@Table(name = "users")
public class UserEntity {

    /** 탈퇴 회원의 표시 이름 — 커뮤니티·댓글·채팅·방장 표기가 전부 이 값을 읽는다(설계/04 §4-1) */
    public static final String WITHDRAWN_NICKNAME = "탈퇴한 회원";

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    private String provider;  // Oauth2Provider 이름.
    @Column(unique = true)
    private String username;

    private String password;

    private String email;
    private String nickname;

    @Builder.Default
    private Boolean isActive = true;

    /**
     * access 토큰 무효화의 유일한 수단(설계/03 §4). 비밀번호 변경·탈퇴 때 1 올리면
     * 그 이전에 발급된 access 토큰(다른 기기)이 <b>즉시</b> 죽는다.
     *
     * <p>시드가 이 컬럼 없이 INSERT하므로 DB 기본값 0을 준다. {@code iat}(초 단위) 비교를 쓰지 않는 이유:
     * 로그인과 비밀번호 변경이 같은 초에 일어나면 옛 토큰이 살아남아 테스트가 비결정적이 된다.
     * 정수 버전은 시계와 무관하게 결정적이다.</p>
     */
    @Column(name = "token_version", nullable = false, columnDefinition = "bigint default 0")
    @Builder.Default
    private Long tokenVersion = 0L;

    /** 탈퇴 시각 — <b>행 존재 여부가 아니라 이 값이 탈퇴 사실이다</b>(설계/03 §4) */
    @Column(name = "withdrawn_at")
    private LocalDateTime withdrawnAt;

    @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt;

    private LocalDateTime updatedAt;

    @PrePersist
    protected void onCreate() {
        createdAt = LocalDateTime.now();
        updatedAt = LocalDateTime.now();
    }

    @PreUpdate
    protected void onUpdate() {
        updatedAt = LocalDateTime.now();
    }

    // roles는 별도 테이블(user_roles)에 정규화 저장. 로그인 시 트랜잭션 밖에서도 읽히므로 EAGER.
    @ElementCollection(fetch = FetchType.EAGER)
    @CollectionTable(name = "user_roles", joinColumns = @JoinColumn(name = "user_id"))
    @Column(name = "role")
    @Builder.Default
    private List<String> roles = new ArrayList<>();

    /**
     * 소셜 로그인 재로그인 시 프로필(이메일·닉네임) 최신화. (§1: 서비스에서 setter 직접 조작 대신 도메인 메서드)
     * null 값은 무시해 기존 값을 보존한다(제공자가 스코프 미동의로 값을 안 줄 수 있음).
     */
    public void updateProfile(String email, String nickname) {
        if (email != null) {
            this.email = email;
        }
        if (nickname != null) {
            this.nickname = nickname;
        }
    }

    /** 소셜 계정인가 — 이메일 수정·비밀번호 변경·탈퇴 확인 방식이 전부 이 판정 하나에서 갈린다(설계/04 §4-1) */
    public boolean isSocial() {
        return !"LOCAL".equalsIgnoreCase(provider);
    }

    /** 회원정보 수정 — 소셜 계정의 이메일은 제공자가 준 값이라 바꾸지 않는다(설계/04 §4-1) */
    public void changeProfile(String nickname, String email) {
        this.nickname = nickname;
        if (!isSocial()) {
            this.email = email;
        }
    }

    /**
     * 비밀번호 변경 — 저장과 동시에 <b>다른 기기의 access 토큰을 죽인다</b>(설계/03 §4).
     * 둘을 떼어 놓으면 "비밀번호는 바뀌었는데 옛 토큰이 30분 살아 있는" 창이 생긴다.
     */
    public void changePassword(String encodedPassword) {
        this.password = encodedPassword;
        this.tokenVersion = this.tokenVersion + 1;
    }

    /**
     * 탈퇴 — 행을 지우지 않고 <b>익명화</b>한다(설계/04 §4-1).
     * 글·댓글·메시지·방장 표기가 전부 {@code users.nickname} 조인이라, 이 한 번의 치환으로
     * 읽기 코드를 한 줄도 고치지 않고 모든 표기가 "탈퇴한 회원"이 된다.
     *
     * <p>소셜 계정은 {@code username}(= 제공자 식별자)까지 끊는다. 그대로 두면 같은 계정으로 다시
     * 로그인하는 순간 upsert가 <b>탈퇴한 계정을 되살린다</b>(설계/04 §4-1).</p>
     *
     * @param anonymizedUsername 소셜 계정에 쓸 대체 아이디(로컬이면 null — 아이디는 그대로 남는다)
     * @param unusablePassword   아무도 맞출 수 없는 인코딩 값(null로 두면 다른 인증 경로에서 NPE가 된다)
     */
    public void withdraw(String anonymizedUsername, String unusablePassword, LocalDateTime withdrawnAt) {
        this.nickname = WITHDRAWN_NICKNAME;
        this.email = null;
        this.password = unusablePassword;
        this.isActive = false;
        this.withdrawnAt = withdrawnAt;
        this.tokenVersion = this.tokenVersion + 1;
        if (anonymizedUsername != null) {
            this.username = anonymizedUsername;
        }
    }
}
