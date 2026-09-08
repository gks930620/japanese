package com.test.test.integration;

import com.fasterxml.jackson.databind.JsonNode;
import org.junit.jupiter.api.Test;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;

import static org.hamcrest.Matchers.contains;
import static org.hamcrest.Matchers.hasSize;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * 보관함 API 통합테스트 (TDD Red — senior-dev 작성)
 *
 * <p>계약 문서: 설계/04_API계약.md §6-4
 * 인수 조건: AC-B-01·02·04·05·06·07·09·11·12·13·14·15·21, AC-X-04
 *
 * <p>핵심 계약 3가지
 * <ol>
 *   <li>전부 <b>인증 필요</b> — /api/bookmarks/** (결정기록 B-8)</li>
 *   <li>담기 1단위: 한자=글자, 문법=항목, <b>어휘=병합된 표제어</b>(대표 id로 정규화)</li>
 *   <li>목록 응답은 <b>자료실 목록과 같은 봉투·같은 항목 DTO</b>다(화면이 컴포넌트를 재사용한다)</li>
 * </ol>
 *
 * <p>이 테스트를 수정하지 말 것 — 계약 변경은 senior-dev 경유 (CLAUDE.md TDD 규칙 2).
 */
class BookmarkApiIntegrationTest extends ApiIntegrationTestSupport {

    private static final long N5_COURSE_ID = 2L;
    private static final long N2_COURSE_ID = 5L;

    /**
     * 시드 고정 값 — 応援(おうえん)은 N4(1217) · N3(2375) · N2(3024) 세 행으로 존재한다.
     * 자료실은 이것을 표제어 1행으로 병합하고 대표 id는 학습 순서가 가장 이른 1217이다(결정기록 A-2·A-3).
     */
    private static final long VOCAB_MEMBER_ID_N2 = 3024L;
    private static final long VOCAB_ENTRY_ID = 1217L;

    // ── 인증 계약 ────────────────────────────────────────────────────────────

