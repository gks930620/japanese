package com.test.test.integration;

import com.fasterxml.jackson.databind.JsonNode;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.HashSet;
import java.util.Iterator;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Set;
import java.util.regex.Pattern;
import org.junit.jupiter.api.Test;
import org.springframework.test.web.servlet.MvcResult;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * 영어 콘텐츠 규칙 전수 검증 (설계/06 §11) — senior-dev 작성.
 *
 * <p><b>왜 이 파일이 생겼나</b>: 기존 영어 테스트 3건({@code EnglishCourseApiIntegrationTest} ·
 * {@code EnglishCourseDetailIntegrationTest} · {@code EnglishPartOfSpeechContractIntegrationTest})은
 * <b>경로와 응답 모양</b>만 본다. 콘텐츠 전수 검증인 {@code CourseApiIntegrationTest}는
 * {@code CourseCatalog.available()}(= 일본어)만 순회하므로 <b>영어 콘텐츠는 어떤 규칙 검증도 받지 않았다</b>.
 * 계약 문서가 "테스트로 강제한다"고 적어 둔 표현 중복 금지조차 테스트가 없었다(설계/06 §11-11).
 * 즉 <b>규칙을 어긴 영어 콘텐츠를 넣어도 {@code ./gradlew test}가 통과</b>하는 상태였고, 이 파일이 그것을 닫는다.
 *
 * <p><b>이 테스트가 보는 것은 데이터이지 필터가 아니다.</b> {@code EnglishPartOfSpeechContractIntegrationTest}는
 * "요청 파라미터로 일본어 품사를 주면 400"을 보지만, 그것이 통과해도 <b>시드에 일본어 품사가 들어 있는</b> 것은 잡지 못한다.
 * 여기서는 실제 응답에 실려 나가는 값을 전부 훑는다.
 *
 * <p>순회 대상·기대치는 {@link EnglishContentCatalog}(코스 목록은 {@link CourseCatalog#ENGLISH})가 단일 출처다 —
 * 숫자·코스 목록을 이 파일에 적지 않는다(2026-09 점검 H3).
 *
 * <p>이 테스트를 수정하지 말 것 — 계약 변경은 senior-dev 경유 (CLAUDE.md TDD 규칙 2).
 */
class EnglishContentRuleIntegrationTest extends ApiIntegrationTestSupport {

    // ── 규칙 1. kana 전량 NULL (설계/06 §11-3) ────────────────────────────────

    /**
     * <b>일본어와 정반대 방향의 검증이다.</b> 일본어는 "원문에 한자가 있으면 kana를 채워라"지만,
     * 영어에는 한자도 가나도 없으므로 <b>kana를 채우는 것 자체가 오류</b>다 — 채우면 {@code KanaContract}가
     * 그 데이터를 거부한다(에디터 저장 시). 시드로 직접 넣은 값은 그 관문을 지나지 않으므로 여기서 잡는다.
     *
     * <p>필드 이름으로 재귀 탐색하는 이유: kana를 가진 자리가 앞으로 늘 수 있다(지금은 문법 예문·회화 대사).
     * 자리를 열거하면 <b>새로 생긴 자리가 검증에서 빠진다</b> — 일본어 전수 검증이 입문·N1을 놓쳤던 것과 같은 구멍이다.
     */
    @Test
    void english_content_never_carries_kana() throws Exception {
        for (CourseCatalog.Course course : EnglishContentCatalog.availableCourses()) {
            for (int unitNo = 1; unitNo <= course.unitCount; unitNo++) {
                assertNoKana(unit(course.id, unitNo), "코스 " + course.id + " 유닛 " + unitNo + " 응답");
            }
        }
        // 자료실 어휘는 일본어와 DTO를 공유해 kana 필드가 실려 나간다 — 시드에 값이 들어가면 여기서 드러난다
        for (JsonNode vocabulary : allLibraryItems("/api/en/library/vocabulary")) {
            assertNoKana(vocabulary, "영어 자료실 어휘 '" + vocabulary.path("word").asText() + "'");
        }
    }

    /** 응답 트리 어디에 있든 {@code kana}라는 이름의 값은 null이어야 한다 */
    private void assertNoKana(JsonNode node, String where) {
        if (node.isObject()) {
            Iterator<Map.Entry<String, JsonNode>> fields = node.fields();
            while (fields.hasNext()) {
                Map.Entry<String, JsonNode> field = fields.next();
                if ("kana".equals(field.getKey())) {
                    assertThat(field.getValue().isNull())
                            .as("%s — 영어 콘텐츠의 kana는 전량 NULL이어야 한다(설계/06 §11-3). 들어온 값: '%s'",
                                    where, field.getValue().asText())
                            .isTrue();
                }
                assertNoKana(field.getValue(), where);
            }
        } else if (node.isArray()) {
            for (JsonNode child : node) {
                assertNoKana(child, where);
            }
        }
    }

    // ── 공통 조회 도우미 ──────────────────────────────────────────────────────

    private JsonNode unit(long courseId, int unitNo) throws Exception {
        MvcResult result = mockMvc.perform(get("/api/en/courses/{courseId}/units/{unitNo}", courseId, unitNo))
                .andExpect(status().isOk())
                .andReturn();
        return objectMapper.readTree(result.getResponse().getContentAsString()).path("data");
    }

    /**
     * 자료실 목록 전부 — <b>페이지를 끝까지 넘긴다</b>. size를 크게 주면 서버가 100으로 깎으므로
     * 콘텐츠가 100건을 넘는 순간 조용히 뒷부분이 검증에서 빠진다.
     */
    private List<JsonNode> allLibraryItems(String path) throws Exception {
        List<JsonNode> items = new ArrayList<>();
        int page = 0;
        while (true) {
            MvcResult result = mockMvc.perform(get(path).param("page", String.valueOf(page)).param("size", "100"))
                    .andExpect(status().isOk())
                    .andReturn();
            JsonNode data = objectMapper.readTree(result.getResponse().getContentAsString()).path("data");
            data.path("content").forEach(items::add);
            if (data.path("last").asBoolean(true)) {
                break;
            }
            page++;
        }
        assertThat(items).as("%s 가 비어 있다 — 검증할 콘텐츠가 없으면 통과는 의미가 없다", path).isNotEmpty();
        return items;
    }

    /** 유닛 응답의 어휘 + 표현 — 발음·품사·중복 규칙이 모두 이 둘을 대상으로 한다 */
    private Map<String, List<JsonNode>> unitVocabulariesAndExpressions(JsonNode unit) {
        Map<String, List<JsonNode>> bag = new HashMap<>();
        bag.put("어휘", toList(unit.path("vocabularies")));
        bag.put("표현", toList(unit.path("expressions")));
        return bag;
    }

    private List<JsonNode> toList(JsonNode array) {
        List<JsonNode> list = new ArrayList<>();
        array.forEach(list::add);
        return list;
    }

    /** null·미존재 노드를 빈 문자열로 — {@code asText()}는 null 노드를 문자열 "null"로 만든다 */
    private String text(JsonNode node) {
        return node.isNull() || node.isMissingNode() ? "" : node.asText();
    }

    // ── 규칙 2. 발음은 ipa + koApprox 둘 다 (설계/06 §11-3 · 08 F-18) ─────────

    /**
     * 영어에는 kana가 없으므로 <b>발음을 전달하는 통로가 이 두 컬럼뿐</b>이고, 그래서 둘 다 필수다
     * (§11-9 — 음성 재생도 없다). IPA만 있으면 못 읽는 학습자가 있고, 한글만 있으면 잘못된 발음이 굳는다.
     * <b>한쪽만 채운 데이터는 규칙 위반 이전에 미완성</b>이다(08 F-18 확정).
     *
     * <p>자료실까지 훑는 이유: 유닛에만 넣고 자료실에서 빠지면 <b>같은 단어가 화면마다 다르게 보인다</b>(계약 §7-3).
     */
    @Test
    void english_vocabulary_and_expressions_carry_both_ipa_and_korean_approximation() throws Exception {
        for (CourseCatalog.Course course : EnglishContentCatalog.availableCourses()) {
            for (int unitNo = 1; unitNo <= course.unitCount; unitNo++) {
                JsonNode unit = unit(course.id, unitNo);
                String at = "코스 " + course.id + " 유닛 " + unitNo;
                unitVocabulariesAndExpressions(unit).forEach((kind, items) -> {
                    assertThat(items).as("%s %s 가 비어 있다", at, kind).isNotEmpty();
                    items.forEach(item -> assertPronunciation(item, at + " " + kind));
                });
            }
        }
        for (JsonNode vocabulary : allLibraryItems("/api/en/library/vocabulary")) {
            assertPronunciation(vocabulary, "영어 자료실 어휘");
        }
        for (JsonNode expression : allLibraryItems("/api/en/library/expressions")) {
            assertPronunciation(expression, "영어 자료실 표현");
        }
    }

    private void assertPronunciation(JsonNode item, String where) {
        String label = text(item.path("word")) + text(item.path("text"));
        String ipa = text(item.path("ipa"));
        String koApprox = text(item.path("koApprox"));

        assertThat(ipa)
                .as("%s '%s' — ipa가 없다. 영어 발음은 ipa와 koApprox를 둘 다 채운다(설계/06 §11-3, 08 F-18)",
                        where, label)
                .isNotBlank();
        assertThat(koApprox)
                .as("%s '%s' — koApprox가 없다. 한쪽만 채운 데이터는 미완성이다(설계/06 §11-3)", where, label)
                .isNotBlank();
        assertThat(ipa)
                .as("%s '%s' — ipa는 슬래시로 감싼다(예: /ˈmɔːrnɪŋ/)", where, label)
                .startsWith("/").endsWith("/");
    }

    // ── 규칙 3. 품사는 영어 7종만 (설계/06 §11-6) ─────────────────────────────

    /**
     * 값의 집합이 일본어와 다르다. {@code I_ADJECTIVE}·{@code NA_ADJECTIVE}는 <b>활용 유형이 갈리는
     * 일본어 전용 사정</b>이고 영어 형용사에는 그 분기가 없어 {@code ADJECTIVE} 하나다.
     * {@code EXPRESSION}(일본어 코드)의 영어 대응은 {@code PHRASE}다.
     *
     * <p>{@code EnglishPartOfSpeechContractIntegrationTest}와 겹치지 않는다 — 그쪽은 <b>필터 파라미터</b>를,
     * 여기서는 <b>실제로 실려 나가는 데이터</b>를 본다. 필터가 400을 내도 시드에 일본어 코드가 들어 있으면 그대로 나간다.
     */
    @Test
    void english_vocabulary_uses_only_english_parts_of_speech() throws Exception {
        for (CourseCatalog.Course course : EnglishContentCatalog.availableCourses()) {
            for (int unitNo = 1; unitNo <= course.unitCount; unitNo++) {
                JsonNode unit = unit(course.id, unitNo);
                for (JsonNode vocabulary : unit.path("vocabularies")) {
                    assertPartOfSpeech(vocabulary, "코스 " + course.id + " 유닛 " + unitNo + " 어휘");
                }
            }
        }
        for (JsonNode vocabulary : allLibraryItems("/api/en/library/vocabulary")) {
            assertPartOfSpeech(vocabulary, "영어 자료실 어휘");
        }
    }

    private void assertPartOfSpeech(JsonNode vocabulary, String where) {
        String word = text(vocabulary.path("word"));
        String partOfSpeech = text(vocabulary.path("partOfSpeech"));

        assertThat(partOfSpeech)
                .as("%s '%s' — 품사가 비었다. 모든 어휘에 값이 하나씩 들어간다(설계/06 §11-6)", where, word)
                .isNotBlank();
        assertThat(EnglishContentCatalog.JAPANESE_ONLY_PART_OF_SPEECH)
                .as("%s '%s' — 일본어 전용 품사 '%s'를 영어에 그대로 가져왔다. 영어는 ADJECTIVE·PHRASE를 쓴다(설계/06 §11-6)",
                        where, word, partOfSpeech)
                .doesNotContain(partOfSpeech);
        assertThat(EnglishContentCatalog.ALLOWED_PART_OF_SPEECH)
                .as("%s '%s' — 영어 품사 7종에 없는 코드 '%s'(설계/06 §11-6)", where, word, partOfSpeech)
                .contains(partOfSpeech);
    }

    // ── 규칙 4. 코스 내부 중복 금지 (계약 §B-1 · 설계/06 §11-5) ────────────────

    /**
     * ⚠️ <b>한자와 정반대다.</b> 한자는 코스 간 중복이 금지({@code kanji.letter} UNIQUE)지만,
     * 영어 표현은 <b>코스 간 재등장이 허용</b>된다 — 상위 코스에서 다른 뉘앙스·격식으로 다시 나오는 것은 정당한 복습이고,
     * 그래서 {@code expression.text}에 UNIQUE를 걸지 않았다. 금지되는 것은 <b>한 코스 안에서 같은 것을 두 번 배우게 하는 것</b>뿐이다.
     * 그러므로 이 검사는 <b>코스마다 장부를 새로 편다</b> — 코스를 가로질러 모으면 허용된 재등장을 결함으로 잡는다.
     *
     * <p>어휘도 같은 규칙이라 함께 본다(설계/06 §11-6 — 일본어 §7과 동일).
     * 계약 §B-1이 "테스트로 강제한다"고 적어 두고 <b>2026-09-08까지 비어 있던 자리</b>가 여기다.
     */
    @Test
    void expressions_and_vocabulary_are_not_duplicated_within_a_course() throws Exception {
        for (CourseCatalog.Course course : EnglishContentCatalog.availableCourses()) {
            Map<String, Integer> expressionSeen = new HashMap<>();
            Map<String, Integer> vocabularySeen = new HashMap<>();

            for (int unitNo = 1; unitNo <= course.unitCount; unitNo++) {
                JsonNode unit = unit(course.id, unitNo);

                for (JsonNode expression : unit.path("expressions")) {
                    assertFirstTimeInCourse(expressionSeen, text(expression.path("text")), course, unitNo, "표현");
                }
                for (JsonNode vocabulary : unit.path("vocabularies")) {
                    assertFirstTimeInCourse(vocabularySeen, text(vocabulary.path("word")), course, unitNo, "어휘");
                }
            }
        }
    }

    private void assertFirstTimeInCourse(Map<String, Integer> seen, String rawText,
                                         CourseCatalog.Course course, int unitNo, String kind) {
        // 표기 흔들림(대소문자·앞뒤 공백)으로 빠져나가지 못하게 정규화한다 — 학습자에게는 같은 항목이다
        String key = rawText.trim().toLowerCase(Locale.ROOT);
        Integer previous = seen.putIfAbsent(key, unitNo);
        assertThat(previous)
                .as("코스 %s(%s) %s '%s' 중복 — 유닛 %s에 이미 나왔다. 한 코스 안에서 같은 것을 두 번 가르치지 않는다"
                                + "(계약 §B-1). 코스 간 중복은 허용이므로 다른 코스로 옮기는 것은 해결책이 된다.",
                        course.id, course.title, kind, rawText, previous)
                .isNull();
    }

    // ── 규칙 5. 레벨 코드는 E1~E5, levelLabel은 쓰지 않는다 (설계/06 §11-2) ───

    /**
     * 영어에는 JLPT가 없다. 레벨 값이 섞이면 자료실 필터가 400을 내므로 <b>콘텐츠에 JLPT 코드가 들어가는 순간
     * 그 항목은 영어 자료실에서 영영 조회되지 않는다</b>.
     *
     * <p>{@code levelLabel}까지 보는 이유: 영어는 <b>코스명이 곧 단계 이름</b>이라 라벨을 표시에 쓰지 않기로 했고,
     * 시드는 코드와 같은 값을 넣어 둔다. 여기에 "영어 1단계" 같은 표시용 문구가 들어가면
     * <b>라벨을 필터에 넘겨 0건</b>이 되는 3단계 qa 치명 결함이 영어에서 재발한다.
     * CEFR를 함께 막는 것도 같은 이유다 — 내부 난이도 참고선일 뿐 학습자에게 노출하지 않기로 했다.
     */
    @Test
    void english_uses_e_level_codes_and_never_a_display_label() throws Exception {
        // 기대치 표 자체 점검 — 표에 JLPT 코드를 적어 넣고 통과시키는 길을 막는다
        for (CourseCatalog.Course expected : CourseCatalog.ENGLISH) {
            assertThat(expected.levelCode)
                    .as("기대치 표(CourseCatalog.ENGLISH)의 영어 레벨 코드는 E1~E5여야 한다")
                    .matches(EnglishContentCatalog.LEVEL_CODE_PATTERN);
        }

        MvcResult result = mockMvc.perform(get("/api/en/courses"))
                .andExpect(status().isOk())
                .andReturn();
        JsonNode courses = objectMapper.readTree(result.getResponse().getContentAsString()).path("data");
        assertThat(courses).hasSize(CourseCatalog.ENGLISH.size());

        for (JsonNode course : courses) {
            String title = text(course.path("title"));
            String levelCode = text(course.path("levelCode"));
            int courseNo = course.path("courseNo").asInt();

            assertThat(levelCode)
                    .as("코스 '%s' — 영어 레벨 코드는 E1~E5다. JLPT 코드가 섞이면 그 항목은 영어 자료실에서 조회되지 않는다"
                            + "(설계/06 §11-2)", title)
                    .matches(EnglishContentCatalog.LEVEL_CODE_PATTERN);
            assertThat(levelCode)
                    .as("코스 '%s' — 레벨 코드는 코스 번호와 일치한다(코스 %s → E%s)", title, courseNo, courseNo)
                    .isEqualTo("E" + courseNo);
            assertThat(text(course.path("levelLabel")))
                    .as("코스 '%s' — 영어는 levelLabel을 표시에 쓰지 않으므로 코드와 같은 값이어야 한다."
                            + " 표시용 문구를 넣으면 화면이 그것을 필터에 넘겨 0건이 된다(설계/06 §11-2)", title)
                    .isEqualTo(levelCode);

            assertNoCefrCode(title, "코스 '" + title + "' 코스명");
            assertNoCefrCode(text(course.path("targetAudience")), "코스 '" + title + "' 대상");
            assertNoCefrCode(text(course.path("goal")), "코스 '" + title + "' 목표");
            assertNoCefrCode(text(course.path("notice")), "코스 '" + title + "' 안내");
        }

        // 콘텐츠에 실려 나가는 레벨 값도 전부 E 코드다 — 레벨은 유닛이 속한 코스에서 파생된다
        for (JsonNode grammar : allLibraryItems("/api/en/library/grammar")) {
            assertEnglishLevel(text(grammar.path("level")), "자료실 문법 '" + text(grammar.path("name")) + "'");
        }
        for (JsonNode expression : allLibraryItems("/api/en/library/expressions")) {
            assertEnglishLevel(text(expression.path("level")), "자료실 표현 '" + text(expression.path("text")) + "'");
        }
        for (JsonNode vocabulary : allLibraryItems("/api/en/library/vocabulary")) {
            for (JsonNode level : vocabulary.path("levels")) {
                assertEnglishLevel(text(level), "자료실 어휘 '" + text(vocabulary.path("word")) + "'");
            }
        }
    }

    private void assertEnglishLevel(String level, String where) {
        assertThat(EnglishContentCatalog.levelCodes())
                .as("%s — 레벨 '%s'는 영어 코드가 아니다. 영어 콘텐츠의 레벨은 그 유닛이 속한 코스의 level_code에서"
                        + " 파생된다(설계/06 §11-2)", where, level)
                .contains(level);
    }

    private void assertNoCefrCode(String value, String where) {
        for (String cefr : EnglishContentCatalog.CEFR_CODES) {
            assertThat(Pattern.compile("\b" + cefr + "\b").matcher(value).find())
                    .as("%s에 CEFR 코드 '%s'가 노출됐다. CEFR는 내부 난이도 참고선일 뿐 학습자에게 보이지 않는다"
                            + "(설계/06 §11-2). 문구: '%s'", where, cefr, value)
                    .isFalse();
        }
    }

    // ── 규칙 6. 유닛 구성 수량 (설계/06 §11-4 · §11-5 · §11-7 · §11-8) ────────

    /**
     * <b>콘텐츠를 채우기 전에 치는 그물이다.</b> §11-4의 수량 표는 2026-09-21까지 "사람이 지켜야 하는 것"이었다 —
     * 일본어 전수 검증({@code CourseApiIntegrationTest})은 {@code CourseCatalog.available()}(= 일본어)만 순회하므로
     * <b>영어 유닛은 표현이 3개여도 어휘가 40개여도 {@code ./gradlew test}가 통과</b>했다.
     * 맛보기 2유닛이 규칙을 지키고 있어 <b>지금은 Green이 정상</b>이고, 이 테스트가 막는 대상은 앞으로 들어올 콘텐츠다.
     *
     * <p>실패 메시지에 <b>어느 코스·어느 유닛·무엇이 몇 개인지</b>를 전부 담는다 — 콘텐츠 작업자가 메시지만 보고
     * 고칠 수 있어야 하고, "어딘가 틀렸다"는 메시지는 전수 검증의 값어치를 절반 깎아먹는다.
     *
     * <p>기대 수량은 {@link EnglishContentCatalog}가, 순회 범위는 {@link CourseCatalog#ENGLISH}가 단일 출처다 —
     * 코스가 열리고 유닛이 늘어도 <b>이 파일을 고치지 않는다</b>(2026-09 점검 H3).
     *
     * <p><b>여기서 보지 않는 것 둘</b>(08 C-11 — 한 규칙은 한 파일에서만 고정한다):
     * <ul>
     *   <li>§11-4의 <b>한자 0행</b> — 영어 유닛 DTO에 {@code kanjis} 필드 자체가 없어 구조적으로 불가능하고,
     *       그 부재는 {@code EnglishCourseApiIntegrationTest}가 고정한다(자료실 한자 탭 부재도 같은 파일).</li>
     *   <li>표현·어휘의 <b>발음·품사</b> — 위 규칙 2·3이 이미 전량을 훑는다. 여기서는 <b>개수</b>만 본다.</li>
     * </ul>
     */
    @Test
    void every_english_unit_meets_the_quantity_contract() throws Exception {
        for (CourseCatalog.Course course : EnglishContentCatalog.availableCourses()) {
            for (int unitNo = 1; unitNo <= course.unitCount; unitNo++) {
                JsonNode unit = unit(course.id, unitNo);
                String at = "코스 " + course.id + "(" + course.title + ") 유닛 " + unitNo;

                assertGrammars(unit, at);
                assertDialog(unit, course, at);
                assertExpressions(unit, at);
                assertVocabularies(unit, at);
            }
        }
    }

    /** 문법 2~3개 · 문법당 예문 1개 이상 (§11-4 · §11-8) */
    private void assertGrammars(JsonNode unit, String at) {
        JsonNode grammars = unit.path("grammars");
        assertThat(grammars.size())
                .as("%s — 문법이 %s개다. 유닛당 %s~%s개여야 한다(설계/06 §11-4). 넘치면 다음 유닛으로 옮긴다",
                        at, grammars.size(),
                        EnglishContentCatalog.MIN_GRAMMARS_PER_UNIT, EnglishContentCatalog.MAX_GRAMMARS_PER_UNIT)
                .isBetween(EnglishContentCatalog.MIN_GRAMMARS_PER_UNIT, EnglishContentCatalog.MAX_GRAMMARS_PER_UNIT);

        for (JsonNode grammar : grammars) {
            String name = text(grammar.path("name"));
            assertThat(grammar.path("examples").size())
                    .as("%s 문법 '%s' — 예문이 %s개다. 문법 하나당 %s개 이상이어야 한다(설계/06 §11-4·§11-8)."
                                    + " 설명만 있고 예문이 없는 문법은 학습자에게 규칙만 던지는 것이다",
                            at, name, grammar.path("examples").size(),
                            EnglishContentCatalog.MIN_EXAMPLES_PER_GRAMMAR)
                    .isGreaterThanOrEqualTo(EnglishContentCatalog.MIN_EXAMPLES_PER_GRAMMAR);
        }
    }

    /**
     * 회화 정확히 1편 · 대사 줄 수 · 화자 2명 이상 (§11-7 · §11-12 ②).
     *
     * <p>"정확히 1편"은 응답 구조가 이미 보장한다({@code dialog}는 배열이 아니라 객체 하나) — 그래서 여기서 볼 것은
     * <b>그 하나가 실제로 있는가</b>다. 매핑을 빠뜨린 유닛은 {@code dialog: null}로 나가고 화면의 회화 스텝이 사라진다.
     *
     * <p><b>줄 수는 2026-09-21에 계약이 됐다</b>(그전까지 §11-12의 미결이라 이 자리는 주석이었다):
     * 하한 E1·E2 4 / E3·E4 6 / E5 8, 상한 전 코스 12. 하한을 코스별로 차등한 것은
     * <b>영어 코스의 단계 정의 자체가 "얼마나 길게 말할 수 있느냐"</b> 이기 때문이다 — E3의 이름이 「이어 말하기」이고
     * E5는 회의·이메일이다. 줄 수가 고정이면 코스가 올라가도 <b>장면의 길이가 같아 단계 체감이 없다</b>
     * (일본어가 N3부터 4줄로 올린 것과 같은 논리). 상한 12는 목표가 아니라 <b>난간</b>이다 —
     * 회화는 한 스텝에 통째로 들어가므로 길어지면 스크롤만 남는다.
     */
    private void assertDialog(JsonNode unit, CourseCatalog.Course course, String at) {
        JsonNode dialog = unit.path("dialog");
        assertThat(dialog.isObject())
                .as("%s — 회화가 없다(dialog = %s). 유닛당 정확히 1편이다(설계/06 §11-7)", at, dialog)
                .isTrue();
        assertThat(text(dialog.path("title")))
                .as("%s 회화 — 한국어 장면 제목이 비었다(설계/06 §11-7 예: '첫 출근 날, 옆자리에서')", at)
                .isNotBlank();

        JsonNode lines = dialog.path("lines");
        int minLines = EnglishContentCatalog.minDialogLinesOf(course);
        assertThat(lines.size())
                .as("%s 회화 '%s' — 대사가 %s줄이다. %s 코스는 %s~%s줄이어야 한다(설계/06 §11-7 · §11-12 ②)."
                                + " 하한은 코스가 올라갈수록 길어지고(E1·E2 4 · E3·E4 6 · E5 8), 상한 12는"
                                + " 회화가 한 스텝에 통째로 들어가기 때문에 둔 난간이다",
                        at, text(dialog.path("title")), lines.size(), course.levelCode,
                        minLines, EnglishContentCatalog.MAX_DIALOG_LINES)
                .isBetween(minLines, EnglishContentCatalog.MAX_DIALOG_LINES);

        Set<String> speakers = new HashSet<>();
        for (JsonNode line : lines) {
            assertThat(text(line.path("speaker")))
                    .as("%s 회화 — 화자 이름이 빈 대사가 있다. 화면이 화자 배지를 그리지 못한다(설계/06 §11-7)", at)
                    .isNotBlank();
            speakers.add(text(line.path("speaker")));
        }
        assertThat(speakers.size())
                .as("%s 회화 '%s' — 화자가 %s명(%s)이다. %s명 이상이어야 한다. 1인 낭독 장면은 만들지 않는다(설계/06 §11-7)",
                        at, text(dialog.path("title")), speakers.size(), speakers,
                        EnglishContentCatalog.MIN_DIALOG_SPEAKERS)
                .isGreaterThanOrEqualTo(EnglishContentCatalog.MIN_DIALOG_SPEAKERS);
    }

    /** 표현 6~10개 · 표현당 예문 1개 이상 (§11-4 · §11-5) */
    private void assertExpressions(JsonNode unit, String at) {
        JsonNode expressions = unit.path("expressions");
        assertThat(expressions.size())
                .as("%s — 표현이 %s개다. 유닛당 %s~%s개여야 한다(설계/06 §11-4). 일본어 한자 자리이며,"
                                + " 모자라면 그 유닛의 회화·문법과 같은 테마에서 더 뽑는다(§11-5)",
                        at, expressions.size(),
                        EnglishContentCatalog.MIN_EXPRESSIONS_PER_UNIT, EnglishContentCatalog.MAX_EXPRESSIONS_PER_UNIT)
                .isBetween(EnglishContentCatalog.MIN_EXPRESSIONS_PER_UNIT,
                        EnglishContentCatalog.MAX_EXPRESSIONS_PER_UNIT);

        for (JsonNode expression : expressions) {
            String label = text(expression.path("text"));
            assertThat(label)
                    .as("%s — 표기가 빈 표현이 있다(설계/06 §11-5)", at)
                    .isNotBlank();
            assertThat(expression.path("examples").size())
                    .as("%s 표현 '%s' — 예문이 %s개다. 표현 하나당 %s개 이상이어야 한다(설계/06 §11-5)."
                                    + " 통째로 외워 쓰는 덩어리는 쓰이는 문장 없이는 외울 수 없다",
                            at, label, expression.path("examples").size(),
                            EnglishContentCatalog.MIN_EXAMPLES_PER_EXPRESSION)
                    .isGreaterThanOrEqualTo(EnglishContentCatalog.MIN_EXAMPLES_PER_EXPRESSION);
        }
    }

    /** 어휘 15~20개 (§11-4) */
    private void assertVocabularies(JsonNode unit, String at) {
        JsonNode vocabularies = unit.path("vocabularies");
        assertThat(vocabularies.size())
                .as("%s — 어휘가 %s개다. 유닛당 %s~%s개여야 한다(설계/06 §11-4, 일본어와 같은 값)",
                        at, vocabularies.size(),
                        EnglishContentCatalog.MIN_VOCABULARIES_PER_UNIT,
                        EnglishContentCatalog.MAX_VOCABULARIES_PER_UNIT)
                .isBetween(EnglishContentCatalog.MIN_VOCABULARIES_PER_UNIT,
                        EnglishContentCatalog.MAX_VOCABULARIES_PER_UNIT);
    }
}
