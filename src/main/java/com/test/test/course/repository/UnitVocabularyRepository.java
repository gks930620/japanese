package com.test.test.course.repository;

import com.test.test.course.mapping.UnitVocabularyEntity;
import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface UnitVocabularyRepository extends JpaRepository<UnitVocabularyEntity, Long> {

    // 어휘 표 순서(sort_order) 그대로 조회
    @Query("select uv from UnitVocabularyEntity uv join fetch uv.vocabulary "
            + "where uv.unit.id = :unitId order by uv.sortOrder asc")
    List<UnitVocabularyEntity> findWithVocabularyByUnitId(@Param("unitId") Long unitId);

    @Query("select uv.unit.id as unitId, count(uv) as cnt from UnitVocabularyEntity uv "
            + "where uv.unit.course.id = :courseId group by uv.unit.id")
    List<UnitContentCount> countByCourseIdGroupByUnit(@Param("courseId") Long courseId);
}
