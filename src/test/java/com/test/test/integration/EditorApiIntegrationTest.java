package com.test.test.integration;

import com.fasterxml.jackson.databind.JsonNode;
import org.junit.jupiter.api.Test;
import org.springframework.http.MediaType;
import org.springframework.test.context.TestPropertySource;
import org.springframework.test.web.servlet.MvcResult;

import static org.assertj.core.api.Assertions.assertThat;
import static org.hamcrest.Matchers.hasSize;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * 관리자 편집 API 통합테스트 — 편집 모드 <b>켜진</b> 환경 (TDD Red — senior-dev 작성)
 *
 * <p>계약 문서: `설계/04_API계약.md` §9 (편집 모드 API)
 * 인수 조건: A5(표제 불변·자식 id 일치) · A6~A8(검증 — 서버가 최종 심판) · A15·A16(공개 GET 반영)
 *
 * <p><b>전부 인증 헤더 없이 호출한다</b> — 편집은 로그인과 무관하다(설계/04 §9 사용자 확정, 계약 판정 ④).
 * 켜고 끄는 기준은 역할이 아니라 실행 환경이고, 이 클래스는 @TestPropertySource로 켠다.
 *
 * <p>대상 id는 하드코딩하지 않고 유닛 학습 공개 API에서 꺼낸다 — 시드 id가 재배치돼도 깨지지 않는다.
 *
 * <p>이 테스트를 수정하지 말 것 — 계약 변경은 senior-dev 경유 (CLAUDE.md TDD 규칙 2).
 */
@TestPropertySource(properties = "app.editor.enabled=true")
class EditorApiIntegrationTest extends ApiIntegrationTestSupport {

    private static final long N5_COURSE_ID = 2L;

    private JsonNode unitStudy(int unitNo) throws Exception {
        MvcResult result = mockMvc.perform(get("/api/courses/{courseId}/units/{unitNo}", N5_COURSE_ID, unitNo))
                .andExpect(status().isOk())
                .andReturn();
        return objectMapper.readTree(result.getResponse().getContentAsString()).path("data");
    }

    /** kana 계약 검증 대상 — 예시 단어가 있고 그 단어에 한자가 든 한자 항목을 찾는다 */
    private JsonNode firstKanjiWithWord() throws Exception {
        for (int unitNo = 1; unitNo <= 3; unitNo++) {
            for (JsonNode kanji : unitStudy(unitNo).path("kanjis")) {
                if (kanji.path("words").size() > 0) {
                    return kanji;
                }
            }
        }
        throw new IllegalStateException("시드에 예시 단어를 가진 한자가 없다 — 시드가 깨졌다");
    }

    private JsonNode firstGrammar() throws Exception {
        return unitStudy(1).path("grammars").get(0);
    }

    private JsonNode firstDialog() throws Exception {
        return unitStudy(1).path("dialog");
    }

    /** 한자가 든(=kana가 있는) 어휘 */
    private JsonNode firstVocabWithKana() throws Exception {
        for (int unitNo = 1; unitNo <= 3; unitNo++) {
            for (JsonNode vocab : unitStudy(unitNo).path("vocabularies")) {
                if (!vocab.path("kana").isNull() && !vocab.path("kana").asText().isEmpty()) {
                    return vocab;
                }
            }
        }
        throw new IllegalStateException("시드에 kana 있는 어휘가 없다");
    }

    /** 전부 가나라 kana가 없는 어휘 */
    private JsonNode firstVocabWithoutKana() throws Exception {
        for (int unitNo = 1; unitNo <= 5; unitNo++) {
            for (JsonNode vocab : unitStudy(unitNo).path("vocabularies")) {
                if (vocab.path("kana").isNull() || vocab.path("kana").asText().isEmpty()) {
                    return vocab;
                }
            }
        }
        throw new IllegalStateException("시드에 kana 없는 어휘가 없다");
    }

    // ── 상태 ────────────────────────────────────────────────────────────────

