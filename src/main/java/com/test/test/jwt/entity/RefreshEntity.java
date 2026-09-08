package com.test.test.jwt.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.ManyToOne;
import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Entity
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
public class RefreshEntity {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    private UserEntity userEntity;

    // 길이 512: jti(UUID) 클레임이 붙으면서 토큰이 기본값 255자를 넘겼다(판정 A-1의 딸린 변경).
    // 값 자체를 UNIQUE로 두는 것이 "회전한 토큰은 두 번 쓸 수 없다"의 마지막 방어선이라 인덱스는 유지한다
    // (InnoDB DYNAMIC 행 포맷의 인덱스 접두 한계 3072바이트 안에 든다).
    @Column(unique = true, length = 512)
    private String token;
}
