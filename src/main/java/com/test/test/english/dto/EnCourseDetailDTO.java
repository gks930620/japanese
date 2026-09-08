package com.test.test.english.dto;

import com.test.test.course.CourseEntity;
import java.util.List;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;

/**
 * 영어 코스 상세 DTO (설계/04 §8) — 일본어 {@code CourseDetailDTO}에서 한자 집계 자리가 표현 집계다.
 * 유닛 응답이 {@code kanjis} → {@code expressions}로 갈리는 것과 <b>같은 대칭</b>이라 집계도 함께 갈린다.
 *
 * <p>{@code levelLabel}을 내려주지만 <b>영어 화면은 쓰지 않는다</b>(설계/06 §11-2) — 코스명이 곧 단계 이름이다.
 * 필드를 뺀 것이 아니라 화면 규칙이며, 필터에는 {@code levelCode}만 쓴다.</p>
 */
@Getter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class EnCourseDetailDTO {

    private Long id;
    private Integer courseNo;
    private String levelLabel;
    private String levelCode;
    private String title;
    private String targetAudience;
    private String goal;
    private String notice;
    private String description;
    private String status;
    private SummaryDTO summary;
    private List<EnUnitSummaryDTO> units;

    public static EnCourseDetailDTO from(CourseEntity entity, SummaryDTO summary, List<EnUnitSummaryDTO> units) {
        return EnCourseDetailDTO.builder()
                .id(entity.getId())
                .courseNo(entity.getCourseNo())
                .levelLabel(entity.getLevelLabel())
                .levelCode(entity.getLevelCode())
                .title(entity.getTitle())
                .targetAudience(entity.getTargetAudience())
                .goal(entity.getGoal())
                .notice(entity.getNotice())
                .description(entity.getDescription())
                .status(entity.getStatus().name())
                .summary(summary)
                .units(units)
                .build();
    }

    /** statusbar 합계 — 유닛별 집계의 합(하드코딩 금지 계약) */
    @Getter
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class SummaryDTO {
        private long unitCount;
        private long grammarCount;
        private long expressionCount;
        private long vocabCount;
    }
}
