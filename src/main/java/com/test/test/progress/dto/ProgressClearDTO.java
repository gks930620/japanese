package com.test.test.progress.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;

/** 학습 기록 초기화 결과 (설계/04 §6-3) — 보관함은 건드리지 않는다(AC-P-30) */
@Getter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ProgressClearDTO {

    private Long deletedUnitCount;

    public static ProgressClearDTO of(long deletedUnitCount) {
        return ProgressClearDTO.builder()
                .deletedUnitCount(deletedUnitCount)
                .build();
    }
}
