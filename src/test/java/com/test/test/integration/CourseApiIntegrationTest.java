package com.test.test.integration;

import com.fasterxml.jackson.databind.JsonNode;
import java.util.HashMap;
import java.util.HashSet;
import java.util.Map;
import java.util.Set;
import org.junit.jupiter.api.Test;
import org.springframework.test.web.servlet.MvcResult;

import static org.assertj.core.api.Assertions.assertThat;
import static org.hamcrest.Matchers.hasSize;
import static org.hamcrest.Matchers.nullValue;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.forwardedUrl;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * 코스 학습 API 통합테스트 (TDD Red — senior-dev 작성)
 *
 * 계약 문서: 설계/04_API계약.md §2 (학습)
 * - 3개 API 전부 비로그인(GET, permitAll) — 모든 요청에 인증 헤더 없음이 곧 계약 검증이다.
 * - 코스별 기대치는 {@link CourseCatalog}가 단일 출처다(설계/03 §5-1) — 숫자를 이 파일에 하드코딩하지 않는다.
 * - 2026-08-22 N1 개통: 일본어 코스 6개가 전부 AVAILABLE이다. 준비중 계약은 영어 경로에서 검증한다.
 *
 * 이 테스트를 수정하지 말 것 — 계약 변경은 senior-dev 경유 (CLAUDE.md TDD 규칙 2).
 */
class CourseApiIntegrationTest extends ApiIntegrationTestSupport {

    private static final long N5_COURSE_ID = 2L;
    private static final long N4_COURSE_ID = 3L;
    private static final long N3_COURSE_ID = 4L;
    private static final long N2_COURSE_ID = 5L;
    private static final long N1_COURSE_ID = 6L; // 고급

    // ── 코스 목록 ────────────────────────────────────────────────────────────

