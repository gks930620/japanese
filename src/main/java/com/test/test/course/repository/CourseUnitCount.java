package com.test.test.course.repository;

/**
 * 코스별 유닛 수 집계 투영 (설계/04 §6-1 — 진도 막대의 분모 unitCount)
 * 하드코딩 금지: 값은 언제나 DB 집계에서 온다.
 */
public interface CourseUnitCount {

    Long getCourseId();

    Long getCnt();
}