    @Test
    void editor_status_reports_enabled_without_login() throws Exception {
        mockMvc.perform(get("/api/editor/status"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.enabled").value(true));
    }

    // ── 한자 ────────────────────────────────────────────────────────────────

    @Test
    void kanji_update_saves_and_is_visible_in_the_public_api(/* A9·A15·A16 */) throws Exception {
        JsonNode kanji = firstKanjiWithWord();
        long kanjiId = kanji.path("id").asLong();
        JsonNode word = kanji.path("words").get(0);

        mockMvc.perform(put("/api/editor/kanji/{kanjiId}", kanjiId)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                { "meaningKo": "고친 훈음", "onyomi": "コウ", "kunyomi": "なおす",
                                  "words": [ { "id": %d, "word": "%s", "kana": "%s", "meaningKo": "고친 단어 뜻" } ] }
                                """.formatted(word.path("id").asLong(), word.path("word").asText(),
                                word.path("kana").isNull() ? "" : word.path("kana").asText())))
                .andExpect(status().isOk())
                // 응답이 저장 후 값이다 — 화면은 이 값으로 즉시 갱신한다(A9)
                .andExpect(jsonPath("$.data.meaningKo").value("고친 훈음"))
                .andExpect(jsonPath("$.data.onyomi").value("コウ"));

        // 콘텐츠는 한 벌뿐이다 — 자료실 공개 GET에도 같은 값이 보인다(A15·A16)
        mockMvc.perform(get("/api/library/kanji/{kanjiId}", kanjiId))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.meaningKo").value("고친 훈음"))
                .andExpect(jsonPath("$.data.words[0].meaningKo").value("고친 단어 뜻"));
    }

    @Test
    void kanji_letter_is_immutable(/* 표제는 시드 소관 — 설계/04 §9 */) throws Exception {
        JsonNode kanji = firstKanjiWithWord();
        long kanjiId = kanji.path("id").asLong();
        String originalLetter = kanji.path("letter").asText();
        JsonNode word = kanji.path("words").get(0);

        mockMvc.perform(put("/api/editor/kanji/{kanjiId}", kanjiId)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                { "letter": "改", "meaningKo": "뜻", "onyomi": "コウ", "kunyomi": "",
                                  "words": [ { "id": %d, "word": "%s", "kana": "%s", "meaningKo": "뜻" } ] }
                                """.formatted(word.path("id").asLong(), word.path("word").asText(),
                                word.path("kana").isNull() ? "" : word.path("kana").asText())))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.letter").value(originalLetter));
    }

    @Test
    void kanji_needs_at_least_one_reading(/* A7 */) throws Exception {
        JsonNode kanji = firstKanjiWithWord();
        JsonNode word = kanji.path("words").get(0);

        mockMvc.perform(put("/api/editor/kanji/{kanjiId}", kanji.path("id").asLong())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                { "meaningKo": "뜻", "onyomi": "", "kunyomi": "",
                                  "words": [ { "id": %d, "word": "%s", "kana": "%s", "meaningKo": "뜻" } ] }
                                """.formatted(word.path("id").asLong(), word.path("word").asText(),
                                word.path("kana").isNull() ? "" : word.path("kana").asText())))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.errorCode").value("BUSINESS_RULE_VIOLATION"));
    }

    @Test
    void kanji_word_rows_cannot_be_added_or_removed(/* A5 — 자식 id 일치 필수 */) throws Exception {
        JsonNode kanji = firstKanjiWithWord();

        mockMvc.perform(put("/api/editor/kanji/{kanjiId}", kanji.path("id").asLong())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                { "meaningKo": "뜻", "onyomi": "コウ", "kunyomi": "",
                                  "words": [ { "id": 999999, "word": "新語", "kana": "しんご", "meaningKo": "새 단어" } ] }
                                """))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.errorCode").value("BUSINESS_RULE_VIOLATION"));
    }

