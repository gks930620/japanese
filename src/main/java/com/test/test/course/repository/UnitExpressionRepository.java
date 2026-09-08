package com.test.test.course.repository;

import com.test.test.course.mapping.UnitExpressionEntity;
import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

/**
 * 유닛-표현 매핑 조회 (설계/04 §8-1) — {@link UnitKanjiRepository}와 같은 두 메서드다.
 * 영어 유닛의 3번째 스텝이 한자 자리에 표현을 놓기 때문에 조회 형태도 대칭이다.
 */
public interface UnitExpressionRepository extends JpaRepository<UnitExpressionEntity, Long> {

    // 표현 카드 순서(sort_order) 그대로 조회. 예문은 @OrderBy + batch fetch로 로드.
    @Query("select ue from UnitExpressionEntity ue join fetch ue.expression "
            + "where ue.unit.id = :unitId order by ue.sortOrder asc")
    List<UnitExpressionEntity> findWithExpressionByUnitId(@Param("unitId") Long unitId);

    // 코스 상세의 유닛별 표현 수 집계 (DB 집계값 — 설계 §3-2와 같은 규칙)
    @Query("select ue.unit.id as unitId, count(ue) as cnt from UnitExpressionEntity ue "
            + "where ue.unit.course.id = :courseId group by ue.unit.id")
    List<UnitContentCount> countByCourseIdGroupByUnit(@Param("courseId") Long courseId);
}
