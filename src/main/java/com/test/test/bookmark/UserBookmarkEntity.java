package com.test.test.bookmark;

import com.test.test.jwt.entity.UserEntity;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Index;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import jakarta.persistence.UniqueConstraint;
import java.time.LocalDateTime;
import lombok.AccessLevel;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;

/**
 * 보관함 1행 (설계/03 §4-1)
 *
 * <p>UNIQUE(user_id, target_type, target_id)가 담기를 멱등으로 만들고,
 * INDEX(user_id, target_type)에 목록·개수 조회가 항상 걸린다.
 * {@code created_at}은 "최근 담은 순" 정렬의 유일한 근거다.</p>
 *
 * <p>콘텐츠 테이블에는 FK를 걸지 않는다 — 콘텐츠는 시드 전용이라 통째로 다시 적재될 수 있고,
 * FK를 걸면 재적재가 사용자 데이터에 막히거나 사용자 데이터가 함께 지워진다(설계/03 §4-1).</p>
 */
@Entity
@Table(name = "user_bookmark",
        uniqueConstraints = @UniqueConstraint(name = "uk_user_bookmark",
                columnNames = {"user_id", "target_type", "target_id"}),
        indexes = @Index(name = "idx_user_bookmark_user_type", columnList = "user_id, target_type"))
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class UserBookmarkEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false)
    private UserEntity user;

    @Enumerated(EnumType.STRING)
    @Column(name = "target_type", nullable = false, length = 20)
    private BookmarkType targetType;

    /** 어휘는 <b>표제어 대표 id</b>다 — 서버가 정규화한 뒤 저장한다(설계/03 §4-1) */
    @Column(name = "target_id", nullable = false)
    private Long targetId;

    @Column(name = "created_at", nullable = false)
    private LocalDateTime createdAt;

    @Builder
    private UserBookmarkEntity(UserEntity user, BookmarkType targetType, Long targetId, LocalDateTime createdAt) {
        this.user = user;
        this.targetType = targetType;
        this.targetId = targetId;
        this.createdAt = createdAt;
    }
}
