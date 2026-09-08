package com.test.test.integration;

import org.junit.jupiter.api.Test;

import static org.hamcrest.Matchers.everyItem;
import static org.hamcrest.Matchers.hasSize;
import static org.hamcrest.Matchers.not;
import static org.hamcrest.Matchers.nullValue;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * 영어 과정 뼈대 통합테스트 (TDD Red — senior-dev 작성)
 *
 * <p>계약: `설계/04_API계약.md` §8 (영어 과정 API) (판정 J-6·J-7·J-8)
 *
 * <p><b>이 파일이 지키는 절대 조건은 "기존 일본어에 영향 0"이다.</b> 그래서 검증의 절반이
 * "영어가 일본어 응답에 섞이지 않는가 / 그 반대는 아닌가"이다 — 경로를 가른 이유가 그것이다.
 * 쿼리 파라미터로 언어를 갈랐다면 파라미터를 빠뜨린 요청이 <b>조용히 일본어를 돌려주었을</b> 것이다(B-2가 금지하는 종류).
 *
 * <p>이 테스트를 수정하지 말 것 — 계약 변경은 senior-dev 경유.
 */
class EnglishCourseApiIntegrationTest extends ApiIntegrationTestSupport {

    private static final long EN_COURSE_1 = 101L; // 영어 대역(설계/03 §5-2 시드 대역)

