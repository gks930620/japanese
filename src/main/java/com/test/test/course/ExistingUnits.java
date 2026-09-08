package com.test.test.course;

import com.test.test.course.repository.CourseUnitKey;
import java.util.HashMap;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;

/**
 * 지금 존재하는 유닛 좌표 집합 (설계/03 §4-1 읽기 시점 필터)
 *
 * <p>진도·보관함은 콘텐츠에 FK를 걸지 않는다(시드 재적재 내성). 그래서 사용자 기록을 내려보내기 전에
 * "그 유닛이 아직 있는지"를 앱이 확인한다. 사라진 유닛은 조용히 빠진다(설계/03 §4-1).</p>
 */
public final class ExistingUnits {

    private final Map<Long, Set<Integer>> unitNosByCourseId;

    private ExistingUnits(Map<Long, Set<Integer>> unitNosByCourseId) {
        this.unitNosByCourseId = unitNosByCourseId;
    }

    public static ExistingUnits of(List<CourseUnitKey> keys) {
        Map<Long, Set<Integer>> grouped = new HashMap<>();
        for (CourseUnitKey key : keys) {
            grouped.computeIfAbsent(key.getCourseId(), unused -> new HashSet<>()).add(key.getUnitNo());
        }
        return new ExistingUnits(grouped);
    }

    public boolean contains(Long courseId, Integer unitNo) {
        if (courseId == null || unitNo == null) {
            return false;
        }
        return unitNosByCourseId.getOrDefault(courseId, Set.of()).contains(unitNo);
    }
}
