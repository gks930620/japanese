package com.test.test.integration;

import com.fasterxml.jackson.databind.JsonNode;
import org.junit.jupiter.api.Test;
import org.springframework.test.web.servlet.MvcResult;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * 코스 <b>목록·상세</b>의 계획 유닛 수 — {@code plannedUnitCount} (TDD Red — senior-dev 작성 2026-11-14)
 *
 * <p>계약: `작업자(AI)_문서/04_API계약.md` §2-1 · §2-2 · <b>§2-3-B</b> · §6-1 · §8-1 (qa 결함 1·2)
 *
 * <p><b>무엇이 문제였나</b>: §2-3-A가 "완주"와 "열린 데까지의 끝"을 <b>개수 비교</b>로 가르기로 해 놓고
 * 그 개수를 <b>유닛 응답에만</b> 실었다. 코스 목록·상세를 보는 화면은 판정할 재료가 없어
 * E2(계획 20 중 일부 공개)에서 "✓ 이 코스를 완주했어요"와 진도 100%를 띄웠다 —
 * 바로 위에 "앞 유닛부터 순서대로 채우는 중이에요"가 떠 있는 채로. <b>한 화면이 두 말을 했다.</b>
 *
 * <p>이 파일이 고정하는 것은 넷이다:
 * <ol>
 *   <li>목록·상세에 <b>값이 실린다</b>(E1 = 15 · E2 = 20)</li>
 *   <li><b>열린 유닛 수에서 파생하지 않는다</b> — E2는 두 값이 다르고(실데이터), 일본어는 열린 수가 있는데 계획은 null이다</li>
 *   <li>일본어는 <b>키는 있고 값은 null</b> — 필드가 통째로 빠지면 "계획 없음"과 구별할 수 없고,
 *       일본어를 부분 공개하는 날 조용히 거짓 완주 안내로 되돌아간다(§2-3-A 마지막 줄과 같은 이유)</li>
 *   <li>유닛 응답의 {@code coursePlannedUnits}와 <b>같은 값</b>이다 — 이름이 둘인 이유는 주어가 다르기 때문이지
 *       값이 둘이어서가 아니다(§2-3-B). 두 응답이 다른 수를 말하면 화면마다 다른 판정을 하게 된다</li>
 * </ol>
 *
 * <p>숫자는 {@link CourseCatalog#plannedUnitsOf(long)} 한 곳에서 받아온다 — 여기 박으면
 * E2가 20/20을 채우는 날 고칠 곳이 둘이 된다.
 *
 * <p>이 테스트를 수정하지 말 것 — 계약 변경은 senior-dev 경유 (CLAUDE.md TDD 규칙 2).
 */
class CoursePlannedUnitsContractIntegrationTest extends ApiIntegrationTestSupport {

    private static final String FIELD = "plannedUnitCount";

    /** 부분 공개 코스 — 열린 수와 계획 수가 다른 <b>유일한 실데이터</b>(E2). 이것이 파생 구현을 가리는 시험지다 */
    private static final long PARTLY_PUBLISHED_COURSE = 102L;

    /** 계획을 채운 코스 — 값이 사라지지 않는다는 것이 계약이다(채운 뒤에도 지우지 않는다, 03 §1) */
    private static final long COURSE_THAT_MET_ITS_PLAN = 101L;

    // ── 값이 실린다 ───────────────────────────────────────────────────

    @Test
    void the_english_course_list_carries_the_planned_unit_count_of_every_course() throws Exception {
        JsonNode list = data("/api/en/courses");

        for (CourseCatalog.Course course : CourseCatalog.ENGLISH) {
            JsonNode item = itemById(list, course.id);
            Integer expected = CourseCatalog.plannedUnitsOf(course.id);

            assertThat(item.has(FIELD))
                    .as("코스 목록에 %s 키가 없다(작업자(AI)_문서/04 §2-1·§2-3-B) — 코스 카드·홈·마이페이지가 "
                            + "'완주'와 '열린 데까지의 끝'을 가를 재료가 없어진다. 코스 id=%d", FIELD, course.id)
                    .isTrue();
            assertPlanned(item, expected, "코스 목록 id=" + course.id);
        }
    }

    @Test
    void the_english_course_detail_carries_the_planned_unit_count() throws Exception {
        for (long courseId : new long[]{COURSE_THAT_MET_ITS_PLAN, PARTLY_PUBLISHED_COURSE}) {
            JsonNode detail = data("/api/en/courses/{courseId}", courseId);

            assertThat(detail.has(FIELD))
                    .as("코스 상세에 %s 키가 없다(작업자(AI)_문서/04 §2-2·§8-1) — 같은 화면의 ✎ 안내와 CTA가 "
                            + "서로 다른 값을 보고 다른 말을 하게 된다. 코스 id=%d", FIELD, courseId)
                    .isTrue();
            assertPlanned(detail, CourseCatalog.plannedUnitsOf(courseId), "코스 상세 id=" + courseId);
        }
    }

    /**
     * 자리도 계약이다 — <b>{@code summary} 안이 아니라 루트</b>다.
     *
     * <p>{@code summary}의 네 칸은 전부 "유닛별 집계의 합"(하드코딩 금지 계약)인데 계획 수는 집계가 아니다.
     * 같은 봉투에 넣으면 그 성질이 흐려지고, 언젠가 집계로 채워져 <b>열린 수와 영영 같아진다</b>
     * (= "열린 데까지의 끝"이 다시 사라진다).
     */
    @Test
    void the_planned_unit_count_sits_at_the_root_not_inside_the_summary() throws Exception {
        JsonNode detail = data("/api/en/courses/{courseId}", PARTLY_PUBLISHED_COURSE);

        assertThat(detail.path("summary").has(FIELD))
                .as("%s가 summary 안에 있다 — summary는 DB 집계만 담는다(작업자(AI)_문서/04 §2-2·§2-3-B)", FIELD)
                .isFalse();
    }

    // ── 파생하지 않는다 ───────────────────────────────────────────────

    /**
     * 부분 공개 코스는 <b>열린 수 ≠ 계획 수</b>다. 목록의 {@code unitCount}를 그대로 복사한 구현은 여기서 걸린다.
     */
    @Test
    void the_planned_unit_count_is_not_derived_from_the_open_unit_count() throws Exception {
        JsonNode item = itemById(data("/api/en/courses"), PARTLY_PUBLISHED_COURSE);

        int openUnits = item.path("unitCount").asInt();
        assertThat(item.path(FIELD).asInt())
                .as("부분 공개 코스(id=%d)는 열린 유닛 %d개보다 계획이 많아야 한다 — 두 값이 같아지면 "
                        + "화면이 '완주'로 읽는다(작업자(AI)_문서/04 §2-3-A 판정식)", PARTLY_PUBLISHED_COURSE, openUnits)
                .isGreaterThan(openUnits);
    }

    /**
     * 이름이 둘(목록·상세 {@code plannedUnitCount} / 유닛 {@code coursePlannedUnits})인 이유는 <b>주어가 다르기 때문</b>이고
     * 값이 둘이어서가 아니다. 두 응답이 다른 수를 말하면 유닛 화면과 코스 화면이 또 갈린다 — 이 결함의 재발 경로다.
     */
    @Test
    void the_course_response_and_the_unit_response_agree_on_the_plan() throws Exception {
        JsonNode detail = data("/api/en/courses/{courseId}", PARTLY_PUBLISHED_COURSE);
        // 유닛 1로 묻는다 — coursePlannedUnits는 마지막 유닛 전용이 아니고(§2-3-A ②),
        // 공개 범위가 넓어지는 중인 코스에서 "마지막 유닛"을 쓰면 콘텐츠 작업 상태에 따라 404가 섞인다.
        JsonNode unit = data("/api/en/courses/{courseId}/units/{unitNo}", PARTLY_PUBLISHED_COURSE, 1);

        assertThat(detail.path(FIELD).asInt())
                .as("코스 상세의 %s와 유닛 응답의 coursePlannedUnits가 다르다 — 같은 사실의 두 이름이지 두 값이 아니다"
                        + "(작업자(AI)_문서/04 §2-3-B)", FIELD)
                .isEqualTo(unit.path("coursePlannedUnits").asInt());
    }

    // ── 일본어는 null — 그것이 회귀 방어선이다 ─────────────────────────

    /**
     * 일본어 코스는 계획을 선언한 적이 없다. <b>키는 있고 값은 null</b>이어야 한다.
     *
     * <p>값이 null이면 화면 판정({@code plannedUnits != null && ...})이 false가 되어 <b>동작이 한 줄도 바뀌지 않는다</b> —
     * 이 계약의 목적 절반이 "일본어를 건드리지 않는 것"이다. 반대로 열린 수가 복사돼 있으면 파생 구현이다.
     */
    @Test
    void japanese_courses_carry_the_key_with_a_null_value() throws Exception {
        JsonNode list = data("/api/courses");

        for (CourseCatalog.Course course : CourseCatalog.COURSES) {
            JsonNode item = itemById(list, course.id);

            assertThat(item.has(FIELD))
                    .as("일본어 코스 목록에 %s 키가 없다 — 값 없음(null)과 필드 없음을 구별하지 못하면 "
                            + "일본어를 부분 공개하는 날 조용히 거짓 완주 안내로 되돌아간다. 코스 id=%d", FIELD, course.id)
                    .isTrue();
            assertThat(item.path(FIELD).isNull())
                    .as("일본어 코스(id=%d)의 %s가 null이 아니다 — 일본어는 planned_unit_count IS NULL이다"
                            + "(열린 수 %d이 복사됐다면 파생 구현이다)", course.id, FIELD, course.unitCount)
                    .isTrue();
        }
    }

    @Test
    void a_japanese_course_detail_carries_the_key_with_a_null_value() throws Exception {
        for (CourseCatalog.Course course : CourseCatalog.COURSES) {
            JsonNode detail = data("/api/courses/{courseId}", course.id);

            assertThat(detail.has(FIELD))
                    .as("일본어 코스 상세에 %s 키가 없다(작업자(AI)_문서/04 §2-2). 코스 id=%d", FIELD, course.id)
                    .isTrue();
            assertThat(detail.path(FIELD).isNull())
                    .as("일본어 코스 상세(id=%d)의 %s가 null이 아니다 — summary.unitCount(%d)에서 파생한 것은 아닌가",
                            course.id, FIELD, course.unitCount)
                    .isTrue();
        }
    }

    // ── 도구 ────────────────────────────────────────────────────────

    private JsonNode data(String url, Object... uriVars) throws Exception {
        MvcResult result = mockMvc.perform(get(url, uriVars))
                .andExpect(status().isOk())
                .andReturn();
        return objectMapper.readTree(result.getResponse().getContentAsString()).path("data");
    }

    private JsonNode itemById(JsonNode list, long courseId) {
        for (JsonNode item : list) {
            if (item.path("id").asLong() == courseId) {
                return item;
            }
        }
        throw new AssertionError("코스 목록에 id=" + courseId + "가 없다");
    }

    private void assertPlanned(JsonNode node, Integer expected, String where) {
        if (expected == null) {
            assertThat(node.path(FIELD).isNull())
                    .as("%s: 계획값이 없는 코스인데 %s가 null이 아니다(작업자(AI)_문서/04 §2-3-B)", where, FIELD)
                    .isTrue();
            return;
        }
        assertThat(node.path(FIELD).asInt())
                .as("%s: %s가 시드(course.planned_unit_count)와 다르다 — 서버가 가진 값을 그대로 싣는다", where, FIELD)
                .isEqualTo(expected);
    }
}
