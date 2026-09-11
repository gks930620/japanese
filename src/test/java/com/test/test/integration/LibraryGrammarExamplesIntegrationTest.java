package com.test.test.integration;

import com.fasterxml.jackson.databind.JsonNode;
import java.util.ArrayList;
import java.util.List;
import org.junit.jupiter.api.Test;
import org.springframework.test.web.servlet.MvcResult;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * 문법 목록의 예문 계약 통합테스트 (TDD Red — senior-dev 작성, 2026-09-10)
 *
 * <p>계약: `설계/04_API계약.md` §3-5 · 결정 `설계/08 §B-12`
 *
 * <p><b>왜 목록에 예문이 실리는가</b>: 실력 진단의 문장 문항(입문~N3 `SENTENCE_MEANING`)과
 * N2·N1 빈칸 문항(`GRAMMAR_CLOZE`)의 재료가 <b>문법 예문</b>인데(설계/09 §1-2·§3-4),
 * 목록 응답이 `{id, name, nameKo, level, hasRules}`뿐이라 한 단계를 만들려면 문법 수만큼
 * 상세를 불러야 했다(N1이면 69회). 한 화면의 재료는 <b>호출 한 번</b>으로 온다(08 B-7).
 *
 * <p><b>왜 `withExamples` 같은 스위치를 두지 않는가</b>: 응답 shape이 파라미터에 따라 갈리면
 * "요청하지 않아서 빈 것"과 "예문이 없어서 빈 것"을 프론트가 구분해야 한다 — 분기가 두 겹이 된다(08 B-5).
 * 그래서 <b>언제나 배열</b>이고, 없으면 `[]`다.
 *
 * <p>이 테스트를 수정하지 말 것 — 계약 변경은 senior-dev 경유.
 */
class LibraryGrammarExamplesIntegrationTest extends ApiIntegrationTestSupport {

    /** 진단 계단이 쓰는 레벨 코드 전부 — 한 레벨이라도 재료가 없으면 그 단계가 통째로 비는 자리다 */
    private static final List<String> STAGE_LEVELS = List.of("INTRO", "N5", "N4", "N3", "N2", "N1");

    /** 문장 문항 1개 = 정답 1 + 오답 3 (설계/09 §1-4) — 예문을 가진 문법이 최소 4개 필요하다 */
    private static final int MIN_SENTENCE_MATERIAL = 4;

    @Test
    void grammar_list_items_carry_their_examples() throws Exception {
        mockMvc.perform(get("/api/library/grammar").param("level", "N5").param("size", "100"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.content[?(@.id == 1)].examples").exists())
                // 예문 한 건의 모양은 상세(§3-6)와 같다 — jp · kana(없으면 null) · meaningKo
                .andExpect(jsonPath("$.data.content[?(@.id == 1)].examples[0].jp").exists())
                .andExpect(jsonPath("$.data.content[?(@.id == 1)].examples[0].meaningKo").exists());
    }

    /** 같은 사실을 두 번 만들지 않는다(08 C-7) — 목록의 예문은 상세의 예문 그대로다 */
    @Test
    void list_examples_are_the_same_data_as_the_detail_examples() throws Exception {
        JsonNode listItem = firstMatching(
                body(get("/api/library/grammar").param("level", "N5").param("size", "100")).path("data").path("content"),
                1L);
        JsonNode detail = body(get("/api/library/grammar/1")).path("data");

        assertThat(listItem.path("examples").isArray()).isTrue();
        assertThat(texts(listItem.path("examples"), "jp")).isEqualTo(texts(detail.path("examples"), "jp"));
        assertThat(texts(listItem.path("examples"), "kana")).isEqualTo(texts(detail.path("examples"), "kana"));
        assertThat(texts(listItem.path("examples"), "meaningKo")).isEqualTo(texts(detail.path("examples"), "meaningKo"));
    }

    /** 컬렉션은 언제나 배열이다(08 B-5) — 예문이 없어도 null이 아니라 `[]`다 */
    @Test
    void examples_is_never_null() throws Exception {
        for (String level : STAGE_LEVELS) {
            JsonNode content = body(get("/api/library/grammar").param("level", level).param("size", "100"))
                    .path("data").path("content");
            for (JsonNode item : content) {
                assertThat(item.has("examples")).as("%s / 문법 %s", level, item.path("id").asText()).isTrue();
                assertThat(item.path("examples").isArray()).as("%s / 문법 %s", level, item.path("id").asText()).isTrue();
            }
        }
    }

    /**
     * 한 단계의 재료는 <b>한 번의 호출</b>로 온다(08 B-7).
     * 레벨별 문법 수가 최대 69개라 `size=100`(자료실 상한)이면 전량이 첫 페이지에 담긴다 —
     * 이 사실이 깨지면 프론트가 페이지를 이어 붙여야 하므로 계약으로 고정한다.
     */
    @Test
    void one_call_with_size_100_returns_every_grammar_of_a_level() throws Exception {
        for (String level : STAGE_LEVELS) {
            JsonNode page = body(get("/api/library/grammar").param("level", level).param("size", "100")).path("data");
            assertThat(page.path("content").size())
                    .as("%s 레벨 문법이 한 페이지에 다 오지 않는다", level)
                    .isEqualTo(page.path("totalElements").asInt());
            assertThat(page.path("last").asBoolean()).as("%s 레벨", level).isTrue();
        }
    }

    /** 문장 문항(정답 1 + 오답 3)이 성립하려면 예문을 가진 문법이 레벨마다 4개 이상이어야 한다 */
    @Test
    void every_stage_level_has_enough_example_material_for_a_sentence_question() throws Exception {
        for (String level : STAGE_LEVELS) {
            JsonNode content = body(get("/api/library/grammar").param("level", level).param("size", "100"))
                    .path("data").path("content");
            long withExamples = 0;
            for (JsonNode item : content) {
                if (item.path("examples").size() > 0) {
                    withExamples += 1;
                }
            }
            assertThat(withExamples).as("%s 레벨의 예문 보유 문법 수", level).isGreaterThanOrEqualTo(MIN_SENTENCE_MATERIAL);
        }
    }

    /** 영어 자료실은 같은 서비스·같은 DTO를 쓴다(설계/04 §8) — 필드가 한쪽에만 생기지 않는다 */
    @Test
    void english_grammar_list_uses_the_same_shape() throws Exception {
        mockMvc.perform(get("/api/en/library/grammar").param("level", "E1").param("size", "100"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.content[0].examples").isArray());
    }

    private JsonNode body(org.springframework.test.web.servlet.request.MockHttpServletRequestBuilder request)
            throws Exception {
        MvcResult result = mockMvc.perform(request).andExpect(status().isOk()).andReturn();
        return objectMapper.readTree(result.getResponse().getContentAsString());
    }

    private JsonNode firstMatching(JsonNode content, long id) {
        for (JsonNode item : content) {
            if (item.path("id").asLong() == id) {
                return item;
            }
        }
        throw new AssertionError("문법 %d가 목록에 없다".formatted(id));
    }

    /** null(kana 없음)도 자리를 지켜야 비교가 의미를 갖는다 — findValues는 null을 건너뛰므로 직접 훑는다 */
    private List<String> texts(JsonNode examples, String field) {
        List<String> values = new ArrayList<>();
        for (JsonNode example : examples) {
            JsonNode value = example.path(field);
            values.add(value.isNull() || value.isMissingNode() ? null : value.asText());
        }
        return values;
    }
}
