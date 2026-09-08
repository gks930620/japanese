package com.test.test.course;

/**
 * 코스 상태 (설계/03_데이터모델.md — course.status)
 * - AVAILABLE: 학습 가능
 * - PREPARING: 준비중
 *
 * <p>어느 코스가 어느 상태인지는 <b>시드(data-courses.sql 등)가 단일 출처</b>다 — 여기 목록을 적으면
 * 코스가 열릴 때마다 주석이 거짓이 된다(2026-09 판정 L5).</p>
 *
 * <p>준비중 코스도 상세 조회는 200으로 열리고(빈 units·0 summary), 유닛 접근만
 * 404 + COURSE_PREPARING으로 막힌다. 프론트는 status로 화면을 분기한다.</p>
 */
public enum CourseStatus {
    AVAILABLE,
    PREPARING
}
