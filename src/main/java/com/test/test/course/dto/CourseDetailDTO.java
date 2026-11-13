package com.test.test.course.dto;

import com.test.test.course.CourseEntity;
import java.util.List;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;

/**
 * 코스 상세 DTO (설계 §3-2) — 유닛 목록 + statusbar 합계(summary).
 * summary는 DB 집계값 (하드코딩 금지 계약).
 */
@Getter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class CourseDetailDTO {

    private Long id;
    private Integer courseNo;
    /** 표시 문구 — 화면 문구가 그대로 쓴다(영어 과정은 코스명이 단계 이름이라 쓰지 않는다 — 작업자(AI)_문서/06 §11-2) */
    private String levelLabel;
    /** ★ 필터 코드(작업자(AI)_문서/03 §1·§3) — 프론트는 이 값을 <b>그대로</b> 필터에 넣는다. levelLabel을 가공해 코드를 만들지 않는다(08 C-9) */
    private String levelCode;
    private String title;
    private String targetAudience;
    private String goal;
    private String notice;
    private String description;
    private String status;
    /**
     * 계획 유닛 수(작업자(AI)_문서/04 §2-2·§2-3-B) — {@code course.planned_unit_count} 그대로.
     *
     * <p><b>{@code summary} 안이 아니라 루트다.</b> summary의 네 칸은 전부 "유닛별 집계의 합"(하드코딩 금지 계약)인데
     * 계획 수는 아직 만들지 않은 것에 대한 편집 계획이라 집계가 아니다. 같은 봉투에 넣으면 언젠가 집계로 채워져
     * {@code summary.unitCount}와 영영 같아진다.
     *
     * <p>{@code null} = 계획값 없음(일본어 전 코스). null이어도 키는 항상 직렬화한다 —
     * {@code @JsonInclude(NON_NULL)} 금지(§1-3).
     */
    private Integer plannedUnitCount;
    private SummaryDTO summary;
    private List<UnitSummaryDTO> units;

    public static CourseDetailDTO from(CourseEntity entity, SummaryDTO summary, List<UnitSummaryDTO> units) {
        return CourseDetailDTO.builder()
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

    @Getter
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class SummaryDTO {
        private long unitCount;
        private long grammarCount;
        private long kanjiCount;
        private long vocabCount;
    }
}
