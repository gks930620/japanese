package com.test.test.integration;

import org.junit.jupiter.api.Test;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.request.MockHttpServletRequestBuilder;

import static org.hamcrest.Matchers.hasSize;
import static org.hamcrest.Matchers.nullValue;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * 브라우저 기록 병합 API 통합테스트 (TDD Red — senior-dev 작성)
 *
 * <p>계약 문서: 설계/04_API계약.md §6-5
 * 인수 조건: AC-G-07·08, AC-X-03(진도와 보관함이 <b>함께</b> 합쳐진다)
 *
 * <p>비로그인 기록은 서버에 없다(localStorage). 그래서 병합은 "클라이언트가 들고 온 문서를
 * 계정 기록과 합집합하는" 단 하나의 엔드포인트다 — 프론트가 기존 API를 수백 번 호출하면
 * 중간 실패 시 <b>반쯤 합쳐진 상태</b>가 남는다.
 *
 * <p>이 테스트를 수정하지 말 것 — 계약 변경은 senior-dev 경유 (CLAUDE.md TDD 규칙 2).
 */
class UserDataMergeApiIntegrationTest extends ApiIntegrationTestSupport {

    private static final String MERGE_URL = "/api/me/merge";
    private static final long N5_COURSE_ID = 2L;

    @Test
    void merge_requires_login() throws Exception {
        mockMvc.perform(post(MERGE_URL)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                { "progress": null, "bookmarks": null }
                                """))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.errorCode").value("NOT_AUTHENTICATED"));
    }

    @Test
    void merge_adds_browser_records_to_the_account(/* AC-X-03 — 진도와 보관함이 함께 */) throws Exception {
        Tokens tokens = loginDefaultUser();
        long kanjiId = firstIdOf(N5_COURSE_ID, 1, "kanjis");
        long grammarId = firstIdOf(N5_COURSE_ID, 1, "grammars");

        mockMvc.perform(merge(tokens, """
                {
                  "progress": {
                    "completedUnits": [ { "courseId": 2, "unitNo": 1 }, { "courseId": 2, "unitNo": 2 } ],
                    "lastPosition": { "courseId": 2, "unitNo": 3, "stepKey": "kanji",
                                      "updatedAt": "2026-08-14T08:00:00" }
                  },
                  "bookmarks": { "kanji": [%d], "grammar": [%d], "vocabulary": [] }
                }
                """.formatted(kanjiId, grammarId)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.completedUnitCount").value(2))
                .andExpect(jsonPath("$.data.lastPosition.unitNo").value(3))
                .andExpect(jsonPath("$.data.bookmarkCounts.kanji").value(1))
                .andExpect(jsonPath("$.data.bookmarkCounts.grammar").value(1))
                .andExpect(jsonPath("$.data.bookmarkCounts.total").value(2));

        mockMvc.perform(get("/api/progress").header(HttpHeaders.AUTHORIZATION, bearer(tokens.accessToken())))
                .andExpect(jsonPath("$.data.completedUnits", hasSize(2)))
                .andExpect(jsonPath("$.data.lastPosition.stepKey").value("kanji"));
    }

    @Test
    void merge_is_a_union_and_is_idempotent(/* 같은 payload를 두 번 보내도 결과가 같다 */) throws Exception {
        Tokens tokens = loginDefaultUser();

        // 계정에 이미 유닛 1이 완료돼 있다
        mockMvc.perform(put("/api/progress/units/2/1/completion")
                        .header(HttpHeaders.AUTHORIZATION, bearer(tokens.accessToken()))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                { "completed": true }
                                """))
                .andExpect(status().isOk());

        String payload = """
                {
                  "progress": {
                    "completedUnits": [ { "courseId": 2, "unitNo": 1 }, { "courseId": 2, "unitNo": 7 } ],
                    "lastPosition": null
                  },
                  "bookmarks": null
                }
                """;

        // 합집합: 1(양쪽) + 7(브라우저) = 2개. 중복이 두 행이 되지 않는다
        mockMvc.perform(merge(tokens, payload))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.completedUnitCount").value(2));

