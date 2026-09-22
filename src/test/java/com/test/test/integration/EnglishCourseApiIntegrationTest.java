package com.test.test.integration;

import com.fasterxml.jackson.databind.JsonNode;
import org.junit.jupiter.api.Test;
import org.springframework.test.web.servlet.MvcResult;
import org.springframework.test.web.servlet.ResultActions;

import static org.assertj.core.api.Assertions.assertThat;
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
    private static final long EN_COURSE_2 = 102L; // E2 「일상 말하기」 — 2026-09-22 5/20으로 부분 공개

    /**
     * E1의 <b>계획</b> 유닛 수 — 시드 {@code data-course-en-content.sql}의 course 101 행({@code planned_unit_count = 15}).
     *
     * <p>{@link CourseCatalog#ENGLISH}에 두지 않은 이유: 그 표가 들고 있는 것은 <b>시드가 만든 콘텐츠 사실</b>
     * (지금 열린 유닛 수·집계)이고, 계획 수는 <b>아직 만들지 않은 것에 대한 편집 계획</b>이라 성질이 다르다.
     * 한 줄에 섞으면 {@code unitCount}를 순회 범위로 쓰는 전수 검증이 <b>없는 유닛까지 돌아 전부 404</b>가 되는 길이 열린다.
     *
     * <p>E1은 15에서 끝난다(기획 §3-3 · 설계/06 §11-12 ① — 공개 경계는 5의 배수).
     * <b>2026-09-22 그 날이 왔다</b>: 열린 수가 15에 닿아 {@code totalUnits >= coursePlannedUnits}가 되었고,
     * <b>사람이 플래그를 내리지 않아도</b> 완주가 됐다(설계/04 §2-3-A가 개수를 boolean 대신 쓴 이유).
     *
     * <p>⚠️ <b>이 상수가 15가 아니게 되는 날 읽을 것</b>: 계획이 늘어난다는 것은 E1이 <b>다시 부분 공개</b>가 된다는 뜻이고,
     * 그 순간 아래 {@link #the_last_unit_is_a_finished_course_because_the_plan_is_met}가 전제부터 실패한다.
     * 그것이 곧 <b>"열린 데까지의 끝" 백엔드 커버리지를 복구하라</b>는 신호다(설계/08 C-30).
     */
    private static final int E1_PLANNED_UNITS = 15;

    /**
     * E2의 <b>계획</b> 유닛 수 — 시드 {@code data-course-en-content.sql}의 course 102 행({@code planned_unit_count = 20}).
     *
     * <p>{@link CourseCatalog#ENGLISH}의 {@code unitCount}(= 지금 열린 수, 5)와 <b>다른 값이라는 것이 요점</b>이다.
     * E1에서는 두 값이 15로 같아져 "파생 구현인지 아닌지"를 영어 쪽에서 구분할 수 없었는데(설계/08 C-30),
     * E2가 5/20으로 열리면서 <b>구분할 수 있는 실데이터가 돌아왔다.</b>
     *
     * <p>⚠️ <b>이 값과 열린 유닛 수가 같아지는 날(E2 20/20) 읽을 것</b>: 아래
     * {@link #the_last_open_unit_of_a_partly_published_course_is_not_a_finished_course}의 전제가 다시 거짓이 된다.
     * 그때 할 일은 {@code CourseCatalog.ENGLISH} 주석에 적어 두었다(대상을 E3로 옮기거나, 공백을 계약 표에 명시한다).
     */
    private static final int E2_PLANNED_UNITS = 20;

    /**
     * 부분 공개 코스의 안내 문구 — <b>E1이 쓰던 것과 글자 그대로 같다</b>(설계/06 §11-12 ③ R6 · 기획 E2 AC-25).
     * 코스마다 다른 문구를 만들지 않는다는 규칙이라, 상수를 두고 <b>문자열 자체</b>를 단언한다.
     */
    private static final String PARTIAL_COURSE_NOTICE =
            "앞 유닛부터 순서대로 채우는 중이에요 — 열려 있는 유닛까지는 지금 그대로 학습하면 됩니다";

    @Test
    void english_courses_are_public_and_five() throws Exception {
        mockMvc.perform(get("/api/en/courses"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data", hasSize(5)))
                .andExpect(jsonPath("$.data[0].levelCode").value("E1"))
                .andExpect(jsonPath("$.data[0].title").value("다시 세우기"));
    }

    /**
     * 어느 코스가 열렸고 유닛이 몇 개인지는 <b>전부 기대치 표에서 받아온다</b>(코스 카드의 준비중 배지·유닛 수 = 기획 AC-1).
     *
     * <p>이름에 사실을 박지 않는 이유가 이 테스트의 역사 그 자체다. 처음 이름은 {@code ..._with_two_units}였고
     * 2026-09-21 E1이 5유닛이 되며 거짓이 됐다. 다음 이름은 {@code only_the_first_..._is_open}이었고
     * <b>2026-09-22 E2가 열리며 또 거짓</b>이 됐다 — 이름은 컴파일러가 봐주지 않아 <b>틀린 채로 초록</b>이다.
     * 세 번째 이름에는 숫자도 "코스 하나"도 넣지 않았다: 표를 따라간다는 사실만 적으면 콘텐츠가 자라도 이름이 낡지 않는다.
     * 고칠 곳은 {@link CourseCatalog#ENGLISH} 한 줄이다.
     */
    @Test
    void the_english_course_list_follows_the_catalog_for_status_and_unit_count() throws Exception {
        ResultActions response = mockMvc.perform(get("/api/en/courses")).andExpect(status().isOk());

        for (int index = 0; index < CourseCatalog.ENGLISH.size(); index++) {
            CourseCatalog.Course course = CourseCatalog.ENGLISH.get(index);
            response.andExpect(jsonPath("$.data[" + index + "].status")
                            .value(course.available ? "AVAILABLE" : "PREPARING"))
                    .andExpect(jsonPath("$.data[" + index + "].unitCount").value(course.unitCount));
        }
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

    // ── 부분 공개 코스 — coursePlannedUnits (설계/04 §2-3-A · 08 C-29·C-30) ─────
    //
    // "다음 유닛이 없다"와 "이 코스를 끝냈다"는 다른 상태다. E1은 한때 15유닛 계획 중 10유닛만 열려 있어
    // 열린 마지막 유닛도 nextUnitNo: null이었고, 그것을 완주로 읽어 "🎉 끝까지 봤어요"라는 거짓 안내가 나갔다
    // (2026-09-21 검수 결함 2 · 기획 예외 E-4). 서버가 두 상태를 가를 값을 내려주지 않으면 화면은 지어낼 수밖에 없다.
    //
    //   moreUnitsComing = coursePlannedUnits != null && totalUnits < coursePlannedUnits
    //   completedCourse = nextUnitNo == null && !moreUnitsComing
    //
    // 프론트는 유닛 응답 하나로 판정한다(호출 한 번 계약, 08 B-7) — 코스 상세를 따로 부르지 않는다.
    //
    // ★ 2026-09-22 — **C-30이 포기했던 커버리지를 여기서 복구했다** (senior-dev, 설계/08 C-30 · 04 §2-3-A).
    //   경위: E1이 15/15가 되며 `totalUnits < coursePlannedUnits`인 **실데이터가 저장소에서 사라졌고**,
    //   상태 2를 서버 응답으로 태우던 테스트가 지워진 채 "없다"고 계약 표에 적혀 있었다(C-30 (a)·(c)·(d)).
    //   **E2가 5/20으로 열리면서 그 데이터가 되살아났다** → 아래
    //   the_last_open_unit_of_a_partly_published_course_is_not_a_finished_course 가 복구분이다.
    //   이제 이 필드의 계약은 넷이 함께 고정한다:
    //     ① 값이 실린다(비-null) ......... the_last_unit_is_a_finished_course_because_the_plan_is_met (E1)
    //     ② 마지막 유닛 전용이 아니다 ..... a_mid_course_english_unit_carries_the_same_planned_unit_count (E1)
    //     ③ totalUnits에서 파생하지 않는다 . CourseApiIntegrationTest.unit_study_last_unit_has_no_next_unit
    //        (일본어는 totalUnits=20인데 coursePlannedUnits=null — 파생 구현이면 거기 20이 실린다. C-11)
    //        ★ E2가 5 ≠ 20이라 **영어 쪽에서도 다시 판별할 수 있게 됐다** — 아래 복구분이 같은 것을 한 번 더 본다.
    //     ④ **상태 2(totalUnits < coursePlannedUnits)를 실데이터로 태운다** ... 복구분 (E2)
    //   비교식(moreUnitsComing) 자체는 화면의 것이고 `UnitStudyPage.partialCourse.test.jsx`가 픽스처로 고정한다.
    //   ★ 다음에 또 닫힐 때: E2가 20/20을 채우면 ④의 전제가 다시 거짓이 된다. 그때는 **숫자만 고쳐 살리지 말고**
    //     E3를 부분 공개하는 같은 커밋에서 대상을 옮기거나, 옮길 곳이 없으면 C-30처럼 계약 표에 "없다"를 적는다
    //     (같은 지시가 CourseCatalog.ENGLISH 주석에도 있다 — 코스를 열 때 반드시 고치는 한 줄이라서).

    /**
     * 마지막 유닛(15)이 <b>완주로 읽히는 이유는 계획을 채웠기 때문</b>이다 — {@code nextUnitNo == null}이어서가 아니다.
     *
     * <p>2026-09-22 이 테스트는 방향이 뒤집혔다. 전신은
     * {@code the_last_open_unit_of_a_partly_published_course_is_not_a_finished_course}였고
     * <b>{@code totalUnits < coursePlannedUnits}</b>를 단언했다 — E1이 15/15가 되며 그 전제가 거짓이 됐다.
     * 숫자만 고쳐 살려 두지 않고 <b>지금 참인 것</b>을 단언하도록 다시 썼다: 계약이 약속한
     * "개수를 쓰면 계획을 채우는 순간 <b>사람 손 없이</b> 완주가 된다"(설계/04 §2-3-A · 08 C-29)는
     * 여태 <b>한 번도 테스트된 적이 없는</b> 절반이었고, 이번에 실제로 일어난 일이 정확히 그것이다.
     * <b>그 전신은 같은 이름으로 아래에 돌아와 있다</b>({@link #the_last_open_unit_of_a_partly_published_course_is_not_a_finished_course}) —
     * E2가 5/20으로 열리며 전제가 될 실데이터가 생겼기 때문이다. 두 테스트는 <b>한 필드의 두 반대 상태</b>를 각각 맡는다.
     *
     * <p>유닛 번호를 박지 않고 {@code CourseCatalog.ENGLISH}의 {@code unitCount}로 부르는 이유는 그대로다 —
     * 그 자리는 콘텐츠가 자랄 때마다 옮겨 다닌다(유닛 2 → 5 → 10 → 15).
     */
    @Test
    void the_last_unit_is_a_finished_course_because_the_plan_is_met() throws Exception {
        CourseCatalog.Course english1 = CourseCatalog.englishById(EN_COURSE_1);

        MvcResult result = mockMvc
                .perform(get("/api/en/courses/{courseId}/units/{unitNo}", EN_COURSE_1, english1.unitCount))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.unitNo").value(english1.unitCount))
                .andExpect(jsonPath("$.data.totalUnits").value(english1.unitCount))
                .andExpect(jsonPath("$.data.nextUnitNo").value(nullValue())) // 코스의 마지막 유닛
                .andReturn();

        JsonNode data = objectMapper.readTree(result.getResponse().getContentAsString()).path("data");
        assertThat(data.has("coursePlannedUnits"))
                .as("coursePlannedUnits 키가 응답에 없다(설계/04 §8 · §2-3-A) — 값 없음(null)과 필드 없음을 "
                        + "구분하지 않아도 되는 것이 계약이라, 필드가 빠지면 화면은 조용히 '완주'로 되돌아간다")
                .isTrue();
        assertThat(data.path("coursePlannedUnits").asInt())
                .as("E1의 계획 유닛 수는 %s다(시드 course.planned_unit_count) — 서버가 가진 값을 그대로 싣는다",
                        E1_PLANNED_UNITS)
                .isEqualTo(E1_PLANNED_UNITS);
        assertThat(data.path("totalUnits").asInt())
                .as("열린 유닛(%s)이 계획(%s)에 닿아야 완주다(moreUnitsComing = false). 여기서 열린 수가 계획에 "
                                + "못 미치면 E1은 다시 '열린 데까지의 끝'이고, 그때는 그 상태를 직접 태우는 테스트를 "
                                + "이 블록에 되살려야 한다(설계/08 C-30)",
                        data.path("totalUnits").asInt(), E1_PLANNED_UNITS)
                .isGreaterThanOrEqualTo(E1_PLANNED_UNITS);
    }

    /**
     * 계획을 채운 코스는 <b>"채우는 중" 안내를 남기지 않는다</b> (설계/06 §11-12 ③ R4 · 기획 AC-16).
     *
     * <p>C-29가 개수를 boolean 대신 쓴 덕에 <b>완주 판정은 자동</b>이 됐지만, 코스 카드·상세의 안내 문구를 지우는 것은
     * <b>사람 일로 남겨 두었다.</b> 사람 일로 남은 것은 잊힌다 — 그리고 잊히면 학습자는 <b>다시 두 화면에서 모순된 말</b>을
     * 듣는다(유닛 끝은 "끝까지 봤어요", 코스 상세는 "채우는 중"). 결함 2와 방향만 반대이고 증상은 같다.
     *
     * <p>전제({@code unitCount >= 계획})를 <b>함께 단언</b>하는 이유: 계획이 늘어 E1이 다시 부분 공개가 되면
     * notice는 <b>있어야 맞다</b>. 전제를 적지 않으면 그날 이 테스트가 <b>맞는 데이터를 결함이라고</b> 우긴다.
     *
     * <p>일본어 N5는 20/20인데도 notice를 갖고 있지만 규칙 위반이 아니다 — {@code planned_unit_count}가 NULL,
     * 즉 <b>애초에 계획을 선언한 적이 없는</b> 코스이고, 그 notice는 "채우는 중"이 아니라 일반 안내다(C-29).
     * 그래서 이 검사는 계획을 가진 코스에만 적용한다.
     */
    @Test
    void a_course_that_met_its_plan_carries_no_leftover_notice() throws Exception {
        CourseCatalog.Course english1 = CourseCatalog.englishById(EN_COURSE_1);

        assertThat(english1.unitCount)
                .as("이 테스트의 전제는 'E1이 계획(%s)을 채웠다'는 것이다. 계획이 늘어 다시 부분 공개가 되면 "
                                + "notice는 있어야 맞으므로, 그때는 이 테스트가 아니라 이 전제를 먼저 고친다",
                        E1_PLANNED_UNITS)
                .isGreaterThanOrEqualTo(E1_PLANNED_UNITS);

        mockMvc.perform(get("/api/en/courses/{courseId}", EN_COURSE_1))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.status").value("AVAILABLE"))
                .andExpect(jsonPath("$.data.notice").value(nullValue()));
    }

    /**
     * 계획 수는 <b>마지막 유닛에서만 실리는 값이 아니다</b> — 중간 유닛도 같은 값을 갖는다.
     * ({@code nextCourse}·{@code review}처럼 특정 유닛에서만 값이 생기는 필드와 다르다.)
     *
     * <p>동시에 이 테스트는 <b>증설을 고정</b>한다: 유닛 5는 이제 마지막이 아니라 {@code nextUnitNo: 6}이다.
     * 유닛 5가 다시 끝으로 보이면 유닛 6 이후가 응답에서 사라졌다는 뜻이다.
     * (마지막 유닛이 <b>어디인지</b>는 위 테스트가 {@code CourseCatalog.ENGLISH}에서 받아 본다 — 여기서는 중간 유닛만 본다.)
     */
    @Test
    void a_mid_course_english_unit_carries_the_same_planned_unit_count() throws Exception {
        mockMvc.perform(get("/api/en/courses/{courseId}/units/{unitNo}", EN_COURSE_1, 5))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.prevUnitNo").value(4))
                .andExpect(jsonPath("$.data.nextUnitNo").value(6))
                .andExpect(jsonPath("$.data.coursePlannedUnits").value(E1_PLANNED_UNITS));
    }

    /**
     * ★ <b>복구분 (2026-09-22)</b> — 열린 데까지의 끝은 <b>완주가 아니다</b>(설계/04 §2-3-A 상태 2 · 08 C-30).
     *
     * <p>E2는 20유닛 계획 중 앞에서부터 5유닛만 열려 있다. 그 <b>마지막 열린 유닛</b>도 다음 유닛이 없으므로
     * {@code nextUnitNo: null}이고, 화면이 그것만 보면 "🎉 끝까지 봤어요"라는 <b>거짓 완주</b>를 말한다
     * (2026-09-21 검수 결함 2 · 기획 예외 E-4). 두 상태를 가르는 유일한 근거가 {@code coursePlannedUnits}다.
     *
     * <p><b>같은 이름의 테스트가 한 번 지워졌다.</b> E1이 15/15가 되며 전제가 거짓이 됐고, 데이터를 지어내는 대신
     * 사라진 사실을 적고 복구 조건을 코드에 박아 두기로 했다(C-30). <b>E2 개통이 그 복구일이고 이것이 그 복구분이다.</b>
     * 이름·전제만 E2로 바꿨을 뿐 단언하는 것은 그때와 같다.
     *
     * <p>{@code nextCourse}가 <b>null이 아니라는 것도 함께</b> 단언한다: 서버는 "마지막으로 존재하는 유닛"에서
     * 다음 코스를 싣고(구현상 {@code unitNo == totalUnits}), 상태 2에서 그것을 <b>무시하는 것은 화면의 일</b>이다
     * (프론트는 {@code moreUnitsComing}이 참이면 [유닛 목록으로 ›]를 보여준다 — §11-12 ④ R5).
     * 서버에서 이 값을 null로 만들어 "고치면" 상태 1·3의 분기가 무너진다. <b>고치지 말라는 뜻의 단언</b>이다.
     */
    @Test
    void the_last_open_unit_of_a_partly_published_course_is_not_a_finished_course() throws Exception {
        CourseCatalog.Course english2 = CourseCatalog.englishById(EN_COURSE_2);

        assertThat(english2.unitCount)
                .as("이 테스트의 전제는 'E2가 계획(%s)보다 적게 열려 있다'는 것이다. E2가 계획을 채우면 이것은 완주가 "
                                + "맞으므로, 그날 고칠 것은 이 단언이 아니라 **전제**다 — 대상을 다음 부분 공개 코스로 "
                                + "옮기거나, 옮길 곳이 없으면 설계/08 C-30처럼 커버리지 공백을 계약 표에 적는다",
                        E2_PLANNED_UNITS)
                .isLessThan(E2_PLANNED_UNITS);

        MvcResult result = mockMvc
                .perform(get("/api/en/courses/{courseId}/units/{unitNo}", EN_COURSE_2, english2.unitCount))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.unitNo").value(english2.unitCount))
                .andExpect(jsonPath("$.data.totalUnits").value(english2.unitCount))
                .andExpect(jsonPath("$.data.nextUnitNo").value(nullValue())) // 열린 데까지의 끝 — 완주와 모양이 같다
                .andExpect(jsonPath("$.data.coursePlannedUnits").value(E2_PLANNED_UNITS))
                .andExpect(jsonPath("$.data.nextCourse").exists()) // 상태 2에서도 실린다 — 무시하는 것은 화면의 일
                .andReturn();

        JsonNode data = objectMapper.readTree(result.getResponse().getContentAsString()).path("data");
        assertThat(data.path("totalUnits").asInt())
                .as("열린 유닛(%s)이 계획(%s)보다 적어야 이 코스가 '열린 데까지의 끝' 상태다. 두 값이 같아지면 "
                                + "moreUnitsComing이 거짓이 되어 화면이 완주 축하를 띄운다(설계/04 §2-3-A)",
                        data.path("totalUnits").asInt(), data.path("coursePlannedUnits").asInt())
                .isLessThan(data.path("coursePlannedUnits").asInt());
    }

    /**
     * 부분 공개 코스는 <b>"채우는 중" 안내를 달고 있다</b> — 그리고 그 문구는 E1이 쓰던 것과 <b>글자 그대로 같다</b>
     * (설계/06 §11-12 ③ R6 · 기획 E2 AC-25 · 예외 E-4).
     *
     * <p>{@link #a_course_that_met_its_plan_carries_no_leftover_notice}의 <b>정확한 반대쪽</b>이다. 그쪽은
     * "채웠으면 지워라", 이쪽은 "채우는 중이면 말해라"다. 둘 다 없으면 코스 상세는 <b>어느 쪽으로 틀려도 조용하다</b> —
     * 안내가 없으면 학습자는 20유닛짜리 코스를 5유닛짜리로 오해하고, 남아 있으면 완주한 코스가 미완성으로 보인다.
     *
     * <p>문구를 상수와 <b>완전 일치</b>로 보는 이유: R6이 금지하는 것은 "코스마다 다른 안내를 지어내는 것"이라
     * 비슷한 문구는 규칙 위반이면서 테스트를 통과한다. 숫자가 섞여 들어가는 것(R1 위반)도 여기서 함께 걸린다.
     */
    @Test
    void a_partly_published_course_carries_the_shared_notice() throws Exception {
        CourseCatalog.Course english2 = CourseCatalog.englishById(EN_COURSE_2);

        assertThat(english2.unitCount)
                .as("전제: E2가 계획(%s)보다 적게 열려 있다. 채운 뒤에는 notice가 없어야 맞다(§11-12 ③ R4)",
                        E2_PLANNED_UNITS)
                .isLessThan(E2_PLANNED_UNITS);

        mockMvc.perform(get("/api/en/courses/{courseId}", EN_COURSE_2))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.status").value("AVAILABLE"))
                .andExpect(jsonPath("$.data.notice").value(PARTIAL_COURSE_NOTICE))
                .andExpect(jsonPath("$.data.description").isNotEmpty()); // AVAILABLE 코스의 소개는 비우지 않는다(설계/03 §7-4)
    }

    /**
     * E1 마지막 유닛의 정리 문구는 <b>사람이 고치지 않고 저절로 바뀐다</b> (기획 E2 AC-29 · 예외 E-2 · 08 C-29).
     *
     * <p>E2가 열리기 전 E1 유닛 15의 정리는 <i>"다음 코스 일상 말하기는 지금 준비하고 있어요"</i>(상태 3)였다.
     * E2를 AVAILABLE로 바꾸는 순간 같은 자리가 <i>"…로 바로 이어갈 수 있어요"</i>(상태 1)가 되어야 한다 —
     * <b>화면 코드도 E1 데이터도 건드리지 않고</b> {@code nextCourse.status} 하나로 갈리는 것이 설계다.
     *
     * <p>이 값이 낡으면 학습자는 <b>열려 있는 코스를 "준비중"으로 듣는다</b>(예외 E-2). 그리고 그 거짓은
     * 어디에도 로그를 남기지 않는다 — 운영 DB에 102 행이 이미 있어 <b>UPDATE를 손으로 실행하지 않으면
     * 운영에서만</b> 그렇게 된다(설계/07 §1). 그래서 기대치를 문자열로 박지 않고 {@link CourseCatalog#ENGLISH}에서
     * 받아온다: 표(= 열렸다는 사실)와 시드(= 응답)가 어긋나면 그 자체가 실패다.
     */
    @Test
    void the_last_unit_of_the_first_course_links_to_the_second_course_with_its_current_status() throws Exception {
        CourseCatalog.Course english1 = CourseCatalog.englishById(EN_COURSE_1);
        CourseCatalog.Course english2 = CourseCatalog.englishById(EN_COURSE_2);

        mockMvc.perform(get("/api/en/courses/{courseId}/units/{unitNo}", EN_COURSE_1, english1.unitCount))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.nextCourse.id").value(EN_COURSE_2))
                .andExpect(jsonPath("$.data.nextCourse.courseNo").value(english2.courseNo))
                .andExpect(jsonPath("$.data.nextCourse.title").value(english2.title))
                .andExpect(jsonPath("$.data.nextCourse.status")
                        .value(english2.available ? "AVAILABLE" : "PREPARING"));
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
