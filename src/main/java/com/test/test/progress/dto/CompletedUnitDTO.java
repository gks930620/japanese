package com.test.test.progress.dto;

import com.test.test.progress.UserUnitCompletionEntity;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;

/**
 * 완료한 유닛 1건 (설계/04 §6-3) — 코스 제목·레벨은 복제하지 않는다(설계/03 §4-1, 이름의 출처는 공개 API 한 곳).
 */
@Getter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class CompletedUnitDTO {

    private Long courseId;
    private Integer unitNo;

    public static CompletedUnitDTO from(UserUnitCompletionEntity entity) {
        return CompletedUnitDTO.builder()
                .courseId(entity.getCourseId())
                .unitNo(entity.getUnitNo())
                .build();
    }
}
