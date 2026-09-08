package com.test.test.integration;

import com.fasterxml.jackson.databind.JsonNode;
import org.junit.jupiter.api.Test;
import org.springframework.http.MediaType;
import org.springframework.test.context.TestPropertySource;
import org.springframework.test.web.servlet.MvcResult;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * 자료실 상세 → 편집 저장 왕복 (backend-dev 작성 — QA 리포트 후속).
 *
 * <p>재현한 결함: 편집 payload의 자식 id를 화면이 <b>지금 보고 있는 응답</b>에서 조립하는데,
 * 유닛 학습 DTO에만 자식 id를 넣고 <b>자료실 상세 DTO에는 빠뜨려</b> 자료실에서 연 편집 패널이
 * {@code id: undefined}를 보내 항상 400 VALIDATION_ERROR였다(A3·A9·A15·A16 미충족).
 *
 * <p>그래서 이 테스트는 필드 존재만 보지 않고 <b>자료실 응답으로 편집 요청을 조립해</b> 왕복시킨다 —
 * 화면이 실제로 하는 일과 같은 경로라야 같은 결함을 다시 잡는다.
 */
@TestPropertySource(properties = "app.editor.enabled=true")
class LibraryEditorPayloadIntegrationTest extends ApiIntegrationTestSupport {

    private JsonNode dataOf(MvcResult result) throws Exception {
        return objectMapper.readTree(result.getResponse().getContentAsString()).path("data");
    }

    /** 자료실 목록에서 예시 단어가 있는 한자를 찾아 상세를 읽는다 */
    private JsonNode kanjiDetailWithWords() throws Exception {
        MvcResult list = mockMvc.perform(get("/api/library/kanji").param("page", "0").param("size", "20"))
                .andExpect(status().isOk())
                .andReturn();
        for (JsonNode item : dataOf(list).path("content")) {
            MvcResult detail = mockMvc.perform(get("/api/library/kanji/{id}", item.path("id").asLong()))
                    .andExpect(status().isOk())
                    .andReturn();
            JsonNode kanji = dataOf(detail);
            if (kanji.path("words").size() > 0) {
                return kanji;
            }
        }
        throw new IllegalStateException("자료실에 예시 단어를 가진 한자가 없다 — 시드가 깨졌다");
    }

    private JsonNode grammarDetailWithExamples() throws Exception {
        MvcResult list = mockMvc.perform(get("/api/library/grammar").param("page", "0").param("size", "20"))
                .andExpect(status().isOk())
                .andReturn();
        for (JsonNode item : dataOf(list).path("content")) {
            MvcResult detail = mockMvc.perform(get("/api/library/grammar/{id}", item.path("id").asLong()))
                    .andExpect(status().isOk())
                    .andReturn();
            JsonNode grammar = dataOf(detail);
            if (grammar.path("examples").size() > 0) {
                return grammar;
            }
        }
        throw new IllegalStateException("자료실에 예문을 가진 문법이 없다 — 시드가 깨졌다");
    }

    @Test
    void kanji_detail_carries_word_ids_so_the_editor_can_save() throws Exception {
        JsonNode kanji = kanjiDetailWithWords();
        JsonNode word = kanji.path("words").get(0);
        assertThat(word.path("id").isNumber()).as("자료실 상세의 예시 단어에 id가 있어야 한다").isTrue();

        mockMvc.perform(put("/api/editor/kanji/{kanjiId}", kanji.path("id").asLong())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                { "meaningKo": "자료실에서 고친 훈음", "onyomi": "コウ", "kunyomi": "",
                                  "words": [ { "id": %d, "word": "%s", "kana": %s, "meaningKo": "자료실에서 고친 뜻" } ] }
                                """.formatted(word.path("id").asLong(), word.path("word").asText(),
                                word.path("kana").isNull() ? "null" : "\"" + word.path("kana").asText() + "\"")))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.meaningKo").value("자료실에서 고친 훈음"))
                .andExpect(jsonPath("$.data.words[0].meaningKo").value("자료실에서 고친 뜻"));
    }

    @Test
    void grammar_detail_carries_example_ids_so_the_editor_can_save() throws Exception {
        JsonNode grammar = grammarDetailWithExamples();
        JsonNode example = grammar.path("examples").get(0);
        assertThat(example.path("id").isNumber()).as("자료실 상세의 예문에 id가 있어야 한다").isTrue();

        mockMvc.perform(put("/api/editor/grammar/{grammarId}", grammar.path("id").asLong())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                { "explanation": "자료실에서 고친 설명",
                                  "examples": [ { "id": %d, "jp": "%s", "kana": %s, "meaningKo": "자료실에서 고친 예문 뜻" } ],
                                  "rules": [] }
                                """.formatted(example.path("id").asLong(), example.path("jp").asText(),
                                example.path("kana").isNull() ? "null" : "\"" + example.path("kana").asText() + "\"")))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.explanation").value("자료실에서 고친 설명"));
    }
}
