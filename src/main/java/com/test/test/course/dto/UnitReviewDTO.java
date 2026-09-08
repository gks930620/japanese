package com.test.test.course.dto;

import java.util.List;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;

/**
 * 정리 스텝의 복습 블록 "지금까지 배운 것" DTO (설계 §3-3·§7-11-A review)
 * unitNo % 5 == 0인 유닛에서만 값이고 그 외에는 null — 필드 자체는 항상 직렬화한다.
 * 구간은 자기 포함 직전 5유닛(fromUnitNo = unitNo - 4, toUnitNo = unitNo).
 * 신규 시드 없음 — unit_grammar 매핑 + grammar_point.name 조회로만 구성한다(단일 출처).
 */
@Getter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class UnitReviewDTO {

    private Integer fromUnitNo;
    private Integer toUnitNo;
    private List<String> grammarNames;

    public static UnitReviewDTO of(int fromUnitNo, int toUnitNo, List<String> grammarNames) {
        return UnitReviewDTO.builder()
                .fromUnitNo(fromUnitNo)
                .toUnitNo(toUnitNo)
                .grammarNames(grammarNames)
                .build();
    }
}
