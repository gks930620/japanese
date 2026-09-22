package com.test.test.integration;

import com.fasterxml.jackson.databind.JsonNode;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;
import org.junit.jupiter.api.Test;
import org.springframework.test.web.servlet.MvcResult;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * 어휘 병합 키는 <b>표기 + 읽기</b>이고, <b>읽기는 일본어에서 {@code kana} · 영어에서 {@code ipa}</b>다
 * (설계/04 §3-7 병합 키 · 08 A-2 · 06 §11-3).
 *
 * <p><b>왜 이 파일이 생겼나 (2026-09-23, senior-dev — TDD Red)</b>
 *
 * <p>규칙 자체는 처음부터 "읽기가 다르면 별개 행"이었다(08 A-2). 그런데 구현이 그 규칙을
 * {@code (word, kana)} 라는 <b>일본어 컬럼 이름</b>으로 박아 두었고, 영어 어휘는 {@code kana}가
 * <b>전량 NULL</b>이다(설계/06 §11-3 — {@code EnglishContentRuleIntegrationTest} 규칙 1이 그것을 강제한다).
 * 그래서 영어에서는 키가 사실상 {@code word} 하나로 축약되고, <b>발음이 다른 동철이음어가 한 행으로 뭉개진다</b>.
 *
 * <p>학습자에게 나타나는 모습(2026-09-23 실서버 확인): 자료실에서 {@code close}를 찾으면
 * <b>「닫다」라는 뜻 옆에 {@code /kloʊs/ 클로-스}(형용사 발음)가 붙어 있고 품사는 {@code ADJECTIVE} 하나만 뜬다.</b>
 * 동사 {@code close}는 {@code /kloʊz/}다. <b>발음을 배우러 온 화면이 발음을 틀리게 알려 준다</b> —
 * 영어 어휘의 발음 통로는 {@code ipa}·{@code koApprox} 둘뿐이라(08 F-18) 이것이 곧 데이터의 소실이다.
 *
 * <p><b>이 파일이 고정하는 계약 셋</b>
 * <ol>
 *   <li>{@link #an_english_homograph_with_two_pronunciations_is_two_rows} — <b>갈라야 하는 것</b>.
 *       {@code close}는 두 행이고 각 행의 {@code ipa}·{@code koApprox}·{@code partOfSpeech}가 그 뜻의 값이다.</li>
 *   <li>{@link #an_english_word_with_one_pronunciation_stays_one_row} — <b>붙여야 하는 것</b>.
 *       {@code leave}는 한 행 + {@code senses} 2개다. <b>이 검사가 없으면 "다 갈라 버리는" 구현이 통과한다</b> —
 *       회귀 방지의 핵심이고, 품사를 병합 키에 넣는 대안을 배제하는 자리이기도 하다(08 A-7 참고).</li>
 *   <li>{@link #every_english_unit_vocabulary_entry_carries_its_own_pronunciation} — 위 둘의 <b>일반형</b>.
 *       유닛 학습의 {@code entryId}(설계/04 §6-1)도 같은 병합 규칙에서 나오므로(설계/03 §4-1),
 *       키가 틀리면 유닛에서 누른 단어가 <b>발음이 다른 표제어</b>로 연결된다. 특정 단어에 기대지 않는
 *       불변식이라 콘텐츠가 늘어도 그대로 산다.</li>
 * </ol>
 *
 * <p>일본어 쪽 그물은 {@code LibraryApiIntegrationTest}의
 * {@code vocabulary_same_word_and_kana_is_merged_into_one_row}(応援 — 붙는다) ·
 * {@code vocabulary_same_kana_but_different_word_stays_separate}(暑い/熱い — 갈린다)가 이미 치고 있고,
 * 그 둘이 성립하는 <b>전제</b>(일본어 행의 {@code ipa}는 전량 NULL)를 여기 {@link
 * #japanese_vocabulary_never_carries_ipa_so_its_reading_is_kana}가 고정한다 —
 * 전제가 무너지면 일본어 병합이 <b>조용히</b> 달라지기 때문이다.
 *
 * <p>이 테스트를 수정하지 말 것 — 계약 변경은 senior-dev 경유 (CLAUDE.md TDD 규칙 2).
 */
class EnglishVocabularyMergeContractIntegrationTest extends ApiIntegrationTestSupport {

    private static final String EN_VOCABULARY = "/api/en/library/vocabulary";
    private static final String JA_VOCABULARY = "/api/library/vocabulary";

    // 시험 쌍 — 영어 어휘 시드 318행 중 같은 word가 두 번 나오는 것은 이 둘뿐이다(2026-09-23 전수 확인).
    // 즉 이 두 단어가 "갈라야 하는 것"과 "붙여야 하는 것"을 가르는 전부다.
    private static final String CLOSE_ADJECTIVE_IPA = "/kloʊs/";   // 가까운 (E1 유닛 4)
    private static final String CLOSE_VERB_IPA = "/kloʊz/";        // 닫다 · 문을 닫다 (E2 유닛 5)
    private static final String LEAVE_IPA = "/liːv/";              // E1 유닛 5 · E2 유닛 2 — 같은 발음

    // ── 계약 1. 발음이 다르면 별개 행 (설계/04 §3-7 · 08 A-2) ────────────────

    /**
     * {@code close}는 형용사 {@code /kloʊs/}(가까운)와 동사 {@code /kloʊz/}(닫다)가 <b>다른 단어</b>다.
     * 표기가 같다는 이유로 합치면 한쪽의 발음·품사가 사라진다 — 합쳐진 행이 들고 있는 값은 대표 행의 것 하나뿐이고
     * ({@code VocabularyEntryDTO.of}), 나머지 뜻은 <b>남의 발음을 달고</b> 화면에 나간다.
     */
    @Test
    void an_english_homograph_with_two_pronunciations_is_two_rows() throws Exception {
        List<JsonNode> rows = search(EN_VOCABULARY, "close");

        assertThat(rows.size())
                .as("'close'는 발음이 둘(%s 가까운 / %s 닫다)이므로 자료실에 **2행**이어야 하는데 %s행이다."
                                + " 병합 키의 둘째 값은 '읽기'이고 영어의 읽기는 kana가 아니라 ipa다"
                                + "(설계/04 §3-7 · 08 A-2 · 06 §11-3). 지금 나온 행: %s",
                        CLOSE_ADJECTIVE_IPA, CLOSE_VERB_IPA, rows.size(), describe(rows))
                .isEqualTo(2);

        JsonNode adjective = rowWithIpa(rows, CLOSE_ADJECTIVE_IPA);
        assertThat(text(adjective.path("koApprox"))).as("%s 행의 한글 근사", CLOSE_ADJECTIVE_IPA).isEqualTo("클로-스");
        assertThat(text(adjective.path("partOfSpeech"))).as("%s 행의 품사", CLOSE_ADJECTIVE_IPA).isEqualTo("ADJECTIVE");
        assertThat(meanings(adjective))
                .as("%s 행의 뜻 — 형용사 close의 뜻만 실려야 한다", CLOSE_ADJECTIVE_IPA)
                .containsExactly("가까운");
        assertThat(levels(adjective))
                .as("%s 행의 레벨 배지 — 형용사 close는 E1에서만 배운다", CLOSE_ADJECTIVE_IPA)
                .containsExactly("E1");

        JsonNode verb = rowWithIpa(rows, CLOSE_VERB_IPA);
        assertThat(text(verb.path("koApprox"))).as("%s 행의 한글 근사", CLOSE_VERB_IPA).isEqualTo("클로우즈");
        assertThat(text(verb.path("partOfSpeech"))).as("%s 행의 품사", CLOSE_VERB_IPA).isEqualTo("VERB");
        assertThat(meanings(verb))
                .as("%s 행의 뜻 — 동사 close의 뜻만 실려야 한다", CLOSE_VERB_IPA)
                .containsExactly("닫다 · 문을 닫다");
        assertThat(levels(verb))
                .as("%s 행의 레벨 배지 — 동사 close는 E2에서만 배운다", CLOSE_VERB_IPA)
                .containsExactly("E2");
    }

    // ── 계약 2. 발음이 같으면 한 행 — "다 갈라 버리는" 구현을 막는다 ──────────

    /**
     * ★ <b>회귀 방지의 핵심.</b> 계약 1만 있으면 "표기가 같아도 무조건 나눈다"거나 "품사를 병합 키에 넣는다"는
     * 구현이 그대로 통과한다. {@code leave}는 E1 「떠나다 · 출발하다」와 E2 「남기다 · 두고 가다」가
     * <b>발음도 품사도 같은</b> 한 단어의 두 뜻이므로 <b>한 행 + senses 2개</b>다 — 이것이 08 A-1(코스 간 중복은
     * 정당한 복습) · A-3(senses는 뜻 기준)이 함께 만든 모양이고, 여기서 갈라지면 자료실이 같은 단어를 두 번 보여준다.
     *
     * <p>품사를 키에 넣지 않는 이유가 여기서 드러난다: 품사는 <b>그룹의 대표값</b>으로 정의돼 있어(08 A-7)
     * 키에 넣으면 A-7이 무의미해지고, 그러면서도 <b>같은 품사·다른 발음</b>(영어 {@code read} /riːd/ vs /red/ 같은 꼴)은
     * 여전히 못 가른다. 품사는 발음의 대리값이 아니다.
     */
    @Test
    void an_english_word_with_one_pronunciation_stays_one_row() throws Exception {
        List<JsonNode> rows = search(EN_VOCABULARY, "leave");

        assertThat(rows.size())
                .as("'leave'는 E1·E2에서 **같은 발음 %s**으로 배우는 한 단어이므로 자료실에 **1행**이어야 하는데 %s행이다."
                                + " 표기가 같다고 무조건 나누면 안 된다 — 나누는 기준은 발음이다(08 A-1·A-3)."
                                + " 지금 나온 행: %s",
                        LEAVE_IPA, rows.size(), describe(rows))
                .isEqualTo(1);

        JsonNode row = rows.get(0);
        assertThat(text(row.path("ipa"))).as("'leave' 행의 발음").isEqualTo(LEAVE_IPA);
        assertThat(meanings(row))
                .as("'leave' 행의 뜻은 **2개**여야 하는데 %s개다 — 뜻은 학습 순서로 쌓인다(08 A-3). 지금 값: %s",
                        meanings(row).size(), meanings(row))
                .containsExactly("떠나다 · 출발하다", "남기다 · 두고 가다");
        assertThat(levels(row))
                .as("'leave' 행의 레벨 배지 — 두 코스에서 배우므로 둘 다, 학습 순서로 남는다")
                .containsExactly("E1", "E2");
    }

    // ── 계약 3. 일반형 — 유닛 어휘의 entryId는 "자기 발음을 가진" 표제어를 가리킨다 ──

    /**
     * 유닛 학습의 {@code entryId}(설계/04 §6-1)는 자료실 병합 규칙의 결과물이다(설계/03 §4-1 —
     * {@code LibraryVocabularyService.resolveEntryIds}가 단일 출처). 그러므로 병합 키가 틀리면
     * <b>유닛에서 누른 단어가 발음이 다른 표제어로 연결된다</b>.
     *
     * <p>새 키가 성립하면 이것은 <b>구성상 참인 불변식</b>이 된다: 한 그룹의 모든 행은 읽기가 같으므로
     * 대표 행의 {@code ipa}·{@code koApprox}가 곧 모든 구성원의 값이다. 특정 단어에 기대지 않으므로
     * 영어 콘텐츠가 늘어도 이 검사는 그대로 산다(C-9 — 픽스처는 실제 응답에서 파생한다).
     */
    @Test
    void every_english_unit_vocabulary_entry_carries_its_own_pronunciation() throws Exception {
        Map<Long, JsonNode> entriesById = englishLibraryEntriesById();
        int checked = 0;

        for (CourseCatalog.Course course : EnglishContentCatalog.availableCourses()) {
            for (int unitNo = 1; unitNo <= course.unitCount; unitNo++) {
                JsonNode unit = unit(course.id, unitNo);
                String at = "코스 " + course.id + "(" + course.title + ") 유닛 " + unitNo;

                for (JsonNode vocabulary : unit.path("vocabularies")) {
                    long id = vocabulary.path("id").asLong();
                    long entryId = vocabulary.path("entryId").asLong();
                    String word = text(vocabulary.path("word"));

                    JsonNode entry = entriesById.get(entryId);
                    assertThat(entry)
                            .as("%s 어휘 '%s'(id %s)의 entryId %s 가 자료실 표제어 목록에 없다"
                                            + " — entryId는 자료실 1행의 id와 같은 값이다(설계/04 §6-1)",
                                    at, word, id, entryId)
                            .isNotNull();

                    assertThat(text(entry.path("word")))
                            .as("%s 어휘 '%s'(id %s) → entryId %s 의 표기", at, word, id, entryId)
                            .isEqualTo(word);
                    assertThat(text(entry.path("ipa")))
                            .as("%s 어휘 '%s'(id %s)의 발음은 %s 인데, entryId %s 로 열리는 자료실 표제어의 발음은 %s 다."
                                            + " 학습자는 유닛에서 배운 단어를 자료실에서 **다른 발음으로** 보게 된다 —"
                                            + " 병합 키의 읽기가 영어에서 ipa여야 하는 이유다(설계/04 §3-7 · 08 A-2)",
                                    at, word, id, text(vocabulary.path("ipa")), entryId, text(entry.path("ipa")))
                            .isEqualTo(text(vocabulary.path("ipa")));
                    assertThat(text(entry.path("koApprox")))
                            .as("%s 어휘 '%s'(id %s) → entryId %s 의 한글 근사."
                                            + " ipa와 koApprox는 언제나 짝이다(08 F-18)",
                                    at, word, id, entryId)
                            .isEqualTo(text(vocabulary.path("koApprox")));

                    assertThat(memberIds(entry))
                            .as("%s 어휘 '%s' — 표제어 %s 가 이 어휘(id %s)를 품고 있어야 한다", at, word, entryId, id)
                            .contains(id);
                    checked++;
                }
            }
        }

        assertThat(checked).as("검증한 영어 유닛 어휘가 없다 — 통과가 의미를 갖지 않는다").isPositive();
    }

    // ── 전제 고정. 일본어의 '읽기'는 오늘도 kana다 ────────────────────────────

    /**
     * 이 변경이 <b>일본어 동작을 바꾸지 않는다</b>는 근거는 "일본어 행의 {@code ipa}는 전량 NULL"이라는
     * 데이터 사실 하나뿐이다(계약 J-8 · 설계/06 §11-3). 그 전제가 깨지는 날 일본어 병합이
     * <b>아무 테스트도 깨뜨리지 않은 채</b> 달라지므로, 전제 자체를 여기서 고정한다.
     *
     * <p>{@code EnglishCourseApiIntegrationTest.japanese_vocabulary_library_carries_the_same_fields_as_null}과
     * 겹치지 않는다 — 그쪽은 <b>필드가 직렬화되는가</b>(04 §1-3)를 첫 행으로 보고, 여기서는 <b>전 행의 값</b>을 본다.
     * 반대 방향(영어 행의 kana 전량 NULL)은 {@code EnglishContentRuleIntegrationTest} 규칙 1이 이미 고정하고 있다.
     */
    @Test
    void japanese_vocabulary_never_carries_ipa_so_its_reading_is_kana() throws Exception {
        List<JsonNode> rows = allPages(JA_VOCABULARY);

        for (JsonNode row : rows) {
            assertThat(row.path("ipa").isNull())
                    .as("일본어 자료실 어휘 '%s' 에 ipa '%s' 가 들어 있다. 일본어 행의 ipa는 전량 NULL이라는 전제 위에서만"
                                    + " '읽기 = kana(없으면 ipa)'가 일본어 병합을 그대로 둔다(계약 J-8 · 설계/06 §11-3)",
                            text(row.path("word")), text(row.path("ipa")))
                    .isTrue();
        }
        assertThat(rows).as("일본어 자료실 어휘가 비어 있다 — 검증 대상이 없다").isNotEmpty();
    }

    // ── 조회 도우미 ──────────────────────────────────────────────────────────

    /** 검색어 한 건 — 병합 결과를 그대로 본다(size 100이면 이 시드에서 한 페이지에 들어온다) */
    private List<JsonNode> search(String path, String keyword) throws Exception {
        MvcResult result = mockMvc.perform(get(path).param("q", keyword).param("size", "100"))
                .andExpect(status().isOk())
                .andReturn();
        JsonNode data = objectMapper.readTree(result.getResponse().getContentAsString()).path("data");
        assertThat(data.path("last").asBoolean(true))
                .as("'%s' 검색 결과가 한 페이지를 넘었다 — 이 검사는 전량이 한 페이지에 들어오는 것을 전제한다", keyword)
                .isTrue();
        return toList(data.path("content"));
    }

    /** 영어 자료실 표제어 전부를 id로 색인한다 — 유닛 어휘마다 자료실을 부르면 요청이 수백 건이 된다 */
    private Map<Long, JsonNode> englishLibraryEntriesById() throws Exception {
        Map<Long, JsonNode> byId = new HashMap<>();
        for (JsonNode entry : allPages(EN_VOCABULARY)) {
            byId.put(entry.path("id").asLong(), entry);
        }
        return byId;
    }

    /** 자료실 목록 전부 — 페이지를 끝까지 넘긴다(size는 서버가 100으로 깎는다) */
    private List<JsonNode> allPages(String path) throws Exception {
        List<JsonNode> items = new ArrayList<>();
        int page = 0;
        while (true) {
            MvcResult result = mockMvc.perform(get(path).param("page", String.valueOf(page)).param("size", "100"))
                    .andExpect(status().isOk())
                    .andReturn();
            JsonNode data = objectMapper.readTree(result.getResponse().getContentAsString()).path("data");
            items.addAll(toList(data.path("content")));
            if (data.path("last").asBoolean(true)) {
                return items;
            }
            page++;
        }
    }

    private JsonNode unit(long courseId, int unitNo) throws Exception {
        MvcResult result = mockMvc.perform(get("/api/en/courses/{courseId}/units/{unitNo}", courseId, unitNo))
                .andReturn();
        assertThat(result.getResponse().getStatus())
                .as("코스 %s 유닛 %s를 부르면 HTTP %s다 — 순회 범위는 CourseCatalog.ENGLISH의 unitCount다",
                        courseId, unitNo, result.getResponse().getStatus())
                .isEqualTo(200);
        return objectMapper.readTree(result.getResponse().getContentAsString()).path("data");
    }

    // ── 값 꺼내기 ────────────────────────────────────────────────────────────

    /**
     * 발음으로 행을 고른다 — <b>없으면 그 사실을 말하고 멈춘다.</b>
     * {@code findFirst().get()}이면 {@code NoSuchElementException} 한 줄만 남아 무엇이 없는지 보이지 않는다.
     */
    private JsonNode rowWithIpa(List<JsonNode> rows, String ipa) {
        return rows.stream()
                .filter(row -> ipa.equals(text(row.path("ipa"))))
                .findFirst()
                .orElseThrow(() -> new AssertionError(
                        "발음이 %s 인 행이 없다. 나온 행: %s".formatted(ipa, describe(rows))));
    }

    private List<String> meanings(JsonNode row) {
        List<String> meanings = new ArrayList<>();
        row.path("senses").forEach(sense -> meanings.add(text(sense.path("meaningKo"))));
        return meanings;
    }

    private List<String> levels(JsonNode row) {
        List<String> levels = new ArrayList<>();
        row.path("levels").forEach(level -> levels.add(text(level)));
        return levels;
    }

    private List<Long> memberIds(JsonNode row) {
        List<Long> ids = new ArrayList<>();
        row.path("senses").forEach(sense -> sense.path("vocabularyIds").forEach(id -> ids.add(id.asLong())));
        return ids;
    }

    /** 실패 메시지용 한 줄 요약 — "몇 개여야 하는데 몇 개다" 다음에 <b>무엇이 나왔는지</b>가 붙어야 고칠 수 있다 */
    private String describe(List<JsonNode> rows) {
        return rows.stream()
                .map(row -> "{id=%s word=%s ipa=%s koApprox=%s pos=%s levels=%s senses=%s}".formatted(
                        row.path("id").asLong(), text(row.path("word")), text(row.path("ipa")),
                        text(row.path("koApprox")), text(row.path("partOfSpeech")), levels(row), meanings(row)))
                .collect(Collectors.joining(", ", "[", "]"));
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
}
