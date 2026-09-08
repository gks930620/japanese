package com.test.test.course.repository;

import com.test.test.course.mapping.UnitGrammarEntity;
import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface UnitGrammarRepository extends JpaRepository<UnitGrammarEntity, Long> {

    // 유닛 학습 화면의 문법 스텝 순서(sort_order) 그대로 조회. 예문은 @OrderBy + batch fetch로 로드.
    @Query("select ug from UnitGrammarEntity ug join fetch ug.grammarPoint "
            + "where ug.unit.id = :unitId order by ug.sortOrder asc")
    List<UnitGrammarEntity> findWithGrammarByUnitId(@Param("unitId") Long unitId);

    // 복습 블록의 문법 명칭 — 구간 유닛(unit_no 오름차순 → 유닛 내 sort_order 순) (설계 §7-11-A)
    @Query("select ug.grammarPoint.name from UnitGrammarEntity ug "
            + "where ug.unit.course.id = :courseId and ug.unit.unitNo between :fromUnitNo and :toUnitNo "
            + "order by ug.unit.unitNo asc, ug.sortOrder asc")
    List<String> findGrammarNamesByCourseIdAndUnitNoRange(@Param("courseId") Long courseId,
                                                          @Param("fromUnitNo") int fromUnitNo,
                                                          @Param("toUnitNo") int toUnitNo);

    // 코스 상세의 유닛별 문법 수 집계 (DB 집계값 — 설계 §3-2)
    @Query("select ug.unit.id as unitId, count(ug) as cnt from UnitGrammarEntity ug "
            + "where ug.unit.course.id = :courseId group by ug.unit.id")
    List<UnitContentCount> countByCourseIdGroupByUnit(@Param("courseId") Long courseId);
}
