package com.test.test.progress;

import com.test.test.jwt.entity.UserEntity;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
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
 * 완료한 유닛 (설계/03 §4-1)
 *
 * <p><b>행 존재 = 완료</b>다. 완료 취소는 행 삭제이며 {@code is_completed} 불리언 컬럼을 두지 않는다 —
 * 취소한 완료를 남길 이유가 없고, 남기면 조회마다 조건이 하나 늘어난다.
 * UNIQUE(user_id, course_id, unit_no)가 켜기를 멱등으로 만든다.</p>
 */
@Entity
@Table(name = "user_unit_completion",
        uniqueConstraints = @UniqueConstraint(name = "uk_user_unit_completion",
                columnNames = {"user_id", "course_id", "unit_no"}),
        indexes = @Index(name = "idx_user_unit_completion_user", columnList = "user_id"))
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class UserUnitCompletionEntity {

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

    @Column(name = "completed_at", nullable = false)
    private LocalDateTime completedAt;

    @Builder
    private UserUnitCompletionEntity(UserEntity user, Long courseId, Integer unitNo, LocalDateTime completedAt) {
        this.user = user;
        this.courseId = courseId;
        this.unitNo = unitNo;
        this.completedAt = completedAt;
    }
}
