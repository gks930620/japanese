package com.test.test.progress;

import com.test.test.jwt.entity.UserEntity;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
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
 * 마지막으로 보던 위치 — 사용자당 최대 1행 (설계/03 §4-1)
 *
 * <p>UNIQUE(user_id)가 "마지막 위치는 사이트 전체에 하나"라는 규칙을 DB에서 강제한다(AC-P-11).
 * 전 컬럼 NOT NULL이라 "반쯤 빈 행"이 생기지 않는다 — 행이 없음 = 마지막 위치가 없음.</p>
 */
@Entity
@Table(name = "user_last_position",
        uniqueConstraints = @UniqueConstraint(name = "uk_user_last_position_user", columnNames = "user_id"))
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class UserLastPositionEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false)
    private UserEntity user;

    @Column(name = "course_id", nullable = false)
    private Long courseId;

    @Column(name = "unit_no", nullable = false)
    private Integer unitNo;

    @Column(name = "step_key", nullable = false, length = 40)
    private String stepKey;

    @Column(name = "updated_at", nullable = false)
    private LocalDateTime updatedAt;

    @Builder
    private UserLastPositionEntity(UserEntity user, Long courseId, Integer unitNo, String stepKey,
                                   LocalDateTime updatedAt) {
        this.user = user;
        this.courseId = courseId;
        this.unitNo = unitNo;
        this.stepKey = stepKey;
        this.updatedAt = updatedAt;
    }

    /** 다른 유닛으로 이동하면 같은 행을 덮어쓴다 — 이전 위치는 남지 않는다(AC-P-11) */
    public void moveTo(Long courseId, Integer unitNo, String stepKey, LocalDateTime updatedAt) {
        this.courseId = courseId;
        this.unitNo = unitNo;
        this.stepKey = stepKey;
        this.updatedAt = updatedAt;
    }

    /** 병합 판정 — 브라우저 값이 계정 값보다 더 최근인가 (설계/04 §6-5) */
    public boolean isOlderThan(LocalDateTime other) {
        return other != null && this.updatedAt.isBefore(other);
    }
}
