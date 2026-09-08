package com.test.test.course.dto;

import com.test.test.course.CourseEntity;
import com.test.test.course.CourseUnitEntity;
import java.util.List;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;

/**
 * 유닛 학습 데이터 DTO (설계 §3-3) — 유닛 학습 화면 전 스텝이 이 한 번의 호출로 렌더링된다.
 * prevUnitNo: 첫 유닛이면 null / nextUnitNo: 마지막 유닛이면 null → 프론트 "코스 완료" 분기.
 * nextCourse(§7-8): 마지막 유닛에서만 값(다음 코스가 준비중이어도 내려줌), 그 외 null. 필드는 항상 직렬화.
 * review(§7-11-A): unitNo가 5의 배수인 유닛에서만 값, 그 외 null. 필드는 항상 직렬화.
 */
@Getter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class UnitStudyDTO {

    private Long courseId;
    private String courseTitle;
    /**
     * ★ 그 유닛이 속한 코스의 레벨 코드({@code course.level_code}) — 확인 문제의 오답 풀을 <b>같은 레벨</b>에서
     * 뽑기 위해 화면이 쓴다(2026-08-25 판정). 코스 목록을 따로 부르지 않는 것은 "유닛 학습은 호출 한 번"(08 B-7)을
     * 지키기 위해서다. 값은 서버가 가진 것을 <b>그대로</b> 싣는다 — courseNo·levelLabel에서 파생하지 않는다(설계/03 §1·§3).
     */
    private String levelCode;
    private Integer unitNo;
    private String title;
    private Integer totalUnits;
    private Integer prevUnitNo;
    private Integer nextUnitNo;
    private NextCourseDTO nextCourse;
    private List<GrammarDTO> grammars;
    private DialogDTO dialog;
    private List<KanjiDTO> kanjis;
    private List<VocabularyDTO> vocabularies;
    private UnitReviewDTO review;

    public static UnitStudyDTO from(CourseEntity course, CourseUnitEntity unit, int totalUnits,
                                    NextCourseDTO nextCourse, List<GrammarDTO> grammars, DialogDTO dialog,
                                    List<KanjiDTO> kanjis, List<VocabularyDTO> vocabularies,
                                    UnitReviewDTO review) {
        int unitNo = unit.getUnitNo();
        return UnitStudyDTO.builder()
                .courseId(course.getId())
                .courseTitle(course.getTitle())
                .levelCode(course.getLevelCode())
                .unitNo(unitNo)
                .title(unit.getTitle())
                .totalUnits(totalUnits)
                .prevUnitNo(unitNo > 1 ? unitNo - 1 : null)
                .nextUnitNo(unitNo < totalUnits ? unitNo + 1 : null)
                .nextCourse(nextCourse)
                .grammars(grammars)
                .dialog(dialog)
                .kanjis(kanjis)
                .vocabularies(vocabularies)
                .review(review)
                .build();
    }
}