    @Test
    void english_courses_are_public_and_five() throws Exception {
        mockMvc.perform(get("/api/en/courses"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data", hasSize(5)))
                .andExpect(jsonPath("$.data[0].levelCode").value("E1"))
                .andExpect(jsonPath("$.data[0].title").value("다시 세우기"));
    }

    /** 맛보기 — 코스 1만 열려 있고 나머지는 준비중이다 */
    @Test
    void only_the_first_english_course_is_open_with_two_units() throws Exception {
        mockMvc.perform(get("/api/en/courses"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data[0].status").value("AVAILABLE"))
                .andExpect(jsonPath("$.data[0].unitCount").value(2))
                .andExpect(jsonPath("$.data[1].status").value("PREPARING"))
                .andExpect(jsonPath("$.data[4].status").value("PREPARING"));
    }

    /** ★ 일본어 목록에 영어가 섞이지 않는다 */
    @Test
    void the_japanese_course_list_never_contains_english_courses() throws Exception {
        mockMvc.perform(get("/api/courses"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data", hasSize(6)))
                .andExpect(jsonPath("$.data[*].levelCode", everyItem(not("E1"))));
    }

    /** ★ 그 반대도 마찬가지다 */
    @Test
    void the_english_course_list_never_contains_japanese_courses() throws Exception {
        mockMvc.perform(get("/api/en/courses"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data[*].levelCode", everyItem(not("N5"))));
    }

    /** 언어가 다른 리소스 id는 "다른 언어의 것"이 아니라 <b>없는 것</b>이다 */
    @Test
    void a_japanese_course_id_is_404_on_the_english_path() throws Exception {
        mockMvc.perform(get("/api/en/courses/{courseId}", 2L))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.errorCode").value("NOT_FOUND"));

        mockMvc.perform(get("/api/courses/{courseId}", EN_COURSE_1))
                .andExpect(status().isNotFound());
    }

    /**
     * 유닛 구조는 일본어와 같고 <b>3번째 자리만</b> 한자 → 표현이다.
     * 스텝 진행·칩 바 로직을 그대로 재사용하기 위한 의도된 대칭이다.
     */
    @Test
    void english_unit_has_expressions_where_japanese_has_kanji() throws Exception {
        mockMvc.perform(get("/api/en/courses/{courseId}/units/{unitNo}", EN_COURSE_1, 1))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.expressions").exists())
                .andExpect(jsonPath("$.data.kanjis").doesNotExist())
                .andExpect(jsonPath("$.data.grammars").isArray())
                .andExpect(jsonPath("$.data.dialog").exists())
                .andExpect(jsonPath("$.data.vocabularies").isArray());
    }

    /** 발음은 kana가 아니라 ipa + 한글 근사 두 가지다(08 F-18) */
    @Test
    void english_vocabulary_carries_ipa_and_korean_approximation() throws Exception {
        mockMvc.perform(get("/api/en/courses/{courseId}/units/{unitNo}", EN_COURSE_1, 1))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.vocabularies[0].ipa").isNotEmpty())
                .andExpect(jsonPath("$.data.vocabularies[0].koApprox").isNotEmpty());
    }

    /**
     * 자료실 어휘 탭에도 발음이 보인다 (판정 §7-3).
     *
     * <p>사용자 확정은 "IPA + 한글 근사 <b>둘 다 표기</b>"다(08 F-18). 유닛에만 있고 자료실에 없으면
     * <b>같은 단어가 화면마다 다르게 보인다</b>. 자료실은 코스에 들어간 것을 사전처럼 다시 보는 뷰다.
     *
     * <p>일본어 응답에는 두 필드가 <b>항상 null로 존재</b>한다 — 언어별로 필드 유무가 갈리면
     * "필드가 없는 것과 값이 null인 것을 구분하지 않아도 된다"(04 §1-3)가 깨진다.
     */
    @Test
    void english_vocabulary_library_shows_pronunciation() throws Exception {
        mockMvc.perform(get("/api/en/library/vocabulary"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.content[0].ipa").isNotEmpty())
                .andExpect(jsonPath("$.data.content[0].koApprox").isNotEmpty());
    }

    @Test
    void japanese_vocabulary_library_carries_the_same_fields_as_null() throws Exception {
        mockMvc.perform(get("/api/library/vocabulary"))
                .andExpect(status().isOk())
                // 필드는 있고 값만 없다 — 화면은 null이면 아무것도 그리지 않는다(kana 열과 같은 방식)
                .andExpect(jsonPath("$.data.content[0]").exists())
                .andExpect(jsonPath("$.data.content[0].ipa").value(nullValue()))
                .andExpect(jsonPath("$.data.content[0].koApprox").value(nullValue()));
    }

    @Test
    void english_library_uses_english_level_codes_only() throws Exception {
        mockMvc.perform(get("/api/en/library/expressions").param("level", "E1"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.content").isArray());

        // 일본어 코드로 영어 자료실을 조회하면 400 — 섞이면 오류여야 한다
        mockMvc.perform(get("/api/en/library/expressions").param("level", "N5"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.errorCode").value("BUSINESS_RULE_VIOLATION"));
    }

    @Test
    void english_library_has_three_tabs_and_no_kanji_tab() throws Exception {
        mockMvc.perform(get("/api/en/library/grammar"))
                .andExpect(status().isOk());
        mockMvc.perform(get("/api/en/library/vocabulary"))
                .andExpect(status().isOk());
        // 한자 탭은 존재하지 않는다
        mockMvc.perform(get("/api/en/library/kanji"))
                .andExpect(status().isNotFound());
    }

    /**
     * 준비중 코스 상세는 <b>에러가 아니라 200 + PREPARING</b>이다 — 프론트가 준비중 안내로 분기한다(명세 §3-2).
     *
     * <p>2026-08-22 일본어 N1이 열리며 일본어에 준비중 코스가 사라져 이 계약을 검증할 자리가 없어졌다.
     * 규칙 자체는 <b>언어 무관</b>이고 지금 그 사례가 영어(E2~E5)에만 있어 여기로 옮겼다.
     * (원래 있던 곳: CourseApiIntegrationTest)
     */
    @Test
    void a_preparing_course_detail_is_200_with_empty_units() throws Exception {
        CourseCatalog.Course preparing = CourseCatalog.somePreparingCourse();

        mockMvc.perform(get("/api/en/courses/{courseId}", preparing.id))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data.id").value(preparing.id))
                .andExpect(jsonPath("$.data.title").value(preparing.title))
                .andExpect(jsonPath("$.data.status").value("PREPARING"))
                .andExpect(jsonPath("$.data.units", hasSize(0)))
                .andExpect(jsonPath("$.data.summary.unitCount").value(0));
    }

    /** 준비중 코스의 유닛 주소 직접 접근 → 404 + 전용 코드로 "없음"과 구분한다(B-4) */
    @Test
    void a_preparing_course_unit_is_404_with_course_preparing_code() throws Exception {
        CourseCatalog.Course preparing = CourseCatalog.somePreparingCourse();

        mockMvc.perform(get("/api/en/courses/{courseId}/units/{unitNo}", preparing.id, 1))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.success").value(false))
                .andExpect(jsonPath("$.errorCode").value("COURSE_PREPARING"));
    }
}
