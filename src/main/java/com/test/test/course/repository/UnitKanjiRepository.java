package com.test.test.course.repository;

import com.test.test.course.mapping.UnitKanjiEntity;
import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface UnitKanjiRepository extends JpaRepository<UnitKanjiEntity, Long> {

    // 한자 카드 순서(sort_order) 그대로 조회. 예시 단어는 @OrderBy + batch fetch로 로드.
    @Query("select uk from UnitKanjiEntity uk join fetch uk.kanji "
            + "where uk.unit.id = :unitId order by uk.sortOrder asc")
    List<UnitKanjiEntity> findWithKanjiByUnitId(@Param("unitId") Long unitId);

    @Query("select uk.unit.id as unitId, count(uk) as cnt from UnitKanjiEntity uk "
            + "where uk.unit.course.id = :courseId group by uk.unit.id")
    List<UnitContentCount> countByCourseIdGroupByUnit(@Param("courseId") Long courseId);
}
