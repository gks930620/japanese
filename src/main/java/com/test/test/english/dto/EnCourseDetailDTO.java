package com.test.test.english.dto;

import com.test.test.course.CourseEntity;
import java.util.List;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;

/**
 * 영어 코스 상세 DTO (작업자(AI)_문서/04 §8) — 일본어 {@code CourseDetailDTO}에서 한자 집계 자리가 표현 집계다.
 * 유닛 응답이 {@code kanjis} → {@code expressions}로 갈리는 것과 <b>같은 대칭</b>이라 집계도 함께 갈린다.
 *
 * <p>{@code levelLabel}을 내려주지만 <b>영어 화면은 쓰지 않는다</b>(작업자(AI)_문서/06 §11-2) — 코스명이 곧 단계 이름이다.
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
    /**
     * 계획 유닛 수(작업자(AI)_문서/04 §2-3-B·§8-1) — 일본어 {@code CourseDetailDTO}와 <b>같은 이름·같은 규칙</b>이다.
     *
     * <p>{@code summary} 밖 <b>루트</b>에 둔다 — summary는 DB 집계만 담는다. 값은 {@code course.planned_unit_count}
     * 그대로이고 {@code summary.unitCount}(열린 수)에서 파생하지 않는다. E2(102)는 10/20이라 두 값이 다르며,
     * 같아지는 순간 화면이 "완주"로 읽는다.
     *
     * <p>유닛 응답의 {@code coursePlannedUnits}와 <b>같은 값</b>이다 — 이름이 둘인 이유는 주어가 다르기 때문이지
     * 값이 둘이어서가 아니다. null이어도 키는 항상 직렬화한다({@code @JsonInclude(NON_NULL)} 금지).
     */
    private Integer plannedUnitCount;
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
                .plannedUnitCount(entity.getPlannedUnitCount())
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
