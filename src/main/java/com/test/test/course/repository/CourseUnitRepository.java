package com.test.test.course.repository;

import com.test.test.course.CourseUnitEntity;
import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

public interface CourseUnitRepository extends JpaRepository<CourseUnitEntity, Long> {

    List<CourseUnitEntity> findByCourseIdOrderByUnitNoAsc(Long courseId);

    // {unitNo}는 PK가 아니라 코스 안 순번(1~20) — 설계 §3-3
    Optional<CourseUnitEntity> findByCourseIdAndUnitNo(Long courseId, Integer unitNo);

    int countByCourseId(Long courseId);

    // 코스 목록의 unitCount (설계/04 §6-1) — 코스마다 세지 않고 한 번의 집계로 받는다
    @Query("select cu.course.id as courseId, count(cu) as cnt from CourseUnitEntity cu group by cu.course.id")
    List<CourseUnitCount> countGroupByCourse();

    // 사용자 데이터의 존재 검증·읽기 필터용 좌표 목록 (설계/03 §4-1)
    // 준비중 코스의 유닛은 학습 대상이 아니므로 제외한다.
    @Query("select cu.course.id as courseId, cu.unitNo as unitNo from CourseUnitEntity cu "
            + "where cu.course.status = com.test.test.course.CourseStatus.AVAILABLE")
    List<CourseUnitKey> findAvailableUnitKeys();
}
