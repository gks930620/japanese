package com.test.test.course.repository;

/**
 * 유닛별 콘텐츠 개수 집계 프로젝션 (코스 상세의 구성 요약·summary 합계용 — 하드코딩 금지 계약)
 */
public interface UnitContentCount {

    Long getUnitId();

    Long getCnt();
}
