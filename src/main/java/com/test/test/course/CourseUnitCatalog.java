package com.test.test.course;

import com.test.test.common.exception.CoursePreparingException;
import com.test.test.common.exception.EntityNotFoundException;
import com.test.test.course.repository.CourseRepository;
import com.test.test.course.repository.CourseUnitRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

/**
 * 유닛 좌표(코스·유닛번호) 검증 창구 (설계/03 §4-1)
 *
 * <p>진도·병합이 같은 판정을 하므로 한 곳에 둔다 — 기존 course 리포지토리를 재사용하고
 * 새 조회 경로를 만들지 않는다(설계/08 C-7).</p>
 */
@Component
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class CourseUnitCatalog {

    private final CourseRepository courseRepository;
    private final CourseUnitRepository courseUnitRepository;

    /**
     * 쓰기 시점 검증 — 없는 코스·유닛은 404 NOT_FOUND, 준비중 코스는 404 COURSE_PREPARING.
     * 둘을 구분하는 이유는 결정기록 B-4(프론트가 준비중 안내로 분기한다).
     */
    public void requireExistingUnit(Long courseId, Integer unitNo) {
        CourseEntity course = courseRepository.findById(courseId)
                .orElseThrow(() -> EntityNotFoundException.of("코스", courseId));

        if (course.isPreparing()) {
            throw new CoursePreparingException(course.getTitle());
        }

        courseUnitRepository.findByCourseIdAndUnitNo(courseId, unitNo)
                .orElseThrow(() -> EntityNotFoundException.of("유닛", unitNo.longValue()));
    }

    /** 읽기 시점 필터의 근거 — 존재하는 유닛 좌표 전량을 한 쿼리로 읽는다 */
    public ExistingUnits existingUnits() {
        return ExistingUnits.of(courseUnitRepository.findAvailableUnitKeys());
    }
}
