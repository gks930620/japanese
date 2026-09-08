package com.test.test.english.dto;

import com.test.test.course.CourseUnitEntity;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;

/**
 * 영어 코스 상세의 유닛 항목 (설계/04 §8) — 구성 요약("문법 2 · 회화 1 · 표현 6 · 어휘 15")용 집계.
 * 회화는 유닛당 항상 1편(도메인 규칙)이라 필드로 내리지 않는다 — 일본어와 같다.
 */
@Getter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class EnUnitSummaryDTO {

    private Integer unitNo;
    private String title;
    private long grammarCount;
    private long expressionCount;
    private long vocabCount;

    public static EnUnitSummaryDTO from(CourseUnitEntity entity, long grammarCount, long expressionCount,
                                        long vocabCount) {
        return EnUnitSummaryDTO.builder()
                .unitNo(entity.getUnitNo())
                .title(entity.getTitle())
                .grammarCount(grammarCount)
                .expressionCount(expressionCount)
                .vocabCount(vocabCount)
                .build();
    }
}