    /**
     * 코스 목록 — <b>숫자를 하드코딩하지 않고 기대치 표에서 파생</b>한다(설계/03 §5-1).
     * 코스가 열릴 때마다 이 테스트를 고치는 것이 아니라 {@link CourseCatalog} 한 줄을 고친다.
     */
    @Test
    void courses_list_returns_every_course_in_path_order_without_login() throws Exception {
        MvcResult result = mockMvc.perform(get("/api/courses"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data", hasSize(CourseCatalog.courseCount())))
                .andReturn();

        JsonNode data = objectMapper.readTree(result.getResponse().getContentAsString()).path("data");

        int index = 0;
        for (CourseCatalog.Course expected : CourseCatalog.COURSES) {
            JsonNode course = data.get(index++);
            String where = "코스 " + expected.title;
            // 순서는 courseNo 오름차순이 곧 학습 경로다 (인수 8)
            assertThat(course.path("id").asLong()).as(where + " id").isEqualTo(expected.id);
            assertThat(course.path("courseNo").asInt()).as(where + " courseNo").isEqualTo(expected.courseNo);
            assertThat(course.path("levelLabel").asText()).as(where + " levelLabel").isEqualTo(expected.levelLabel);
            assertThat(course.path("title").asText()).as(where + " title").isEqualTo(expected.title);
            assertThat(course.path("status").asText()).as(where + " status")
                    .isEqualTo(expected.available ? "AVAILABLE" : "PREPARING");
            assertThat(course.path("targetAudience").asText()).as(where + " 대상").isNotBlank();
            assertThat(course.path("goal").asText()).as(where + " 목표").isNotBlank();
        }

        // N5 카드 안내 한 줄(notice)은 값이 있다 (화면정의 §0-6)
        assertThat(data.get(1).path("notice").asText()).isNotBlank();
    }

    // ── 코스 상세 ────────────────────────────────────────────────────────────

    @Test
    void course_detail_returns_n5_course_with_20_units_and_summary() throws Exception {
        MvcResult result = mockMvc.perform(get("/api/courses/{courseId}", N5_COURSE_ID))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data.id").value(N5_COURSE_ID))
                .andExpect(jsonPath("$.data.title").value("왕초보"))
                .andExpect(jsonPath("$.data.status").value("AVAILABLE"))
                // 코스 소개(상세 화면 부제)
                .andExpect(jsonPath("$.data.description").isNotEmpty())
                // statusbar 합계 — DB 집계값 (하드코딩 금지 계약)
                .andExpect(jsonPath("$.data.summary.unitCount").value(20))
                .andExpect(jsonPath("$.data.summary.grammarCount").value(44))
                .andExpect(jsonPath("$.data.summary.kanjiCount").value(100))
                // 유닛 20개, 번호 순 (인수 12)
                .andExpect(jsonPath("$.data.units", hasSize(20)))
                .andExpect(jsonPath("$.data.units[0].unitNo").value(1))
                .andExpect(jsonPath("$.data.units[0].title").value("저는 ○○입니다"))
                .andExpect(jsonPath("$.data.units[19].unitNo").value(20))
                .andExpect(jsonPath("$.data.units[19].title").value("N5 총정리"))
                .andReturn();

        JsonNode data = objectMapper.readTree(result.getResponse().getContentAsString()).path("data");

        // 어휘 합계: 유닛당 15~20개 × 20유닛 = 300~400
        assertThat(data.path("summary").path("vocabCount").asInt()).isBetween(300, 400);

        // 각 유닛의 구성 요약 집계 (인수 12, 23 — 빈 유닛 없음)
        for (JsonNode unit : data.path("units")) {
            int unitNo = unit.path("unitNo").asInt();
            assertThat(unit.path("title").asText()).as("유닛 %s 제목", unitNo).isNotBlank();
            assertThat(unit.path("grammarCount").asInt()).as("유닛 %s 문법 수", unitNo).isBetween(2, 3);
            assertThat(unit.path("kanjiCount").asInt()).as("유닛 %s 한자 수", unitNo).isEqualTo(5);
            assertThat(unit.path("vocabCount").asInt()).as("유닛 %s 어휘 수", unitNo).isBetween(15, 20);
        }
    }

    // 준비중 코스의 상세·유닛 계약(200 + PREPARING / 404 COURSE_PREPARING)은
    // 일본어에 준비중 코스가 없어져(2026-08-22 N1 개통) **영어 경로로 옮겼다** —
    // EnglishCourseApiIntegrationTest 참고. 규칙은 언어 무관이고, 그 사례가 지금은 영어에만 있다.


    @Test
    void course_detail_of_new_courses_returns_units_and_summary() throws Exception {
        // §7-8 확장: N4 20유닛/문법47/한자200, N3 25유닛/53/350, N2 25유닛/62/350 (확장 기획 인수 6·10·14)
        assertCourseDetail(N4_COURSE_ID, "초급", 20, 47, 200, 10);
        assertCourseDetail(N3_COURSE_ID, "중급", 25, 53, 350, 14);
        assertCourseDetail(N2_COURSE_ID, "중상급", 25, 62, 350, 14);
    }

    private void assertCourseDetail(long courseId, String title, int unitCount, int grammarCount,
                                    int kanjiCount, int kanjiPerUnit) throws Exception {
        MvcResult result = mockMvc.perform(get("/api/courses/{courseId}", courseId))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.id").value(courseId))
                .andExpect(jsonPath("$.data.title").value(title))
                .andExpect(jsonPath("$.data.status").value("AVAILABLE"))
                .andExpect(jsonPath("$.data.description").isNotEmpty())
                .andExpect(jsonPath("$.data.summary.unitCount").value(unitCount))
                .andExpect(jsonPath("$.data.summary.grammarCount").value(grammarCount))
                .andExpect(jsonPath("$.data.summary.kanjiCount").value(kanjiCount))
                .andExpect(jsonPath("$.data.units", hasSize(unitCount)))
                .andReturn();

        JsonNode data = objectMapper.readTree(result.getResponse().getContentAsString()).path("data");
        // 어휘 합계: 유닛당 15~20개
        assertThat(data.path("summary").path("vocabCount").asInt())
                .as("%s 어휘 합계", title).isBetween(unitCount * 15, unitCount * 20);
        int expectedNo = 1;
        for (JsonNode unit : data.path("units")) {
            int unitNo = unit.path("unitNo").asInt();
            assertThat(unitNo).as("%s 유닛 번호 순", title).isEqualTo(expectedNo++);
            assertThat(unit.path("title").asText()).as("%s 유닛 %s 제목", title, unitNo).isNotBlank();
            assertThat(unit.path("grammarCount").asInt()).as("%s 유닛 %s 문법 수", title, unitNo).isBetween(2, 3);
            assertThat(unit.path("kanjiCount").asInt()).as("%s 유닛 %s 한자 수", title, unitNo).isEqualTo(kanjiPerUnit);
            assertThat(unit.path("vocabCount").asInt()).as("%s 유닛 %s 어휘 수", title, unitNo).isBetween(15, 20);
        }
    }

    @Test
    void course_detail_not_found_returns_404() throws Exception {
        mockMvc.perform(get("/api/courses/{courseId}", 999L))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.success").value(false))
                .andExpect(jsonPath("$.errorCode").value("NOT_FOUND"));
    }

    // ── 유닛 학습 데이터 ─────────────────────────────────────────────────────

    @Test
    void unit_study_returns_grammar_dialog_kanji_vocabulary_structure() throws Exception {
        MvcResult result = mockMvc.perform(get("/api/courses/{courseId}/units/{unitNo}", N5_COURSE_ID, 1))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data.courseId").value(N5_COURSE_ID))
                .andExpect(jsonPath("$.data.courseTitle").value("왕초보"))
                .andExpect(jsonPath("$.data.unitNo").value(1))
                .andExpect(jsonPath("$.data.title").value("저는 ○○입니다"))
                .andExpect(jsonPath("$.data.totalUnits").value(20))
                // 첫 유닛: 이전 없음, 다음은 2 (인수 17)
                .andExpect(jsonPath("$.data.prevUnitNo").value(nullValue()))
                .andExpect(jsonPath("$.data.nextUnitNo").value(2))
                // 유닛 1 실라버스: 문법 3개 (です긍정/부정/조사 は)
                .andExpect(jsonPath("$.data.grammars", hasSize(3)))
                .andExpect(jsonPath("$.data.dialog.title").isNotEmpty())
                .andExpect(jsonPath("$.data.kanjis", hasSize(5)))
                .andReturn();

        JsonNode data = objectMapper.readTree(result.getResponse().getContentAsString()).path("data");

        // 문법: 명칭·부제·설명 + 예문 1개 이상, 예문은 3줄 스택(jp/kana/meaningKo — kana는 null 허용)
        for (JsonNode grammar : data.path("grammars")) {
            assertThat(grammar.path("name").asText()).isNotBlank();
            assertThat(grammar.path("nameKo").asText()).isNotBlank();
            assertThat(grammar.path("explanation").asText()).isNotBlank();
            assertThat(grammar.path("examples").size()).as("문법 '%s' 예문", grammar.path("name").asText())
                    .isGreaterThanOrEqualTo(1);
            for (JsonNode example : grammar.path("examples")) {
                assertThat(example.path("jp").asText()).isNotBlank();
                assertThat(example.path("meaningKo").asText()).isNotBlank();
                assertThat(example.has("kana")).as("kana 필드는 null이어도 항상 직렬화").isTrue();
            }
        }

        // 회화: 대사 2줄 이상 + 화자 2명 이상 (스크립트 형식 — 화면정의 §5-3)
        JsonNode lines = data.path("dialog").path("lines");
        assertThat(lines.size()).isGreaterThanOrEqualTo(2);
        Set<String> speakers = new HashSet<>();
        for (JsonNode line : lines) {
            assertThat(line.path("speaker").asText()).isNotBlank();
            assertThat(line.path("jp").asText()).isNotBlank();
            assertThat(line.path("meaningKo").asText()).isNotBlank();
            assertThat(line.has("kana")).isTrue();
            speakers.add(line.path("speaker").asText());
        }
        assertThat(speakers.size()).isGreaterThanOrEqualTo(2);

        // 한자: 글자·훈음 명칭 + 음독/훈독 중 1개 이상 + 예시 단어 1개 이상 (화면정의 §5-4 카드)
        for (JsonNode kanji : data.path("kanjis")) {
            assertThat(kanji.path("letter").asText()).hasSize(1);
            assertThat(kanji.path("meaningKo").asText()).isNotBlank();
            boolean hasReading = !kanji.path("onyomi").isNull() || !kanji.path("kunyomi").isNull();
            assertThat(hasReading).as("한자 '%s' 음독·훈독 중 최소 1개", kanji.path("letter").asText()).isTrue();
            assertThat(kanji.path("words").size()).isGreaterThanOrEqualTo(1);
            for (JsonNode word : kanji.path("words")) {
                assertThat(word.path("word").asText()).isNotBlank();
                assertThat(word.path("meaningKo").asText()).isNotBlank();
            }
        }

        // 어휘: 15~20개, 단어·뜻 필수 (화면정의 §5-5 표 — kana null이면 "─" 표기)
        JsonNode vocabularies = data.path("vocabularies");
        assertThat(vocabularies.size()).isBetween(15, 20);
        for (JsonNode vocab : vocabularies) {
            assertThat(vocab.path("word").asText()).isNotBlank();
            assertThat(vocab.path("meaningKo").asText()).isNotBlank();
            assertThat(vocab.has("kana")).isTrue();
        }
    }

    /**
     * 마지막 유닛(20): {@code nextUnitNo=null} → 프론트 "코스 완료" 분기 (인수 18).
     *
     * <p><b>2026-09-21 보강</b> — {@code coursePlannedUnits}(설계/04 §2-3-A)는 일본어에서도 <b>키가 있고 값만 null</b>이다.
     * 값이 아니라 <b>키의 존재</b>를 고정하는 이유: 필드가 통째로 빠져도 프론트의 판정
     * ({@code coursePlannedUnits != null && totalUnits < coursePlannedUnits})은 false가 되어 <b>지금과 똑같이 동작한다</b> —
     * 즉 빠진 것을 화면이 알려주지 않는다. 나중에 일본어 코스를 부분 공개해 값을 넣는 날
     * 직렬화에서 빠지는 구조라면 <b>조용히 옛 동작(거짓 완주 안내)으로 되돌아간다.</b>
     * kana·nextCourse·review와 같은 규칙이다(04 §1-3 "필드 없음과 값 null을 구분하지 않아도 된다").
     */
    @Test
    void unit_study_last_unit_has_no_next_unit() throws Exception {
        MvcResult result = mockMvc.perform(get("/api/courses/{courseId}/units/{unitNo}", N5_COURSE_ID, 20))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.unitNo").value(20))
                .andExpect(jsonPath("$.data.title").value("N5 총정리"))
                .andExpect(jsonPath("$.data.prevUnitNo").value(19))
                .andExpect(jsonPath("$.data.nextUnitNo").value(nullValue()))
                .andReturn();

        JsonNode data = objectMapper.readTree(result.getResponse().getContentAsString()).path("data");
        assertThat(data.has("coursePlannedUnits"))
                .as("coursePlannedUnits는 계획값이 없어도 키가 실려야 한다(설계/04 §2-3-A). "
                        + "지금 빠져 있으면 일본어를 부분 공개하는 날 이 결함이 조용히 재발한다")
                .isTrue();
        assertThat(data.path("coursePlannedUnits").isNull())
                .as("일본어 코스는 계획값이 없다 — totalUnits(%s)에서 파생하면 여기에 값이 생긴다",
                        data.path("totalUnits").asInt())
                .isTrue();
    }

    @Test
    void unit_study_not_found_returns_404_for_invalid_unit_no() throws Exception {
        // 있는 코스의 없는 유닛 번호 (인수 20)
        mockMvc.perform(get("/api/courses/{courseId}/units/{unitNo}", N5_COURSE_ID, 21))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.success").value(false))
                .andExpect(jsonPath("$.errorCode").value("NOT_FOUND"));

        mockMvc.perform(get("/api/courses/{courseId}/units/{unitNo}", N5_COURSE_ID, 0))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.errorCode").value("NOT_FOUND"));

        // 없는 코스의 유닛
        mockMvc.perform(get("/api/courses/{courseId}/units/{unitNo}", 999L, 1))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.errorCode").value("NOT_FOUND"));
    }


    // ── 표기(kana) 규칙 · 어휘 중복 (설계 §2·§4 — QA 결함 반영 보강) ────────

    // 순회 대상은 CourseCatalog.available()이 단일 출처다 (2026-09-03 판정 H3).
    // 예전에는 여기 int[][] {{2,20},{3,20},{4,25},{5,25}}가 따로 있어 입문(1)·N1(6)이 세 규칙(kana·코스 내 어휘 중복·품사)의
    // 검증을 한 번도 받지 않았다 — 06 §9의 "90유닛"이 그 구멍의 크기였다. 목록을 두 벌 두지 않는다(08 C-7).

    /**
     * §2 표기 계약: kana는 원문(jp/word)에 한자가 있을 때만 값을 갖고, 전부 가나면 null이다.
     * 필드 존재만 보던 기존 검증으로는 "가나 전용 원문에 원문과 같은 kana를 넣은" 데이터가 통과해
     * 화면에 같은 문장이 2줄로 렌더링됐다(QA 결함) → 규칙 자체를 전 유닛에서 검증한다.
     */
    @Test
    void all_units_follow_kana_notation_contract() throws Exception {
        for (CourseCatalog.Course course : CourseCatalog.available()) {
            for (int unitNo = 1; unitNo <= course.unitCount; unitNo++) {
                MvcResult result = mockMvc.perform(get("/api/courses/{courseId}/units/{unitNo}", course.id, unitNo))
                        .andExpect(status().isOk())
                        .andReturn();
                JsonNode data = objectMapper.readTree(result.getResponse().getContentAsString()).path("data");
                String at = "코스 " + course.id + " 유닛 " + unitNo;

                for (JsonNode grammar : data.path("grammars")) {
                    for (JsonNode example : grammar.path("examples")) {
                        assertKanaRule(example.path("jp"), example.path("kana"), at + " 문법 예문");
                    }
                }
                for (JsonNode line : data.path("dialog").path("lines")) {
                    assertKanaRule(line.path("jp"), line.path("kana"), at + " 회화 대사");
                }
                for (JsonNode vocab : data.path("vocabularies")) {
                    assertKanaRule(vocab.path("word"), vocab.path("kana"), at + " 어휘");
                }
                for (JsonNode kanji : data.path("kanjis")) {
                    for (JsonNode word : kanji.path("words")) {
                        assertKanaRule(word.path("word"), word.path("kana"), at + " 한자 예시 단어");
                    }
                }
            }
        }
    }

    private void assertKanaRule(JsonNode originNode, JsonNode kanaNode, String where) {
        String origin = originNode.asText();
        boolean hasKanji = origin.codePoints().anyMatch(cp -> cp >= 0x4E00 && cp <= 0x9FFF);
        boolean kanaPresent = !kanaNode.isNull() && !kanaNode.asText().isBlank();

        if (hasKanji) {
            assertThat(kanaPresent).as("%s '%s' — 한자가 있으므로 kana가 있어야 한다", where, origin).isTrue();
        } else {
            assertThat(kanaPresent)
                    .as("%s '%s' — 한자가 없으므로 kana는 null이어야 한다(화면에 같은 줄이 2번 나온다)", where, origin)
                    .isFalse();
        }
        if (kanaPresent) {
            // 공백만 다른 중복도 금지 — 렌더링 결과가 사실상 같은 줄이 된다
            assertThat(kanaNode.asText().replace(" ", "").replace("　", ""))
                    .as("%s '%s' — kana가 원문과 같다(중복 렌더)", where, origin)
                    .isNotEqualTo(origin.replace(" ", "").replace("　", ""));
        }
    }

    /**
     * §4 어휘 중복 정책: **한 코스 안에서 같은 단어를 두 번 등록하지 않는다**(같은 코스에서 같은 단어를
     * 두 번 배우게 되는 학습 설계 결함). 코스 간 중복은 허용 — 복습·다의어가 정당하게 존재한다(§7-10 판정).
     */
    @Test
    void vocabulary_is_not_duplicated_within_a_course() throws Exception {
        for (CourseCatalog.Course course : CourseCatalog.available()) {
            Map<String, Integer> firstSeenUnit = new HashMap<>();
            for (int unitNo = 1; unitNo <= course.unitCount; unitNo++) {
                MvcResult result = mockMvc.perform(get("/api/courses/{courseId}/units/{unitNo}", course.id, unitNo))
                        .andExpect(status().isOk())
                        .andReturn();
                JsonNode data = objectMapper.readTree(result.getResponse().getContentAsString()).path("data");

                for (JsonNode vocab : data.path("vocabularies")) {
                    String word = vocab.path("word").asText();
                    Integer previous = firstSeenUnit.putIfAbsent(word, unitNo);
                    assertThat(previous)
                            .as("코스 %s 어휘 '%s' 중복 — 유닛 %s에 이미 있다", course.id, word, previous)
                            .isNull();
                }
            }
        }
    }

    // ── 복습 블록 review (설계 §7-11-A) ──────────────────────────────────────

    @Test
    void unit_study_review_block_appears_only_on_every_fifth_unit() throws Exception {
        // 5의 배수 유닛에만 "지금까지 배운 것" — 구간은 자기 포함 직전 5유닛
        MvcResult result = mockMvc.perform(get("/api/courses/{courseId}/units/{unitNo}", N5_COURSE_ID, 10))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.review.fromUnitNo").value(6))
                .andExpect(jsonPath("$.data.review.toUnitNo").value(10))
                .andExpect(jsonPath("$.data.review.grammarNames").isArray())
                .andReturn();

        JsonNode names = objectMapper.readTree(result.getResponse().getContentAsString())
                .path("data").path("review").path("grammarNames");
        // 5유닛 × 문법 2~3개
        assertThat(names.size()).isBetween(10, 15);
        for (JsonNode name : names) {
            assertThat(name.asText()).isNotBlank();
        }

        // 첫 구간: 유닛 5 → 1~5
        mockMvc.perform(get("/api/courses/{courseId}/units/{unitNo}", N5_COURSE_ID, 5))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.review.fromUnitNo").value(1))
                .andExpect(jsonPath("$.data.review.toUnitNo").value(5));

        // 25유닛 코스(N3)도 5의 배수 규칙 그대로 — 마지막 유닛 25에서 21~25
        mockMvc.perform(get("/api/courses/{courseId}/units/{unitNo}", N3_COURSE_ID, 25))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.review.fromUnitNo").value(21))
                .andExpect(jsonPath("$.data.review.toUnitNo").value(25));

        // 5의 배수가 아니면 null
        mockMvc.perform(get("/api/courses/{courseId}/units/{unitNo}", N5_COURSE_ID, 1))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.review").value(nullValue()));
        mockMvc.perform(get("/api/courses/{courseId}/units/{unitNo}", N2_COURSE_ID, 24))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.review").value(nullValue()));
    }

    // ── 어휘 품사 partOfSpeech (설계 §7-12) ─────────────────────────────────

    @Test
    void all_vocabularies_have_valid_part_of_speech() throws Exception {
        Set<String> allowed = Set.of("NOUN", "VERB", "I_ADJECTIVE", "NA_ADJECTIVE",
                "ADVERB", "CONJUNCTION", "EXPRESSION");

        for (CourseCatalog.Course course : CourseCatalog.available()) {
            for (int unitNo = 1; unitNo <= course.unitCount; unitNo++) {
                MvcResult result = mockMvc.perform(get("/api/courses/{courseId}/units/{unitNo}", course.id, unitNo))
                        .andExpect(status().isOk())
                        .andReturn();
                JsonNode data = objectMapper.readTree(result.getResponse().getContentAsString()).path("data");

                for (JsonNode vocab : data.path("vocabularies")) {
                    String word = vocab.path("word").asText();
                    JsonNode pos = vocab.path("partOfSpeech");
                    assertThat(pos.isNull())
                            .as("코스 %s 유닛 %s 어휘 '%s' — partOfSpeech는 항상 값이 있어야 한다(자료실 필터)",
                                    course.id, unitNo, word)
                            .isFalse();
                    assertThat(pos.asText())
                            .as("코스 %s 유닛 %s 어휘 '%s' 품사 값", course.id, unitNo, word)
                            .isIn(allowed);
                }
            }
        }
    }

    // ── 코스 확장 (설계 §7-8) — 유닛 콘텐츠·한자 누적·다음 코스 연결 ────────

    /** 회화 최소 대사 수 — 설계/06 §5: 입문·N5·N4 2줄 / N3·N2 4줄 / N1 5줄 */
    private static int minDialogLinesOf(CourseCatalog.Course course) {
        return switch (course.levelCode) {
            case "N3", "N2" -> 4;
            case "N1" -> 5;
            default -> 2;
        };
    }

    @Test
    void all_units_of_available_courses_meet_content_contract_and_kanji_total_is_unique() throws Exception {
        // 코스·유닛 수·유닛당 한자 수는 CourseCatalog가 단일 출처다(2026-09-03 판정 H3) — 여기 숫자를 적지 않는다
        Set<String> allLetters = new HashSet<>();
        int letterTotal = 0;

        for (CourseCatalog.Course course : CourseCatalog.available()) {
            long courseId = course.id;
            int minDialogLines = minDialogLinesOf(course);
            for (int unitNo = 1; unitNo <= course.unitCount; unitNo++) {
                MvcResult result = mockMvc.perform(get("/api/courses/{courseId}/units/{unitNo}", courseId, unitNo))
                        .andExpect(status().isOk())
                        .andReturn();
                JsonNode data = objectMapper.readTree(result.getResponse().getContentAsString()).path("data");
                String at = "코스 " + courseId + " 유닛 " + unitNo;

                // 문법 2~3개, 각각 명칭·예문 존재 (빈 유닛 금지 — 확장 기획 인수 7·11·15)
                JsonNode grammars = data.path("grammars");
                assertThat(grammars.size()).as("%s 문법 수", at).isBetween(2, 3);
                for (JsonNode grammar : grammars) {
                    assertThat(grammar.path("name").asText()).as("%s 문법 명칭", at).isNotBlank();
                    assertThat(grammar.path("examples").size()).as("%s 예문", at).isGreaterThanOrEqualTo(1);
                }

                // 회화: 코스별 최소 대사 수 + 화자 2명 이상
                JsonNode lines = data.path("dialog").path("lines");
                assertThat(lines.size()).as("%s 회화 대사 수", at).isGreaterThanOrEqualTo(minDialogLines);
                Set<String> speakers = new HashSet<>();
                for (JsonNode line : lines) {
                    speakers.add(line.path("speaker").asText());
                }
                assertThat(speakers.size()).as("%s 화자 수", at).isGreaterThanOrEqualTo(2);

                // 한자: 유닛당 고정 수 + 전 코스 누적 중복 없음 (인수 8·13·16)
                JsonNode kanjis = data.path("kanjis");
                assertThat(kanjis.size()).as("%s 한자 수", at).isEqualTo(course.kanjiPerUnit);
                for (JsonNode kanji : kanjis) {
                    String letter = kanji.path("letter").asText();
                    assertThat(letter).as("%s 한자 글자", at).hasSize(1);
                    assertThat(allLetters.add(letter)).as("%s 한자 '%s' 중복(앞 코스·유닛과 겹침)", at, letter).isTrue();
                    letterTotal++;
                }

                // 어휘 15~20개
                assertThat(data.path("vocabularies").size()).as("%s 어휘 수", at).isBetween(15, 20);
            }
        }

        // 누적 한자 = 카탈로그 합계(현재 1,350 = 0+100+200+350+350+350), 중복 0 (인수 16)
        assertThat(letterTotal).isEqualTo(CourseCatalog.totalKanji());
        assertThat(allLetters).hasSize(CourseCatalog.totalKanji());
    }

    @Test
    void unit_study_last_unit_returns_next_course_link() throws Exception {
        // 마지막 유닛에서만 nextCourse 값 — 완료 화면의 "다음 코스 시작하기" 분기 (명세 §3-3, 확장 기획 인수 4·5)
        mockMvc.perform(get("/api/courses/{courseId}/units/{unitNo}", N5_COURSE_ID, 20))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.nextUnitNo").value(nullValue()))
                .andExpect(jsonPath("$.data.nextCourse.id").value(N4_COURSE_ID))
                .andExpect(jsonPath("$.data.nextCourse.title").value("초급"))
                .andExpect(jsonPath("$.data.nextCourse.levelLabel").value("JLPT N4"))
                .andExpect(jsonPath("$.data.nextCourse.status").value("AVAILABLE"));

        mockMvc.perform(get("/api/courses/{courseId}/units/{unitNo}", N4_COURSE_ID, 20))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.nextCourse.id").value(N3_COURSE_ID))
                .andExpect(jsonPath("$.data.nextCourse.status").value("AVAILABLE"));

        mockMvc.perform(get("/api/courses/{courseId}/units/{unitNo}", N3_COURSE_ID, 25))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.nextCourse.id").value(N2_COURSE_ID))
                .andExpect(jsonPath("$.data.nextCourse.status").value("AVAILABLE"));

        // N2 완료: 다음 코스는 N1이다. 상태는 표에서 파생한다(N1 개통 후 AVAILABLE — 인수 5)
        mockMvc.perform(get("/api/courses/{courseId}/units/{unitNo}", N2_COURSE_ID, 25))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.nextCourse.id").value(N1_COURSE_ID))
                .andExpect(jsonPath("$.data.nextCourse.status")
                        .value(CourseCatalog.byId(N1_COURSE_ID).available ? "AVAILABLE" : "PREPARING"));

        // 마지막 유닛이 아니면 nextCourse는 항상 null
        mockMvc.perform(get("/api/courses/{courseId}/units/{unitNo}", N5_COURSE_ID, 1))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.nextCourse").value(nullValue()));
    }

    // ── 활용 규칙표 (계약 확장 — 설계 §7-7, 2026-08-06) ─────────────────────

    @Test
    void unit_study_conjugation_grammars_have_rules_table() throws Exception {
        // N5 필수 3건(§7-7): 유닛 18 ① て형 ≥5행 / 유닛 16 ① 형용사 과거형 ≥4행 / 유닛 20 ① ない형 ≥3행
        assertGrammarHasRules(N5_COURSE_ID, 18, 0, 5);
        assertGrammarHasRules(N5_COURSE_ID, 16, 0, 4);
        assertGrammarHasRules(N5_COURSE_ID, 20, 0, 3);
    }

    @Test
    void unit_study_new_course_conjugation_grammars_have_rules_table() throws Exception {
        // §7-8 확정 대상 — ★ 후보 18개 중 N4 7 / N3 6 / N2 5 (확장 기획 인수 9)
        long[][] targets = {
                // {courseId, unitNo, 문법 index(0-base), 최소 행}
                {N4_COURSE_ID, 1, 0, 3},   // 사전형 변환
                {N4_COURSE_ID, 2, 0, 5},   // た형 (N5 て형 평행)
                {N4_COURSE_ID, 3, 0, 4},   // 보통형 활용표
                {N4_COURSE_ID, 6, 0, 3},   // 가능형
                {N4_COURSE_ID, 9, 0, 3},   // 의지형
                {N4_COURSE_ID, 14, 0, 4},  // 명령형·금지형
                {N4_COURSE_ID, 16, 0, 3},  // 양태 そうだ 접속
                {N3_COURSE_ID, 2, 0, 3},   // 수동형
                {N3_COURSE_ID, 4, 0, 3},   // 사역형
                {N3_COURSE_ID, 5, 0, 3},   // 사역수동형
                {N3_COURSE_ID, 6, 0, 3},   // ば형
                {N3_COURSE_ID, 18, 0, 4},  // 존경 특수동사 대응표
                {N3_COURSE_ID, 19, 0, 4},  // 겸양 특수동사 대응표
                {N2_COURSE_ID, 2, 1, 2},   // 〜ざるを得ない 접속 (문법②)
                {N2_COURSE_ID, 18, 0, 2},  // 〜まい 접속
                {N2_COURSE_ID, 19, 0, 4},  // 겸양어Ⅰ·Ⅱ 대응표
                {N2_COURSE_ID, 22, 0, 3},  // である체 전환
                {N2_COURSE_ID, 22, 1, 2},  // 연용중지형 (문법②)
        };
        for (long[] target : targets) {
            assertGrammarHasRules(target[0], (int) target[1], (int) target[2], (int) target[3]);
        }
    }

    private void assertGrammarHasRules(long courseId, int unitNo, int grammarIndex, int minRules) throws Exception {
        MvcResult result = mockMvc.perform(get("/api/courses/{courseId}/units/{unitNo}", courseId, unitNo))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.grammars[" + grammarIndex + "].rules").isArray())
                .andReturn();

        JsonNode rules = objectMapper.readTree(result.getResponse().getContentAsString())
                .path("data").path("grammars").get(grammarIndex).path("rules");

        String at = "코스 " + courseId + " 유닛 " + unitNo + " 문법[" + grammarIndex + "]";
        assertThat(rules.size()).as("%s 규칙표 행 수", at).isGreaterThanOrEqualTo(minRules);
        // 표가 예문보다 커지지 않게 최대 8행 (설계 §7-7·§7-8 공통)
        assertThat(rules.size()).as("%s 규칙표 상한", at).isLessThanOrEqualTo(8);
        for (JsonNode rule : rules) {
            assertThat(rule.path("groupLabel").asText()).isNotBlank();
            assertThat(rule.path("pattern").asText()).isNotBlank();
            assertThat(rule.path("exampleBefore").asText()).isNotBlank();
            assertThat(rule.path("exampleAfter").asText()).isNotBlank();
        }
    }

    @Test
    void unit_study_grammar_without_rules_returns_empty_array() throws Exception {
        // 규칙표 미지정 문법(유닛 1 전부)은 rules가 항상 "빈 배열"(null 아님) — 기존 문법 무변경 계약
        MvcResult result = mockMvc.perform(get("/api/courses/{courseId}/units/{unitNo}", N5_COURSE_ID, 1))
                .andExpect(status().isOk())
                .andReturn();

        JsonNode grammars = objectMapper.readTree(result.getResponse().getContentAsString())
                .path("data").path("grammars");
        assertThat(grammars.size()).isGreaterThanOrEqualTo(1);
        for (JsonNode grammar : grammars) {
            JsonNode rules = grammar.path("rules");
            assertThat(rules.isArray()).as("문법 '%s'의 rules는 배열", grammar.path("name").asText()).isTrue();
            assertThat(rules.size()).as("문법 '%s'의 rules는 빈 배열", grammar.path("name").asText()).isZero();
        }
    }

    // ── SPA 라우팅 (링크 공유 — 인수 19) ────────────────────────────────────

    @Test
    void spa_course_routes_forward_to_index_without_login() throws Exception {
        mockMvc.perform(get("/courses"))
                .andExpect(status().isOk())
                .andExpect(forwardedUrl("/index.html"));

        mockMvc.perform(get("/courses/{courseId}", N5_COURSE_ID))
                .andExpect(status().isOk())
                .andExpect(forwardedUrl("/index.html"));

        mockMvc.perform(get("/courses/{courseId}/units/{unitNo}", N5_COURSE_ID, 3))
                .andExpect(status().isOk())
                .andExpect(forwardedUrl("/index.html"));
    }
}
