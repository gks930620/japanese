package com.test.test.integration;

import org.junit.jupiter.api.Test;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * 유닛 학습 응답의 `levelCode` (2026-08-25 판정, 감사 높음 2 — 설계/04 §2-3)
 *
 * <p>확인 문제의 오답 풀은 <b>정답과 같은 레벨</b>에서 가져와야 한다. 그러려면 화면이 그 유닛의 레벨을 알아야 하는데,
 * 유닛 학습 응답에는 `courseId`만 있고 레벨이 없었다. 코스 목록을 따로 부르는 안은 <b>"유닛 학습은 호출 한 번"</b>
 * (08 B-7)을 흔들고 실패 분기를 하나 더 만든다 — <b>필드 하나 추가가 가장 싸다.</b>
 *
 * <p>파생이 아니라 <b>서버가 가진 `course.level_code`를 그대로</b> 싣는다(설계/03 §1·§3 — 문자열 가공 금지).
 *
 * <p>이 테스트를 수정하지 말 것 — 계약 변경은 senior-dev 경유.
 */
class UnitStudyLevelCodeIntegrationTest extends ApiIntegrationTestSupport {

    @Test
    void unit_study_carries_the_course_level_code() throws Exception {
        for (CourseCatalog.Course course : CourseCatalog.available()) {
            mockMvc.perform(get("/api/courses/{courseId}/units/{unitNo}", course.id, 1))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.data.levelCode").value(course.levelCode));
        }
    }

    /** 영어 유닛도 같은 규칙이다 — 오답 풀 레벨 조건은 언어를 가리지 않는다 */
    @Test
    void english_unit_study_carries_the_course_level_code() throws Exception {
        mockMvc.perform(get("/api/en/courses/{courseId}/units/{unitNo}", 101L, 1))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.levelCode").value("E1"));
    }
}
