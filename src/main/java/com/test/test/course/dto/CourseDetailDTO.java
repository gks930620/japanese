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
    /** 표시 문구 — 화면 문구가 그대로 쓴다(영어 과정은 코스명이 단계 이름이라 쓰지 않는다 — 설계/06 §11-2) */
    private String levelLabel;
    /** ★ 필터 코드(설계/03 §1·§3) — 프론트는 이 값을 <b>그대로</b> 필터에 넣는다. levelLabel을 가공해 코드를 만들지 않는다(08 C-9) */
    private String levelCode;
    private String title;
    private String targetAudience;
    private String goal;
    private String notice;
    private String description;
    private String status;
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
