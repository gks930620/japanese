package com.test.test.progress.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;

/** 완료 토글 결과 (설계/04 §6-3) */
@Getter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class UnitCompletionDTO {

    private Long courseId;
    private Integer unitNo;
    private Boolean completed;

    public static UnitCompletionDTO of(Long courseId, Integer unitNo, boolean completed) {
        return UnitCompletionDTO.builder()
                .courseId(courseId)
                .unitNo(unitNo)
                .completed(completed)
                .build();
    }
}