        mockMvc.perform(merge(tokens, payload))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.completedUnitCount").value(2));
    }

    @Test
    void merge_keeps_the_more_recent_last_position() throws Exception {
        Tokens tokens = loginDefaultUser();

        // 계정의 마지막 위치를 먼저 만든다(서버 시각 = 지금)
        mockMvc.perform(put("/api/progress/last-position")
                        .header(HttpHeaders.AUTHORIZATION, bearer(tokens.accessToken()))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                { "courseId": 3, "unitNo": 9, "stepKey": "vocab" }
                                """))
                .andExpect(status().isOk());

        // 브라우저 값이 더 오래됐다 → 계정 값이 남는다
        mockMvc.perform(merge(tokens, """
                {
                  "progress": {
                    "completedUnits": [],
                    "lastPosition": { "courseId": 2, "unitNo": 1, "stepKey": "dialog",
                                      "updatedAt": "2020-01-01T00:00:00" }
                  },
                  "bookmarks": null
                }
                """))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.lastPosition.courseId").value(3))
                .andExpect(jsonPath("$.data.lastPosition.unitNo").value(9));

        // 브라우저 값이 더 최근이다 → 브라우저 값으로 바뀐다
        mockMvc.perform(merge(tokens, """
                {
                  "progress": {
                    "completedUnits": [],
                    "lastPosition": { "courseId": 2, "unitNo": 1, "stepKey": "dialog",
                                      "updatedAt": "2099-01-01T00:00:00" }
                  },
                  "bookmarks": null
                }
                """))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.lastPosition.courseId").value(N5_COURSE_ID))
                .andExpect(jsonPath("$.data.lastPosition.unitNo").value(1))
                .andExpect(jsonPath("$.data.lastPosition.stepKey").value("dialog"));
    }

    @Test
    void merge_skips_items_that_no_longer_exist_instead_of_failing(/* 벌크 화해 — 설계/04 §6-5 */) throws Exception {
        Tokens tokens = loginDefaultUser();
        long kanjiId = firstIdOf(N5_COURSE_ID, 1, "kanjis");

        // 낡은 브라우저 기록에 사라진 유닛·항목이 섞여 있어도 나머지는 합쳐진다.
        // "지금 없는 코스"의 대상은 표에서 계산한다 — 입문이 열렸으니 준비중은 N1이다(설계/03 §5-1)
        mockMvc.perform(merge(tokens, """
                {
                  "progress": {
                    "completedUnits": [ { "courseId": 2, "unitNo": 1 }, { "courseId": 2, "unitNo": 999 },
                                        { "courseId": 99, "unitNo": 1 }, { "courseId": %d, "unitNo": 1 } ],
                    "lastPosition": { "courseId": 99, "unitNo": 1, "stepKey": "kanji",
                                      "updatedAt": "2099-01-01T00:00:00" }
                  },
                  "bookmarks": { "kanji": [%d, 999999], "grammar": [], "vocabulary": [] }
                }
                """.formatted(CourseCatalog.somePreparingCourse().id, kanjiId)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.completedUnitCount").value(1))
                .andExpect(jsonPath("$.data.bookmarkCounts.kanji").value(1))
                // 없는 코스를 가리키는 마지막 위치는 조용히 버려진다
                .andExpect(jsonPath("$.data.lastPosition").value(nullValue()));
    }

    @Test
    void merge_rejects_payloads_over_the_guest_limits() throws Exception {
        Tokens tokens = loginDefaultUser();

        // 게스트 상한은 종류별 200이다 — 201개는 조작된 요청이다 (설계/04 §6-6)
        StringBuilder ids = new StringBuilder();
        for (int i = 1; i <= 201; i++) {
            ids.append(i);
            if (i < 201) {
                ids.append(",");
            }
        }

        mockMvc.perform(merge(tokens, """
                { "progress": null, "bookmarks": { "kanji": [%s], "grammar": [], "vocabulary": [] } }
                """.formatted(ids)))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.errorCode").value("VALIDATION_ERROR"));
    }

    @Test
    void merge_with_an_empty_document_succeeds_and_changes_nothing() throws Exception {
        Tokens tokens = loginDefaultUser();

        mockMvc.perform(merge(tokens, """
                { "progress": null, "bookmarks": null }
                """))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.completedUnitCount").value(0))
                .andExpect(jsonPath("$.data.lastPosition").value(nullValue()))
                .andExpect(jsonPath("$.data.bookmarkCounts.total").value(0));
    }

    // ── 헬퍼 ────────────────────────────────────────────────────────────────

    private MockHttpServletRequestBuilder merge(Tokens tokens, String body) {
        return post(MERGE_URL)
                .header(HttpHeaders.AUTHORIZATION, bearer(tokens.accessToken()))
                .contentType(MediaType.APPLICATION_JSON)
                .content(body);
    }

    private long firstIdOf(long courseId, int unitNo, String arrayField) throws Exception {
        String content = mockMvc.perform(get("/api/courses/" + courseId + "/units/" + unitNo))
                .andExpect(status().isOk())
                .andReturn().getResponse().getContentAsString();
        return objectMapper.readTree(content).path("data").path(arrayField).get(0).path("id").asLong();
    }
}
