package com.test.test.integration;

import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;
import static org.hamcrest.Matchers.hasSize;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * 진도·보관함이 요구하는 <b>공개 API 추가분</b> 통합테스트 (TDD Red — senior-dev 작성)
 *
 * <p>계약 문서: 설계/04_API계약.md §6-1·§6-7
 *
 * <p>여기 있는 것은 전부 <b>비로그인도 필요한 콘텐츠 사실</b>이다. 사용자 상태(bookmarked·completed)는
 * 공개 응답에 넣지 않는다 — 그러면 B-8이 나눠 놓은 "콘텐츠(공개)/사용자 상태(인증)" 경계가 본문에서 무너진다.
 * 그래서 인증 헤더 없이 호출하는 것 자체가 계약 검증이다.
 *
 * <p>이 테스트를 수정하지 말 것 — 계약 변경은 senior-dev 경유 (CLAUDE.md TDD 규칙 2).
 */
class UserDataPublicContractIntegrationTest extends ApiIntegrationTestSupport {

    private static final long N5_COURSE_ID = 2L;
    private static final long N2_COURSE_ID = 5L;

    /** 応援(おうえん)은 N4(1217)·N3(2375)·N2(3024) 세 행 — 자료실 표제어 대표는 1217이다(A-2·A-3). */
    private static final long VOCAB_MEMBER_ID_N2 = 3024L;
    private static final long VOCAB_ENTRY_ID = 1217L;

    // ── 진도 막대의 분모: 코스 목록의 unitCount ──────────────────────────────

