package com.test.test.english;

import com.test.test.common.dto.ApiResponse;
import com.test.test.course.dto.CourseDTO;
import com.test.test.english.dto.EnCourseDetailDTO;
import com.test.test.english.dto.EnUnitStudyDTO;
import java.util.List;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/**
 * 영어 과정 코스 학습 API (설계/04 §8 판정 J-7) — 3개 전부 GET, 인증 불필요(permitAll).
 *
 * <p><b>왜 경로를 갈랐나</b>(쿼리 파라미터 {@code ?lang=en} 반려): {@code /api/courses/**}는 GET 전면 공개
 * 와일드카드라, 쿼리로 언어를 가르면 <b>파라미터를 빠뜨린 요청이 조용히 일본어를 돌려준다</b>.
 * 경로가 다르면 SecurityConfig 화이트리스트·404 계약·캐시·북마크가 전부 자연스럽고,
 * 화면 경로({@code /en/**})와도 1:1이다.</p>
 */
@RestController
@RequestMapping("/api/en/courses")
@RequiredArgsConstructor
public class EnCourseController {

    private final EnCourseService enCourseService;

    @GetMapping
    public ResponseEntity<ApiResponse<List<CourseDTO>>> getCourseList() {
        List<CourseDTO> courses = enCourseService.getCourseList();
        return ResponseEntity.ok(ApiResponse.success("English course list fetched", courses));
    }

    @GetMapping("/{courseId}")
    public ResponseEntity<ApiResponse<EnCourseDetailDTO>> getCourseDetail(@PathVariable Long courseId) {
        EnCourseDetailDTO course = enCourseService.getCourseDetail(courseId);
        return ResponseEntity.ok(ApiResponse.success("English course fetched", course));
    }

    @GetMapping("/{courseId}/units/{unitNo}")
    public ResponseEntity<ApiResponse<EnUnitStudyDTO>> getUnitStudy(
            @PathVariable Long courseId,
            @PathVariable Integer unitNo) {

        EnUnitStudyDTO unitStudy = enCourseService.getUnitStudy(courseId, unitNo);
        return ResponseEntity.ok(ApiResponse.success("English unit study fetched", unitStudy));
    }
}
