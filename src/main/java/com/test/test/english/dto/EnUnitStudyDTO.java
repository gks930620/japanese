package com.test.test.english.dto;

import com.test.test.course.CourseEntity;
import com.test.test.course.CourseUnitEntity;
import com.test.test.course.dto.DialogDTO;
import com.test.test.course.dto.ExpressionDTO;
import com.test.test.course.dto.GrammarDTO;
import com.test.test.course.dto.NextCourseDTO;
import com.test.test.course.dto.UnitReviewDTO;
import java.util.List;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;

/**
 * 영어 유닛 학습 DTO (설계/04 §8-1) — 일본어 {@code UnitStudyDTO}와 <b>3번째 자리만</b> 다르다:
 * {@code kanjis[]} → {@code expressions[]}. 스텝 진행·칩 바 로직을 그대로 재사용하기 위한 의도된 대칭이다.
 *
 * <p>{@code kanjis} 필드는 <b>없다</b>(빈 배열이 아니라 부재다) — 영어 유닛에 한자 스텝은 존재하지 않는다.
 * 입문 코스의 {@code kanjis: []}(한자가 0자인 <i>일본어</i> 유닛)와 구별되는 지점이다.</p>
 *
 * <p>{@code review}(§7-11-A)의 {@code unitNo % 5 == 0} 규칙은 그대로 적용된다 —
 * 다만 맛보기가 2유닛뿐이라 이번 범위에서는 발동하지 않는다(설계/06 §11-4).</p>
 */
@Getter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class EnUnitStudyDTO {

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
    private List<ExpressionDTO> expressions;
    private List<EnVocabularyDTO> vocabularies;
    private UnitReviewDTO review;

    public static EnUnitStudyDTO from(CourseEntity course, CourseUnitEntity unit, int totalUnits,
                                      NextCourseDTO nextCourse, List<GrammarDTO> grammars, DialogDTO dialog,
                                      List<ExpressionDTO> expressions, List<EnVocabularyDTO> vocabularies,
                                      UnitReviewDTO review) {
        int unitNo = unit.getUnitNo();
        return EnUnitStudyDTO.builder()
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
                .expressions(expressions)
                .vocabularies(vocabularies)
                .review(review)
                .build();
    }
}
