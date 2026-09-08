package com.test.test.course.dto;

import com.test.test.course.CourseEntity;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;

/**
 * 다음 코스 링크 DTO (설계 §3-3·§7-8 nextCourse)
 * 마지막 유닛(nextUnitNo=null)에서만 값 — 준비중이어도 내려주고 프론트가 status로 분기한다.
 */
@Getter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class NextCourseDTO {

    private Long id;
    private Integer courseNo;
    private String levelLabel;
    private String title;
    private String status;

    public static NextCourseDTO from(CourseEntity entity) {
        return NextCourseDTO.builder()
                .id(entity.getId())
                .courseNo(entity.getCourseNo())
                .levelLabel(entity.getLevelLabel())
                .title(entity.getTitle())
                .status(entity.getStatus().name())
                .build();
    }
}