    @Test
    void kanji_word_with_han_characters_requires_kana(/* A8 — kana 계약 ③ */) throws Exception {
        JsonNode kanji = firstKanjiWithWord();
        JsonNode word = kanji.path("words").get(0);

        mockMvc.perform(put("/api/editor/kanji/{kanjiId}", kanji.path("id").asLong())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                { "meaningKo": "뜻", "onyomi": "コウ", "kunyomi": "",
                                  "words": [ { "id": %d, "word": "%s", "kana": "", "meaningKo": "뜻" } ] }
                                """.formatted(word.path("id").asLong(), word.path("word").asText())))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.errorCode").value("BUSINESS_RULE_VIOLATION"));
    }

    @Test
    void kanji_required_fields_cannot_be_blank(/* A6 */) throws Exception {
        JsonNode kanji = firstKanjiWithWord();
        JsonNode word = kanji.path("words").get(0);

        mockMvc.perform(put("/api/editor/kanji/{kanjiId}", kanji.path("id").asLong())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                { "meaningKo": "", "onyomi": "コウ", "kunyomi": "",
                                  "words": [ { "id": %d, "word": "%s", "kana": "%s", "meaningKo": "뜻" } ] }
                                """.formatted(word.path("id").asLong(), word.path("word").asText(),
                                word.path("kana").isNull() ? "" : word.path("kana").asText())))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.errorCode").value("VALIDATION_ERROR"));
    }

    @Test
    void unknown_kanji_is_404() throws Exception {
        mockMvc.perform(put("/api/editor/kanji/{kanjiId}", 999999L)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                { "meaningKo": "뜻", "onyomi": "コウ", "kunyomi": "", "words": [] }
                                """))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.errorCode").value("NOT_FOUND"));
    }

    // ── 어휘 ────────────────────────────────────────────────────────────────

    @Test
    void vocabulary_update_saves_and_is_visible_in_the_public_api() throws Exception {
        JsonNode vocab = firstVocabWithKana();
        long vocabId = vocab.path("id").asLong();

        mockMvc.perform(put("/api/editor/vocabulary/{vocabularyId}", vocabId)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                { "meaningKo": "고친 뜻", "kana": "%s", "partOfSpeech": "NOUN" }
                                """.formatted(vocab.path("kana").asText())))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.meaningKo").value("고친 뜻"))
                .andExpect(jsonPath("$.data.partOfSpeech").value("NOUN"))
                // 표제(word)는 그대로다
                .andExpect(jsonPath("$.data.word").value(vocab.path("word").asText()));
    }

    @Test
    void pure_kana_vocabulary_must_not_have_kana(/* A8 — kana 계약 ① */) throws Exception {
        JsonNode vocab = firstVocabWithoutKana();

        mockMvc.perform(put("/api/editor/vocabulary/{vocabularyId}", vocab.path("id").asLong())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                { "meaningKo": "뜻", "kana": "よみがな", "partOfSpeech": "NOUN" }
                                """))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.errorCode").value("BUSINESS_RULE_VIOLATION"));
    }

    @Test
    void vocabulary_kana_equal_to_word_is_rejected(/* A8 — kana 계약 ② */) throws Exception {
        JsonNode vocab = firstVocabWithKana();

        mockMvc.perform(put("/api/editor/vocabulary/{vocabularyId}", vocab.path("id").asLong())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                { "meaningKo": "뜻", "kana": "%s", "partOfSpeech": "NOUN" }
                                """.formatted(vocab.path("word").asText())))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.errorCode").value("BUSINESS_RULE_VIOLATION"));
    }

    @Test
    void vocabulary_with_kanji_requires_kana(/* A8 — kana 계약 ③ */) throws Exception {
        JsonNode vocab = firstVocabWithKana();

        mockMvc.perform(put("/api/editor/vocabulary/{vocabularyId}", vocab.path("id").asLong())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                { "meaningKo": "뜻", "kana": "", "partOfSpeech": "NOUN" }
                                """))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.errorCode").value("BUSINESS_RULE_VIOLATION"));
    }

    @Test
    void vocabulary_part_of_speech_outside_the_seven_is_rejected(/* 품사 7종 — 08 A-6 */) throws Exception {
        JsonNode vocab = firstVocabWithKana();

        mockMvc.perform(put("/api/editor/vocabulary/{vocabularyId}", vocab.path("id").asLong())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                { "meaningKo": "뜻", "kana": "%s", "partOfSpeech": "ETC" }
                                """.formatted(vocab.path("kana").asText())))
                .andExpect(status().isBadRequest());
    }

    // ── 문법 ────────────────────────────────────────────────────────────────

    @Test
    void grammar_update_saves_explanation_and_examples() throws Exception {
        JsonNode grammar = firstGrammar();
        long grammarId = grammar.path("id").asLong();
        JsonNode example = grammar.path("examples").get(0);

        mockMvc.perform(put("/api/editor/grammar/{grammarId}", grammarId)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                { "explanation": "고친 설명",
                                  "examples": [ { "id": %d, "jp": "%s", "kana": %s, "meaningKo": "고친 예문 뜻" } ],
                                  "rules": [] }
                                """.formatted(example.path("id").asLong(), example.path("jp").asText(),
                                example.path("kana").isNull() ? "null" : "\"" + example.path("kana").asText() + "\"")))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.explanation").value("고친 설명"));

        mockMvc.perform(get("/api/library/grammar/{grammarId}", grammarId))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.explanation").value("고친 설명"));
    }

    /**
     * ★ 판정 ④ — 활용표(rules)는 <b>전체 교체</b>라 행 추가·삭제가 된다.
     * "행이 하나 빠졌다"가 활용표의 보고된 오류 형태다(기획 미결 §9-8) — 추가 없이는 못 고친다.
     */
    @Test
    void grammar_rules_are_replaced_wholesale_so_a_missing_row_can_be_added() throws Exception {
        JsonNode grammar = firstGrammar();
        long grammarId = grammar.path("id").asLong();
        JsonNode example = grammar.path("examples").get(0);
        int currentRuleCount = grammar.path("rules").size();

        StringBuilder rules = new StringBuilder("[");
        for (JsonNode rule : grammar.path("rules")) {
            rules.append("""
                    { "groupLabel": "%s", "pattern": "%s", "exampleBefore": "%s", "exampleAfter": "%s" },
                    """.formatted(rule.path("groupLabel").asText(), rule.path("pattern").asText(),
                    rule.path("exampleBefore").asText(), rule.path("exampleAfter").asText()));
        }
        rules.append("""
                { "groupLabel": "동사", "pattern": "추가된 행", "exampleBefore": "行く", "exampleAfter": "行って" } ]
                """);

        mockMvc.perform(put("/api/editor/grammar/{grammarId}", grammarId)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                { "explanation": "설명",
                                  "examples": [ { "id": %d, "jp": "%s", "kana": %s, "meaningKo": "뜻" } ],
                                  "rules": %s }
                                """.formatted(example.path("id").asLong(), example.path("jp").asText(),
                                example.path("kana").isNull() ? "null" : "\"" + example.path("kana").asText() + "\"",
                                rules)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.rules", hasSize(currentRuleCount + 1)));
    }

    @Test
    void grammar_example_rows_cannot_be_added(/* A5 — 예문은 수정만 */) throws Exception {
        JsonNode grammar = firstGrammar();

        mockMvc.perform(put("/api/editor/grammar/{grammarId}", grammar.path("id").asLong())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                { "explanation": "설명",
                                  "examples": [ { "id": 999999, "jp": "新しい文。", "kana": "あたらしいぶん。", "meaningKo": "새 문장" } ],
                                  "rules": [] }
                                """))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.errorCode").value("BUSINESS_RULE_VIOLATION"));
    }

    @Test
    void grammar_name_is_immutable() throws Exception {
        JsonNode grammar = firstGrammar();
        JsonNode example = grammar.path("examples").get(0);
        String originalName = grammar.path("name").asText();

        MvcResult result = mockMvc.perform(put("/api/editor/grammar/{grammarId}", grammar.path("id").asLong())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                { "name": "바꿔치기", "explanation": "설명",
                                  "examples": [ { "id": %d, "jp": "%s", "kana": %s, "meaningKo": "뜻" } ],
                                  "rules": [] }
                                """.formatted(example.path("id").asLong(), example.path("jp").asText(),
                                example.path("kana").isNull() ? "null" : "\"" + example.path("kana").asText() + "\"")))
                .andExpect(status().isOk())
                .andReturn();

        JsonNode data = objectMapper.readTree(result.getResponse().getContentAsString()).path("data");
        assertThat(data.path("name").asText()).isEqualTo(originalName);
    }

    // ── 회화 ────────────────────────────────────────────────────────────────

    @Test
    void dialog_update_saves_lines_and_title() throws Exception {
        JsonNode dialog = firstDialog();
        long dialogId = dialog.path("id").asLong();

        StringBuilder lines = new StringBuilder("[");
        boolean first = true;
        for (JsonNode line : dialog.path("lines")) {
            if (!first) lines.append(",");
            first = false;
            lines.append("""
                    { "id": %d, "speaker": "%s", "jp": "%s", "kana": %s, "meaningKo": "고친 대사 뜻" }
                    """.formatted(line.path("id").asLong(), line.path("speaker").asText(), line.path("jp").asText(),
                    line.path("kana").isNull() ? "null" : "\"" + line.path("kana").asText() + "\""));
        }
        lines.append("]");

        mockMvc.perform(put("/api/editor/dialogs/{dialogId}", dialogId)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                { "title": "고친 장면 제목", "lines": %s }
                                """.formatted(lines)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.title").value("고친 장면 제목"))
                .andExpect(jsonPath("$.data.lines[0].meaningKo").value("고친 대사 뜻"));

        // 유닛 학습 공개 GET에도 반영된다 (A15)
        mockMvc.perform(get("/api/courses/{courseId}/units/{unitNo}", N5_COURSE_ID, 1))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.dialog.title").value("고친 장면 제목"));
    }

    @Test
    void dialog_line_rows_cannot_be_added(/* A5 — 대사는 수정만 */) throws Exception {
        JsonNode dialog = firstDialog();

        mockMvc.perform(put("/api/editor/dialogs/{dialogId}", dialog.path("id").asLong())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                { "title": "제목",
                                  "lines": [ { "id": 999999, "speaker": "김", "jp": "こんにちは。", "kana": null, "meaningKo": "안녕" } ] }
                                """))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.errorCode").value("BUSINESS_RULE_VIOLATION"));
    }

    @Test
    void dialog_line_kana_contract_applies(/* A8 — 전부 가나인 대사에 kana를 채우면 400 */) throws Exception {
        JsonNode dialog = firstDialog();
        // 전부 가나(=kana null)인 대사를 찾는다 — N5 유닛 1의 「はじめまして。」류가 항상 존재한다
        JsonNode target = null;
        for (JsonNode line : dialog.path("lines")) {
            if (line.path("kana").isNull()) {
                target = line;
                break;
            }
        }
        assertThat(target).as("시드에 kana 없는 대사가 있어야 한다").isNotNull();

        StringBuilder lines = new StringBuilder("[");
        boolean first = true;
        for (JsonNode line : dialog.path("lines")) {
            if (!first) lines.append(",");
            first = false;
            boolean isTarget = line.path("id").asLong() == target.path("id").asLong();
            String kana = isTarget ? "\"よみがな\""
                    : (line.path("kana").isNull() ? "null" : "\"" + line.path("kana").asText() + "\"");
            lines.append("""
                    { "id": %d, "speaker": "%s", "jp": "%s", "kana": %s, "meaningKo": "%s" }
                    """.formatted(line.path("id").asLong(), line.path("speaker").asText(), line.path("jp").asText(),
                    kana, line.path("meaningKo").asText()));
        }
        lines.append("]");

        mockMvc.perform(put("/api/editor/dialogs/{dialogId}", dialog.path("id").asLong())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                { "title": "제목", "lines": %s }
                                """.formatted(lines)))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.errorCode").value("BUSINESS_RULE_VIOLATION"));
    }
}