    @Test
    void bookmark_apis_require_login() throws Exception {
        mockMvc.perform(get("/api/bookmarks/summary"))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.errorCode").value("NOT_AUTHENTICATED"));

        mockMvc.perform(get("/api/bookmarks/ids"))
                .andExpect(status().isUnauthorized());

        mockMvc.perform(get("/api/bookmarks/kanji"))
                .andExpect(status().isUnauthorized());

        mockMvc.perform(put("/api/bookmarks/kanji/1")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                { "bookmarked": true }
                                """))
                .andExpect(status().isUnauthorized());

        mockMvc.perform(delete("/api/bookmarks/kanji"))
                .andExpect(status().isUnauthorized());
    }

    // ── 빈 상태 ──────────────────────────────────────────────────────────────

    @Test
    void summary_and_ids_are_zero_and_empty_arrays_when_nothing_is_bookmarked() throws Exception {
        Tokens tokens = loginDefaultUser();

        mockMvc.perform(get("/api/bookmarks/summary").header(HttpHeaders.AUTHORIZATION, bearer(tokens.accessToken())))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.kanji").value(0))
                .andExpect(jsonPath("$.data.grammar").value(0))
                .andExpect(jsonPath("$.data.vocabulary").value(0))
                .andExpect(jsonPath("$.data.total").value(0));

        // 배열은 절대 null이 아니다 (결정기록 B-5)
        mockMvc.perform(get("/api/bookmarks/ids").header(HttpHeaders.AUTHORIZATION, bearer(tokens.accessToken())))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.kanji", hasSize(0)))
                .andExpect(jsonPath("$.data.grammar", hasSize(0)))
                .andExpect(jsonPath("$.data.vocabulary", hasSize(0)));
    }

    // ── 담기 · 빼기 ─────────────────────────────────────────────────────────

    @Test
    void kanji_bookmark_is_toggled_on_and_off_and_returns_counts(/* AC-B-01·02·09 */) throws Exception {
        Tokens tokens = loginDefaultUser();
        long kanjiId = firstIdOf(N5_COURSE_ID, 1, "kanjis");

        mockMvc.perform(setBookmark(tokens, "kanji", kanjiId, true))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.type").value("KANJI"))
                .andExpect(jsonPath("$.data.targetId").value(kanjiId))
                .andExpect(jsonPath("$.data.bookmarked").value(true))
                // 별을 누를 때마다 [내 보관함 (n)] 배지가 정확해야 하므로 개수를 함께 내린다
                .andExpect(jsonPath("$.data.counts.kanji").value(1))
                .andExpect(jsonPath("$.data.counts.total").value(1));

        mockMvc.perform(get("/api/bookmarks/ids").header(HttpHeaders.AUTHORIZATION, bearer(tokens.accessToken())))
                .andExpect(jsonPath("$.data.kanji", contains((int) kanjiId)));

        mockMvc.perform(setBookmark(tokens, "kanji", kanjiId, false))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.bookmarked").value(false))
                .andExpect(jsonPath("$.data.counts.kanji").value(0));

        mockMvc.perform(get("/api/bookmarks/ids").header(HttpHeaders.AUTHORIZATION, bearer(tokens.accessToken())))
                .andExpect(jsonPath("$.data.kanji", hasSize(0)));
    }

    @Test
    void bookmarking_twice_keeps_one_row(/* 멱등 — UNIQUE(user, type, target) */) throws Exception {
        Tokens tokens = loginDefaultUser();
        long grammarId = firstIdOf(N5_COURSE_ID, 1, "grammars");

        mockMvc.perform(setBookmark(tokens, "grammar", grammarId, true)).andExpect(status().isOk());
        mockMvc.perform(setBookmark(tokens, "grammar", grammarId, true))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.counts.grammar").value(1));

        // 없는 것을 빼도 200 (실패 재시도가 안전해야 한다)
        long otherGrammarId = firstIdOf(N2_COURSE_ID, 1, "grammars");
        mockMvc.perform(setBookmark(tokens, "grammar", otherGrammarId, false))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.bookmarked").value(false))
                .andExpect(jsonPath("$.data.counts.grammar").value(1));
    }

    @Test
    void vocabulary_bookmark_is_normalized_to_the_merged_entry_id(/* AC-B-06 */) throws Exception {
        Tokens tokens = loginDefaultUser();

        // N2 유닛에서 담은 応援(3024)은 표제어 대표 id(1217)로 저장된다 — 어디서 담아도 같은 항목이다
        mockMvc.perform(setBookmark(tokens, "vocabulary", VOCAB_MEMBER_ID_N2, true))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.type").value("VOCABULARY"))
                .andExpect(jsonPath("$.data.targetId").value(VOCAB_ENTRY_ID))
                .andExpect(jsonPath("$.data.counts.vocabulary").value(1));

        mockMvc.perform(get("/api/bookmarks/ids").header(HttpHeaders.AUTHORIZATION, bearer(tokens.accessToken())))
                .andExpect(jsonPath("$.data.vocabulary", contains((int) VOCAB_ENTRY_ID)));

        // 같은 표제어의 다른 행(N4 1217)을 담아도 두 줄이 되지 않는다
        mockMvc.perform(setBookmark(tokens, "vocabulary", VOCAB_ENTRY_ID, true))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.counts.vocabulary").value(1));

        // 보관함 목록에도 한 행으로만 보인다 (뜻이 여러 개여도)
        mockMvc.perform(get("/api/bookmarks/vocabulary")
                        .header(HttpHeaders.AUTHORIZATION, bearer(tokens.accessToken())))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.content", hasSize(1)))
                .andExpect(jsonPath("$.data.content[0].id").value(VOCAB_ENTRY_ID))
                .andExpect(jsonPath("$.data.content[0].word").value("応援"))
                .andExpect(jsonPath("$.data.totalElements").value(1));
    }

    @Test
    void bookmarking_an_unknown_target_is_404() throws Exception {
        Tokens tokens = loginDefaultUser();

        mockMvc.perform(setBookmark(tokens, "kanji", 999_999L, true))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.errorCode").value("NOT_FOUND"));
    }

    @Test
    void bookmark_requires_bookmarked_flag() throws Exception {
        Tokens tokens = loginDefaultUser();
        long kanjiId = firstIdOf(N5_COURSE_ID, 1, "kanjis");

        mockMvc.perform(put("/api/bookmarks/kanji/" + kanjiId)
                        .header(HttpHeaders.AUTHORIZATION, bearer(tokens.accessToken()))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{}"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.errorCode").value("VALIDATION_ERROR"));
    }

    @Test
    void unknown_bookmark_type_path_is_404_not_400() throws Exception {
        Tokens tokens = loginDefaultUser();

        // 필터 값이 아니라 "없는 주소"다 → 404 (결정기록 B-1). 400은 level·sort 같은 필터 값의 몫(B-2)
        mockMvc.perform(get("/api/bookmarks/hiragana")
                        .header(HttpHeaders.AUTHORIZATION, bearer(tokens.accessToken())))
                .andExpect(status().isNotFound());
    }

    // ── 목록 ────────────────────────────────────────────────────────────────

    @Test
    void bookmark_list_uses_the_same_envelope_and_item_shape_as_the_library(/* AC-B-15 재사용 근거 */) throws Exception {
        Tokens tokens = loginDefaultUser();
        long kanjiId = firstIdOf(N5_COURSE_ID, 1, "kanjis");
        mockMvc.perform(setBookmark(tokens, "kanji", kanjiId, true)).andExpect(status().isOk());

        mockMvc.perform(get("/api/bookmarks/kanji")
                        .header(HttpHeaders.AUTHORIZATION, bearer(tokens.accessToken())))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.content", hasSize(1)))
                // 자료실 목록 항목 DTO와 동일 (KanjiListItemDTO)
                .andExpect(jsonPath("$.data.content[0].id").value(kanjiId))
                .andExpect(jsonPath("$.data.content[0].letter").isNotEmpty())
                .andExpect(jsonPath("$.data.content[0].meaningKo").isNotEmpty())
                .andExpect(jsonPath("$.data.content[0].level").value("N5"))
                // LibraryPageResponse 봉투 그대로 + totalAll = 내가 담은 전체
                .andExpect(jsonPath("$.data.page").value(0))
                .andExpect(jsonPath("$.data.size").value(60))
                .andExpect(jsonPath("$.data.totalElements").value(1))
                .andExpect(jsonPath("$.data.totalAll").value(1))
                .andExpect(jsonPath("$.data.totalPages").value(1))
                .andExpect(jsonPath("$.data.first").value(true))
                .andExpect(jsonPath("$.data.last").value(true));
    }

    @Test
    void bookmark_list_default_sort_is_most_recently_added_first(/* AC-B-12 */) throws Exception {
        Tokens tokens = loginDefaultUser();
        long firstKanji = firstIdOf(N5_COURSE_ID, 1, "kanjis");
        long secondKanji = firstIdOf(N2_COURSE_ID, 1, "kanjis");

        mockMvc.perform(setBookmark(tokens, "kanji", firstKanji, true)).andExpect(status().isOk());
        mockMvc.perform(setBookmark(tokens, "kanji", secondKanji, true)).andExpect(status().isOk());

        // 기본 정렬 RECENT — 나중에 담은 것이 맨 위 (같은 시각이면 id 내림차순으로 결정적)
        mockMvc.perform(get("/api/bookmarks/kanji")
                        .header(HttpHeaders.AUTHORIZATION, bearer(tokens.accessToken())))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.content[0].id").value(secondKanji))
                .andExpect(jsonPath("$.data.content[1].id").value(firstKanji));

        // 학습 순서 정렬로 바꾸면 코스·유닛 순서 (AC-B-13)
        mockMvc.perform(get("/api/bookmarks/kanji")
                        .param("sort", "LEARNING")
                        .header(HttpHeaders.AUTHORIZATION, bearer(tokens.accessToken())))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.content[0].id").value(firstKanji))
                .andExpect(jsonPath("$.data.content[1].id").value(secondKanji));
    }

    @Test
    void bookmark_list_supports_level_filter_and_total_all_stays_the_bookmarked_count(/* AC-B-14 */) throws Exception {
        Tokens tokens = loginDefaultUser();
        long n5Kanji = firstIdOf(N5_COURSE_ID, 1, "kanjis");
        long n2Kanji = firstIdOf(N2_COURSE_ID, 1, "kanjis");
        mockMvc.perform(setBookmark(tokens, "kanji", n5Kanji, true)).andExpect(status().isOk());
        mockMvc.perform(setBookmark(tokens, "kanji", n2Kanji, true)).andExpect(status().isOk());

        mockMvc.perform(get("/api/bookmarks/kanji")
                        .param("level", "N5")
                        .header(HttpHeaders.AUTHORIZATION, bearer(tokens.accessToken())))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.content", hasSize(1)))
                .andExpect(jsonPath("$.data.content[0].id").value(n5Kanji))
                .andExpect(jsonPath("$.data.totalElements").value(1))
                // "담은 2자 중 1자" — totalAll은 필터를 걸지 않았을 때의 담은 개수다
                .andExpect(jsonPath("$.data.totalAll").value(2));
    }

    @Test
    void bookmark_list_rejects_unknown_level_and_sort_values() throws Exception {
        Tokens tokens = loginDefaultUser();

        // 조용히 무시하지 않는다 — 필터가 걸린 줄 알고 잘못된 목록을 보게 된다 (결정기록 B-2)
        mockMvc.perform(get("/api/bookmarks/kanji")
                        .param("level", "N9")
                        .header(HttpHeaders.AUTHORIZATION, bearer(tokens.accessToken())))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.errorCode").value("BUSINESS_RULE_VIOLATION"));

        mockMvc.perform(get("/api/bookmarks/kanji")
                        .param("sort", "XYZ")
                        .header(HttpHeaders.AUTHORIZATION, bearer(tokens.accessToken())))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.errorCode").value("BUSINESS_RULE_VIOLATION"));
    }

    @Test
    void bookmark_list_search_only_looks_inside_what_is_bookmarked(/* AC-B-15 */) throws Exception {
        Tokens tokens = loginDefaultUser();
        long kanjiId = firstIdOf(N5_COURSE_ID, 1, "kanjis");
        String letter = letterOf(kanjiId);
        mockMvc.perform(setBookmark(tokens, "kanji", kanjiId, true)).andExpect(status().isOk());

        mockMvc.perform(get("/api/bookmarks/kanji")
                        .param("q", letter)
                        .header(HttpHeaders.AUTHORIZATION, bearer(tokens.accessToken())))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.content", hasSize(1)))
                .andExpect(jsonPath("$.data.content[0].id").value(kanjiId));

        // 담지 않은 항목은 검색해도 나오지 않는다
        String notBookmarked = letterOf(firstIdOf(N2_COURSE_ID, 1, "kanjis"));
        mockMvc.perform(get("/api/bookmarks/kanji")
                        .param("q", notBookmarked)
                        .header(HttpHeaders.AUTHORIZATION, bearer(tokens.accessToken())))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.content", hasSize(0)))
                .andExpect(jsonPath("$.data.totalElements").value(0))
                .andExpect(jsonPath("$.data.totalAll").value(1));
    }

    // ── 전체 비우기 ─────────────────────────────────────────────────────────

    @Test
    void clear_removes_only_the_requested_type(/* AC-B-21 */) throws Exception {
        Tokens tokens = loginDefaultUser();
        mockMvc.perform(setBookmark(tokens, "kanji", firstIdOf(N5_COURSE_ID, 1, "kanjis"), true))
                .andExpect(status().isOk());
        mockMvc.perform(setBookmark(tokens, "grammar", firstIdOf(N5_COURSE_ID, 1, "grammars"), true))
                .andExpect(status().isOk());

        mockMvc.perform(delete("/api/bookmarks/kanji")
                        .header(HttpHeaders.AUTHORIZATION, bearer(tokens.accessToken())))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.type").value("KANJI"))
                .andExpect(jsonPath("$.data.removed").value(1))
                .andExpect(jsonPath("$.data.counts.kanji").value(0))
                .andExpect(jsonPath("$.data.counts.grammar").value(1));

        mockMvc.perform(get("/api/bookmarks/summary")
                        .header(HttpHeaders.AUTHORIZATION, bearer(tokens.accessToken())))
                .andExpect(jsonPath("$.data.kanji").value(0))
                .andExpect(jsonPath("$.data.grammar").value(1));
    }

    @Test
    void there_is_no_endpoint_that_clears_every_type_at_once() throws Exception {
        Tokens tokens = loginDefaultUser();

        // 종류 없는 전체 삭제는 계약에 없다 — 실수 한 번으로 전 기록이 사라지면 안 된다
        mockMvc.perform(delete("/api/bookmarks")
                        .header(HttpHeaders.AUTHORIZATION, bearer(tokens.accessToken())))
                .andExpect(status().is4xxClientError());
    }

    // ── 헬퍼 ────────────────────────────────────────────────────────────────

    private org.springframework.test.web.servlet.request.MockHttpServletRequestBuilder setBookmark(
            Tokens tokens, String type, long targetId, boolean bookmarked) {
        return put("/api/bookmarks/" + type + "/" + targetId)
                .header(HttpHeaders.AUTHORIZATION, bearer(tokens.accessToken()))
                .contentType(MediaType.APPLICATION_JSON)
                .content("{ \"bookmarked\": " + bookmarked + " }");
    }

    /** 시드 id를 테스트에 박지 않고 공개 API에서 얻는다. */
    private long firstIdOf(long courseId, int unitNo, String arrayField) throws Exception {
        String body = mockMvc.perform(get("/api/courses/" + courseId + "/units/" + unitNo))
                .andExpect(status().isOk())
                .andReturn().getResponse().getContentAsString();
        JsonNode node = objectMapper.readTree(body).path("data").path(arrayField).get(0);
        return node.path("id").asLong();
    }

    private String letterOf(long kanjiId) throws Exception {
        String body = mockMvc.perform(get("/api/library/kanji/" + kanjiId))
                .andExpect(status().isOk())
                .andReturn().getResponse().getContentAsString();
        return objectMapper.readTree(body).path("data").path("letter").asText();
    }
}
