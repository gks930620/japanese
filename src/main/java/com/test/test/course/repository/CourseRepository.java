package com.test.test.course.repository;

import com.test.test.course.CourseEntity;
import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;

public interface CourseRepository extends JpaRepository<CourseEntity, Long> {

    // courseNo(0~5) = 학습 경로 순서이자 정렬 기준 (설계 §3-1).
    // ⚠️ 언어가 둘이 되면서 courseNo는 더 이상 전역 유일이 아니다(일본어 1 = N5, 영어 1 = E1) —
    //    코스 조회는 반드시 language와 함께 한다(설계/03 §3).
    List<CourseEntity> findAllByLanguageOrderByCourseNoAsc(String language);

    // 다음 코스 조회 (설계 §3-3 nextCourse — 같은 언어 안에서 courseNo+1)
    Optional<CourseEntity> findByLanguageAndCourseNo(String language, Integer courseNo);
}
