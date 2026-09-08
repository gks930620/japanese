package com.test.test.course;

import com.test.test.common.dto.ApiResponse;
import com.test.test.course.dto.CourseDTO;
import com.test.test.course.dto.CourseDetailDTO;
import com.test.test.course.dto.UnitStudyDTO;
import java.util.List;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/**
 * 코스 학습 API (설계 §3) — 3개 전부 GET, 인증 불필요(permitAll).
 *
 * <p>이 경로는 <b>일본어 과정 전용</b>이다(설계/04 §8 판정 J-7). 언어를 쿼리 파라미터로 가르지 않는 이유는
 * 파라미터를 빠뜨린 요청이 조용히 일본어를 돌려주기 때문이다 — 영어는 {@code /api/en/courses}로 경로가 갈린다.</p>
 */
@RestController
@RequestMapping("/api/courses")
@RequiredArgsConstructor
public class CourseController {

    private final CourseService courseService;

    @GetMapping
    public ResponseEntity<ApiResponse<List<CourseDTO>>> getCourseList() {
        List<CourseDTO> courses = courseService.getCourseList(CourseLanguage.JA);
        return ResponseEntity.ok(ApiResponse.success("Course list fetched", courses));
    }

    @GetMapping("/{courseId}")
    public ResponseEntity<ApiResponse<CourseDetailDTO>> getCourseDetail(@PathVariable Long courseId) {
        CourseDetailDTO course = courseService.getCourseDetail(courseId, CourseLanguage.JA);
        return ResponseEntity.ok(ApiResponse.success("Course fetched", course));
    }

    @GetMapping("/{courseId}/units/{unitNo}")
    public ResponseEntity<ApiResponse<UnitStudyDTO>> getUnitStudy(
            @PathVariable Long courseId,
            @PathVariable Integer unitNo) {

        UnitStudyDTO unitStudy = courseService.getUnitStudy(courseId, unitNo);
        return ResponseEntity.ok(ApiResponse.success("Unit study fetched", unitStudy));
    }
}
