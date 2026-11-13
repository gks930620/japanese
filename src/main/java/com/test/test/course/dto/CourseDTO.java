package com.test.test.course.dto;

import com.test.test.course.CourseEntity;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;

/**
 * 코스 목록 카드 DTO (설계 §3-1) — notice는 N5만 값, 나머지 null 직렬화.
 *
 * <p>{@code unitCount}(작업자(AI)_문서/04 §6-1)는 진도 막대의 <b>분모</b>다. 게스트의 분자는 브라우저에 있어도
 * 분모는 콘텐츠 사실이라 공개 API가 준다 — 없으면 코스 목록 화면이 코스 상세를 6번 더 불러야 한다(B-7).
 * 값은 언제나 DB 집계이며(하드코딩 금지) 준비중 코스는 0이다.
 * 사용자 상태({@code completed}·{@code bookmarked})는 여기에 넣지 않는다(결정기록 B-8).</p>
 */
@Getter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class CourseDTO {

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
    private String status;
    private Integer unitCount;
    /**
     * 계획 유닛 수(작업자(AI)_문서/04 §2-3-B) — {@code course.planned_unit_count}를 <b>그대로</b> 싣는다.
     *
     * <p>{@code unitCount}(열린 수)에서 <b>파생하지 않는다</b>. 파생하면 두 값이 영영 같아져
     * "완주"와 "열린 데까지의 끝"을 가르는 근거가 사라진다 — 부분 공개 코스(E2)가 5/5 = 100%로 보이고
     * 코스 카드·홈·마이페이지가 거짓 완주를 말한다(2026-11-14 qa 결함 1·2).
     *
     * <p>{@code null}이면 계획값 없음 = 지금 있는 유닛이 전부(일본어 전 코스). <b>null이어도 키는 항상
     * 직렬화한다</b> — {@code @JsonInclude(NON_NULL)} 금지(§1-3 · {@code coursePlannedUnits}와 같은 규칙).
     * 키가 통째로 빠지면 "계획 없음"과 구별할 수 없어 같은 결함이 조용히 재발한다.
     */
    private Integer plannedUnitCount;

    public static CourseDTO from(CourseEntity entity, int unitCount) {
        return CourseDTO.builder()
                .id(entity.getId())
                .courseNo(entity.getCourseNo())
                .levelLabel(entity.getLevelLabel())
                .levelCode(entity.getLevelCode())
                .title(entity.getTitle())
                .targetAudience(entity.getTargetAudience())
                .goal(entity.getGoal())
                .notice(entity.getNotice())
                .status(entity.getStatus().name())
                .unitCount(unitCount)
                .plannedUnitCount(entity.getPlannedUnitCount())
                .build();
    }
}
