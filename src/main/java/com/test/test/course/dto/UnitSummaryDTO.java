package com.test.test.course.dto;

import com.test.test.course.CourseUnitEntity;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;

/**
 * 코스 상세의 유닛 항목 DTO (설계 §3-2 units[])
 * 구성 요약("문법 3 · 회화 1 · 한자 5자 · 어휘 18개")용 집계 포함.
 * 회화는 유닛당 항상 1편(도메인 규칙)이라 필드로 내리지 않는다.
 */
@Getter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class UnitSummaryDTO {

    private Integer unitNo;
    private String title;
    private long grammarCount;
    private long kanjiCount;
    private long vocabCount;

    public static UnitSummaryDTO from(CourseUnitEntity entity, long grammarCount, long kanjiCount, long vocabCount) {
        return UnitSummaryDTO.builder()
                .unitNo(entity.getUnitNo())
                .title(entity.getTitle())
                .grammarCount(grammarCount)
                .kanjiCount(kanjiCount)
                .vocabCount(vocabCount)
                .build();
    }
}
