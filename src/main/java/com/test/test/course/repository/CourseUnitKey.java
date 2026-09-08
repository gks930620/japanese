package com.test.test.course.repository;

/**
 * 존재하는 유닛의 좌표 투영 (courseId + unitNo)
 *
 * <p>사용자 학습 데이터(진도·보관함)는 콘텐츠 테이블에 FK를 걸지 않는다(설계/03 §4-1 — 시드 재적재 내성).
 * 대신 조회 시점에 "지금 존재하는 유닛"만 남겨야 하므로, 그 판정에 쓸 좌표 목록을 한 쿼리로 받는다.</p>
 */
public interface CourseUnitKey {

    Long getCourseId();

    Integer getUnitNo();
}
