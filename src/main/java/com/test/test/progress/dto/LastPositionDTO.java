package com.test.test.progress.dto;

import com.test.test.progress.UserLastPositionEntity;
import java.time.LocalDateTime;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;

/**
 * 마지막으로 보던 위치 (설계/04 §6-3)
 * {@code updatedAt}은 항상 서버 시각이다 — 클라이언트가 보내지 않는다(조작 여지·시계 어긋남 제거).
 */
@Getter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class LastPositionDTO {

    private Long courseId;
    private Integer unitNo;
    private String stepKey;
    private LocalDateTime updatedAt;

    public static LastPositionDTO from(UserLastPositionEntity entity) {
        return LastPositionDTO.builder()
                .courseId(entity.getCourseId())
                .unitNo(entity.getUnitNo())
                .stepKey(entity.getStepKey())
                .updatedAt(entity.getUpdatedAt())
                .build();
    }
}
