package com.test.test.library.dto;

import com.test.test.course.CourseUnitEntity;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;

/**
 * "어디서 배우나" 역링크 (설계 §4-B 공통 규약)
 * 유닛 학습 화면(`/courses/{courseId}/units/{unitNo}`)으로 되돌아가는 데 필요한 최소 정보.
 * 한자·문법은 매핑이 1:1이라 단일 객체, 어휘는 뜻(sense)마다 1개.
 */
@Getter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class LearnedInDTO {

    private Long courseId;
    private String courseTitle;
    private String level;
    private Integer unitNo;
    private String unitTitle;

    public static LearnedInDTO from(CourseUnitEntity unit) {
        return of(unit.getCourse().getId(), unit.getCourse().getTitle(), unit.getCourse().getLevelCode(),
                unit.getUnitNo(), unit.getTitle());
    }

    /** @param levelCode course.level_code 값 — DTO가 courseNo에서 코드를 파생하지 않는다(설계/03 §1·§3 판정 J-4) */
    public static LearnedInDTO of(Long courseId, String courseTitle, String levelCode,
                                  Integer unitNo, String unitTitle) {
        return LearnedInDTO.builder()
                .courseId(courseId)
                .courseTitle(courseTitle)
                .level(levelCode)
                .unitNo(unitNo)
                .unitTitle(unitTitle)
                .build();
    }
}