    @Test
    void course_list_carries_unit_count_for_the_progress_bar() throws Exception {
        // 게스트도 "완료 7 / 전체 20"을 그린다. 분자는 브라우저에 있어도 분모는 콘텐츠 사실이라 공개 API가 준다.
        org.springframework.test.web.servlet.MvcResult result = mockMvc.perform(get("/api/courses"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data", hasSize(CourseCatalog.courseCount())))
                .andReturn();

        // 분모는 CourseCatalog에서 파생한다 — 코스가 열릴 때마다 이 테스트를 고치지 않는다(설계/03 §5-1).
        // 준비중 코스는 0이라 진도 막대를 그리지 않는다(AC-P-21).
        com.fasterxml.jackson.databind.JsonNode data =
                objectMapper.readTree(result.getResponse().getContentAsString()).path("data");
        int index = 0;
        for (CourseCatalog.Course expected : CourseCatalog.COURSES) {
            com.fasterxml.jackson.databind.JsonNode course = data.get(index++);
            assertThat(course.path("status").asText()).as("코스 %s 상태", expected.title)
                    .isEqualTo(expected.available ? "AVAILABLE" : "PREPARING");
            assertThat(course.path("unitCount").asInt()).as("코스 %s unitCount", expected.title)
                    .isEqualTo(expected.unitCount);
        }
    }

    // ── ★ 판정의 대상 id: 유닛 학습 어휘의 entryId ──────────────────────────

    @Test
    void unit_study_vocabulary_carries_the_library_entry_id() throws Exception {
        // N2 유닛 2의 応援은 vocabulary.id=3024이지만, 자료실 표제어(담기 1단위)는 1217이다.
        // entryId가 없으면 "유닛에서 담은 단어"와 "자료실에서 담은 단어"가 다른 항목이 된다.
        String body = mockMvc.perform(get("/api/courses/" + N2_COURSE_ID + "/units/2"))
                .andExpect(status().isOk())
                .andReturn().getResponse().getContentAsString();

        var vocabularies = objectMapper.readTree(body).path("data").path("vocabularies");
        var target = java.util.stream.StreamSupport.stream(vocabularies.spliterator(), false)
                .filter(node -> node.path("id").asLong() == VOCAB_MEMBER_ID_N2)
                .findFirst()
                .orElseThrow(() -> new AssertionError("N2 유닛 2에 応援(3024)이 있어야 한다 — 시드 확인"));

        org.assertj.core.api.Assertions.assertThat(target.path("word").asText()).isEqualTo("応援");
        org.assertj.core.api.Assertions.assertThat(target.has("entryId"))
                .as("유닛 학습 어휘에는 entryId가 있어야 한다 (설계/04 §6-1)").isTrue();
        org.assertj.core.api.Assertions.assertThat(target.path("entryId").asLong()).isEqualTo(VOCAB_ENTRY_ID);
    }

    @Test
    void entry_id_matches_the_library_row_id_of_the_same_word() throws Exception {
        // 같은 사실이 두 API에서 어긋나면 ★가 화면마다 달라진다 (C-7 단일 출처)
        mockMvc.perform(get("/api/library/vocabulary").param("q", "応援"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.content[0].word").value("応援"))
                .andExpect(jsonPath("$.data.content[0].id").value(VOCAB_ENTRY_ID));
    }

    /**
     * `entryId` 계약 (04 §6-1) — <b>유닛 어휘의 entryId는 그 어휘가 속한 자료실 표제어 행의 id다.</b>
     *
     * <p>2026-08-21 재작성: 예전에는 "N5 유닛 1의 0번째 어휘는 겹치지 않는다"는 <b>콘텐츠 우연</b>에 기대
     * {@code entryId == id}를 단정했다. 입문이 열리자 「こんにちは」가 병합되며 대표가 입문 행으로 옮겨 가
     * 그 단정이 깨졌다 — <b>설계상 정상 동작인데 테스트가 깨진 것</b>이라 테스트가 틀린 것이었다.
     * N1·영어가 열릴 때마다 같은 일이 반복되므로, 이제 <b>규칙을 검증한다</b>:
     * 어떤 어휘든 그 entryId로 자료실을 조회하면 <b>자기 자신을 품은 표제어</b>가 나와야 한다.
     * 특정 단어·특정 자리에 의존하지 않으므로 콘텐츠가 늘어도 깨지지 않는다.
     */
    @Test
    void unit_study_vocabulary_entry_id_points_to_the_library_entry_that_contains_it() throws Exception {
        String unit = mockMvc.perform(get("/api/courses/" + N5_COURSE_ID + "/units/1"))
                .andExpect(status().isOk())
                .andReturn().getResponse().getContentAsString();

        var vocabularies = objectMapper.readTree(unit).path("data").path("vocabularies");
        assertThat(vocabularies.size()).as("검증할 어휘가 있어야 한다").isPositive();

        boolean sawSingleton = false;
        boolean sawMerged = false;

        for (var vocabulary : vocabularies) {
            long memberId = vocabulary.path("id").asLong();
            long entryId = vocabulary.path("entryId").asLong();

            // entryId로 자료실을 조회하면(ids 필터) 그 표제어 한 줄이 나온다
            String entryBody = mockMvc.perform(get("/api/library/vocabulary").param("ids", String.valueOf(entryId)))
                    .andExpect(status().isOk())
                    .andReturn().getResponse().getContentAsString();
            var content = objectMapper.readTree(entryBody).path("data").path("content");

            assertThat(content.size()).as("entryId %s 로 조회한 표제어", entryId).isEqualTo(1);
            var entry = content.get(0);
            assertThat(entry.path("id").asLong()).as("표제어 id는 entryId와 같다").isEqualTo(entryId);

            // 그 표제어가 실제로 이 어휘를 품고 있어야 한다 — entryId가 엉뚱한 줄을 가리키면 여기서 잡힌다
            java.util.List<Long> memberIds = new java.util.ArrayList<>();
            for (var sense : entry.path("senses")) {
                for (var id : sense.path("vocabularyIds")) {
                    memberIds.add(id.asLong());
                }
            }
            assertThat(memberIds).as("표제어 %s 가 품은 어휘 id", entryId).contains(memberId);

            if (memberIds.size() == 1) {
                // 병합되지 않은 어휘는 자기 자신이 대표다
                sawSingleton = true;
                assertThat(entryId).as("단독 어휘는 entryId == id").isEqualTo(memberId);
            } else {
                // 병합된 어휘의 대표는 학습 순서가 가장 이른 행이다(A-2·A-3) — 그래서 자기 자신이 아닐 수 있다
                sawMerged = true;
                assertThat(memberIds).contains(entryId);
            }
        }

        // 어느 한 갈래도 못 봤다면 이 테스트가 무엇을 지키는지 불분명해진다 — 콘텐츠가 바뀐 신호다
        assertThat(sawSingleton || sawMerged).as("단독·병합 어느 갈래든 검증했어야 한다").isTrue();
    }

    // ── 비로그인 보관함 목록의 근거: 자료실 ids 필터 ────────────────────────

    @Test
    void library_list_can_be_narrowed_to_the_given_ids() throws Exception {
        long n5Kanji = firstKanjiId(N5_COURSE_ID);
        long n2Kanji = firstKanjiId(N2_COURSE_ID);

        mockMvc.perform(get("/api/library/kanji").param("ids", n5Kanji + "," + n2Kanji))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.content", hasSize(2)))
                // ids만 있으면 정렬은 종전대로 학습 순서다
                .andExpect(jsonPath("$.data.content[0].id").value(n5Kanji))
                .andExpect(jsonPath("$.data.content[1].id").value(n2Kanji))
                .andExpect(jsonPath("$.data.totalElements").value(2))
                // totalAll = ids 적용 후·검색/필터 미적용 개수 ("담은 2자 중 …")
                .andExpect(jsonPath("$.data.totalAll").value(2));
    }

    @Test
    void library_list_keeps_the_given_order_when_sort_is_given() throws Exception {
        long n5Kanji = firstKanjiId(N5_COURSE_ID);
        long n2Kanji = firstKanjiId(N2_COURSE_ID);

        // 게스트 보관함의 "최근 담은 순" = 브라우저가 들고 있는 ids 순서 그대로
        mockMvc.perform(get("/api/library/kanji")
                        .param("ids", n2Kanji + "," + n5Kanji)
                        .param("sort", "GIVEN"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.content[0].id").value(n2Kanji))
                .andExpect(jsonPath("$.data.content[1].id").value(n5Kanji));
    }

    @Test
    void library_list_ids_filter_combines_with_level_filter() throws Exception {
        long n5Kanji = firstKanjiId(N5_COURSE_ID);
        long n2Kanji = firstKanjiId(N2_COURSE_ID);

        mockMvc.perform(get("/api/library/kanji")
                        .param("ids", n5Kanji + "," + n2Kanji)
                        .param("level", "N5"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.content", hasSize(1)))
                .andExpect(jsonPath("$.data.content[0].id").value(n5Kanji))
                .andExpect(jsonPath("$.data.totalElements").value(1))
                .andExpect(jsonPath("$.data.totalAll").value(2));
    }

    @Test
    void library_list_ignores_ids_that_no_longer_exist() throws Exception {
        long n5Kanji = firstKanjiId(N5_COURSE_ID);

        // 부분 집합 조회다 — 없는 id는 404가 아니라 조용히 빠진다(콘텐츠 개편 내성)
        mockMvc.perform(get("/api/library/kanji").param("ids", n5Kanji + ",999999"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.content", hasSize(1)))
                .andExpect(jsonPath("$.data.totalAll").value(1));
    }

    @Test
    void library_grammar_and_vocabulary_support_the_same_ids_filter() throws Exception {
        long grammarId = firstIdOf(N5_COURSE_ID, 1, "grammars");

        mockMvc.perform(get("/api/library/grammar").param("ids", String.valueOf(grammarId)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.content", hasSize(1)))
                .andExpect(jsonPath("$.data.content[0].id").value(grammarId));

        // 어휘의 ids는 표제어 대표 id 기준이다
        mockMvc.perform(get("/api/library/vocabulary").param("ids", String.valueOf(VOCAB_ENTRY_ID)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.content", hasSize(1)))
                .andExpect(jsonPath("$.data.content[0].word").value("応援"));
    }

    @Test
    void library_list_rejects_malformed_or_oversized_ids() throws Exception {
        // 숫자가 아니면 400 — 조용히 무시하면 "필터가 걸린 줄 알고 전체를 보는" 사고가 난다 (B-2)
        mockMvc.perform(get("/api/library/kanji").param("ids", "12,abc"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.errorCode").value("BUSINESS_RULE_VIOLATION"));

        StringBuilder tooMany = new StringBuilder();
        for (int i = 1; i <= 201; i++) {
            tooMany.append(i);
            if (i < 201) {
                tooMany.append(",");
            }
        }
        mockMvc.perform(get("/api/library/kanji").param("ids", tooMany.toString()))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.errorCode").value("BUSINESS_RULE_VIOLATION"));
    }

    @Test
    void library_list_rejects_given_sort_without_ids() throws Exception {
        // GIVEN은 "준 순서 그대로"인데 준 것이 없으면 의미가 없다
        mockMvc.perform(get("/api/library/kanji").param("sort", "GIVEN"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.errorCode").value("BUSINESS_RULE_VIOLATION"));
    }

    // ── 헬퍼 ────────────────────────────────────────────────────────────────

    private long firstKanjiId(long courseId) throws Exception {
        return firstIdOf(courseId, 1, "kanjis");
    }

    private long firstIdOf(long courseId, int unitNo, String arrayField) throws Exception {
        String content = mockMvc.perform(get("/api/courses/" + courseId + "/units/" + unitNo))
                .andExpect(status().isOk())
                .andReturn().getResponse().getContentAsString();
        return objectMapper.readTree(content).path("data").path(arrayField).get(0).path("id").asLong();
    }
}
