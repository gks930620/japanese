package com.test.test.integration;

import static org.hamcrest.Matchers.empty;
import static org.hamcrest.Matchers.hasSize;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.fasterxml.jackson.databind.JsonNode;
import org.junit.jupiter.api.Test;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MvcResult;

/**
 * 보관함의 "존재" 판정은 <b>그 보관함의 과정 언어(JA) 안에서만</b> 한다 (TDD Red — senior-dev 작성, 2026-09-03 판정 H1).
 *
 * <p><b>문제</b>: {@code PUT /api/bookmarks/grammar/{영어 문법 id}}가 200으로 저장됐다. 이후 {@code /ids}·{@code /summary}는
 * 1을 말하고 {@code /api/bookmarks/grammar} 목록은 0건이다 — 목록 조회는 JA로 걸러지는데 존재 판정
 * ({@code LibraryGrammarQueryRepository.findExistingIds})만 언어를 안 봤다. 어휘는 {@code resolveEntryId}가 JA 고정이라
 * 이미 404를 준다. <b>종류마다 "존재"의 뜻이 달랐다.</b></p>
 *
 * <p><b>왜 서버가 막는가(프론트 방어로 부족한 이유)</b>: {@code POST /api/me/merge}가 같은 판정을 탄다. 게스트 localStorage는
 * 사용자가 편집할 수 있는 문서라, 영어 id를 넣고 [합치기]를 누르면 유령 개수가 계정에 영구히 남는다.</p>
 *
 * <p><b>계약</b>(설계/04 §6-4): "없는 대상(자료실에 없는 항목 포함) 404" — 영어 문법은 일본어 자료실에 없는 항목이다.
 * 병합은 "존재하지 않는 항목은 조용히 건너뛴다"(§6-5) — 영어 id는 건너뛰어야 하고 개수에 잡히면 안 된다.</p>
 *
 * <p>이 테스트를 수정하지 말 것 — 계약 변경은 senior-dev 경유 (CLAUDE.md TDD 규칙 2).</p>
 */
class BookmarkLanguageContractIntegrationTest extends ApiIntegrationTestSupport {

    @Test
    void bookmarking_an_english_grammar_point_is_404_like_any_other_missing_target() throws Exception {
        Tokens tokens = loginDefaultUser();
        long englishGrammarId = firstEnglishGrammarId();

        mockMvc.perform(put("/api/bookmarks/grammar/" + englishGrammarId)
                        .header(HttpHeaders.AUTHORIZATION, bearer(tokens.accessToken()))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{ \"bookmarked\": true }"))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.errorCode").value("NOT_FOUND"));

        // 저장되지 않았으므로 개수·id 집합 어디에도 흔적이 없다
        mockMvc.perform(get("/api/bookmarks/ids").header(HttpHeaders.AUTHORIZATION, bearer(tokens.accessToken())))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.grammar", empty()));
        mockMvc.perform(get("/api/bookmarks/summary").header(HttpHeaders.AUTHORIZATION, bearer(tokens.accessToken())))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.grammar").value(0));
    }

    @Test
    void merge_skips_english_grammar_ids_instead_of_counting_them(/* 04 §6-5 — 조용히 건너뛴다 */) throws Exception {
        Tokens tokens = loginDefaultUser();
        long englishGrammarId = firstEnglishGrammarId();

        mockMvc.perform(post("/api/me/merge")
                        .header(HttpHeaders.AUTHORIZATION, bearer(tokens.accessToken()))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                { "progress": { "completedUnits": [], "lastPosition": null },
                                  "bookmarks": { "kanji": [], "grammar": [%d], "vocabulary": [] } }
                                """.formatted(englishGrammarId)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.bookmarkCounts.grammar").value(0))
                .andExpect(jsonPath("$.data.bookmarkCounts.total").value(0));

        // 개수(0)와 목록(0건)이 같은 말을 한다
        mockMvc.perform(get("/api/bookmarks/grammar").header(HttpHeaders.AUTHORIZATION, bearer(tokens.accessToken())))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.content", hasSize(0)))
                .andExpect(jsonPath("$.data.totalAll").value(0));
        mockMvc.perform(get("/api/bookmarks/ids").header(HttpHeaders.AUTHORIZATION, bearer(tokens.accessToken())))
                .andExpect(jsonPath("$.data.grammar", empty()));
    }

    @Test
    void a_japanese_grammar_point_still_bookmarks_normally(/* 가드 — 언어 조건이 일본어를 막지 않는다 */) throws Exception {
        Tokens tokens = loginDefaultUser();
        long japaneseGrammarId = firstJapaneseGrammarId();

        mockMvc.perform(put("/api/bookmarks/grammar/" + japaneseGrammarId)
                        .header(HttpHeaders.AUTHORIZATION, bearer(tokens.accessToken()))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{ \"bookmarked\": true }"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.counts.grammar").value(1));

        mockMvc.perform(get("/api/bookmarks/grammar").header(HttpHeaders.AUTHORIZATION, bearer(tokens.accessToken())))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.content", hasSize(1)))
                .andExpect(jsonPath("$.data.content[0].id").value(japaneseGrammarId));
    }

    /** 시드 id를 박지 않고 공개 API에서 얻는다 — 영어 자료실의 첫 문법 */
    private long firstEnglishGrammarId() throws Exception {
        return firstIdOf("/api/en/library/grammar");
    }

    private long firstJapaneseGrammarId() throws Exception {
        return firstIdOf("/api/library/grammar");
    }

    private long firstIdOf(String listUrl) throws Exception {
        MvcResult result = mockMvc.perform(get(listUrl).param("size", "1"))
                .andExpect(status().isOk())
                .andReturn();
        JsonNode content = objectMapper.readTree(result.getResponse().getContentAsString())
                .path("data").path("content");
        if (content.isEmpty()) {
            throw new IllegalStateException("자료실이 비어 있다: " + listUrl);
        }
        return content.get(0).path("id").asLong();
    }
}
