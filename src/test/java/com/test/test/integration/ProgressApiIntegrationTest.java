package com.test.test.integration;

import org.junit.jupiter.api.Test;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;

import static org.hamcrest.Matchers.hasSize;
import static org.hamcrest.Matchers.nullValue;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * 진도 API 통합테스트 (TDD Red — senior-dev 작성)
 *
 * <p>계약 문서: 설계/04_API계약.md §6-3
 * 인수 조건: AC-P-01·03·04·05·07·11·29·30, AC-G-12(로그인 계정 기록)
 *
 * <p>네임스페이스 계약: /api/progress/** 는 전부 <b>인증 필요</b>다(결정기록 B-8 · 설계/07 §5-4).
 * 인증 없는 호출이 401이라는 것 자체가 계약이므로 테스트로 고정한다.
 *
 * <p>이 테스트를 수정하지 말 것 — 계약 변경은 senior-dev 경유 (CLAUDE.md TDD 규칙 2).
 */
class ProgressApiIntegrationTest extends ApiIntegrationTestSupport {

    private static final long N5_COURSE_ID = 2L;
    private static final long N4_COURSE_ID = 3L;

    private static final String LAST_POSITION_URL = "/api/progress/last-position";

    private String completion(long courseId, int unitNo) {
        return "/api/progress/units/" + courseId + "/" + unitNo + "/completion";
    }

    // ── 인증 계약 ────────────────────────────────────────────────────────────

    @Test
    void progress_apis_require_login() throws Exception {
        mockMvc.perform(get("/api/progress"))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.errorCode").value("NOT_AUTHENTICATED"));

        mockMvc.perform(put(LAST_POSITION_URL)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                { "courseId": 2, "unitNo": 1, "stepKey": "kanji" }
                                """))
                .andExpect(status().isUnauthorized());

        mockMvc.perform(put(completion(N5_COURSE_ID, 1))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                { "completed": true }
                                """))
                .andExpect(status().isUnauthorized());

        mockMvc.perform(delete("/api/progress"))
                .andExpect(status().isUnauthorized());
    }

    // ── 조회 ────────────────────────────────────────────────────────────────

    @Test
    void progress_is_empty_document_for_a_user_without_records() throws Exception {
        Tokens tokens = loginDefaultUser();

        // 기록이 없어도 200이고, 배열은 [] · lastPosition은 null로 "항상 내려간다" (결정기록 B-5)
        mockMvc.perform(get("/api/progress")
                        .header(HttpHeaders.AUTHORIZATION, bearer(tokens.accessToken())))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data.completedUnits", hasSize(0)))
                .andExpect(jsonPath("$.data.lastPosition").value(nullValue()));
    }

    // ── 마지막 위치 ──────────────────────────────────────────────────────────

    @Test
    void last_position_is_saved_and_returned(/* AC-P-07 */) throws Exception {
        Tokens tokens = loginDefaultUser();

        mockMvc.perform(put(LAST_POSITION_URL)
                        .header(HttpHeaders.AUTHORIZATION, bearer(tokens.accessToken()))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                { "courseId": 2, "unitNo": 4, "stepKey": "grammar-1" }
                                """))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.courseId").value(N5_COURSE_ID))
                .andExpect(jsonPath("$.data.unitNo").value(4))
                .andExpect(jsonPath("$.data.stepKey").value("grammar-1"))
                // updatedAt은 서버 시각이다 — 클라이언트가 보내지 않는다
                .andExpect(jsonPath("$.data.updatedAt").isNotEmpty());

        mockMvc.perform(get("/api/progress")
                        .header(HttpHeaders.AUTHORIZATION, bearer(tokens.accessToken())))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.lastPosition.courseId").value(N5_COURSE_ID))
                .andExpect(jsonPath("$.data.lastPosition.unitNo").value(4))
                .andExpect(jsonPath("$.data.lastPosition.stepKey").value("grammar-1"));
    }

    @Test
    void last_position_keeps_only_one_row_per_user(/* AC-P-11 — 사이트 전체에 하나 */) throws Exception {
        Tokens tokens = loginDefaultUser();

        saveLastPosition(tokens, N5_COURSE_ID, 4, "kanji");
        saveLastPosition(tokens, N4_COURSE_ID, 9, "summary");

        mockMvc.perform(get("/api/progress")
                        .header(HttpHeaders.AUTHORIZATION, bearer(tokens.accessToken())))
                .andExpect(status().isOk())
                // 유닛 A를 보다가 유닛 B로 가면 A는 남지 않는다
                .andExpect(jsonPath("$.data.lastPosition.courseId").value(N4_COURSE_ID))
                .andExpect(jsonPath("$.data.lastPosition.unitNo").value(9))
                .andExpect(jsonPath("$.data.lastPosition.stepKey").value("summary"));
    }

    @Test
    void last_position_rejects_missing_or_malformed_step_key() throws Exception {
        Tokens tokens = loginDefaultUser();

        // 빈 stepKey → 400 VALIDATION_ERROR
        mockMvc.perform(put(LAST_POSITION_URL)
                        .header(HttpHeaders.AUTHORIZATION, bearer(tokens.accessToken()))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                { "courseId": 2, "unitNo": 4, "stepKey": "  " }
                                """))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.errorCode").value("VALIDATION_ERROR"));

        // 형식 위반(대문자) → 400. 서버는 스텝 구성을 모르므로 형식만 본다 (설계/04 §6-2)
        mockMvc.perform(put(LAST_POSITION_URL)
                        .header(HttpHeaders.AUTHORIZATION, bearer(tokens.accessToken()))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                { "courseId": 2, "unitNo": 4, "stepKey": "KANJI" }
                                """))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.errorCode").value("VALIDATION_ERROR"));

        // courseId 누락 → 400
        mockMvc.perform(put(LAST_POSITION_URL)
                        .header(HttpHeaders.AUTHORIZATION, bearer(tokens.accessToken()))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                { "unitNo": 4, "stepKey": "kanji" }
                                """))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.errorCode").value("VALIDATION_ERROR"));
    }

    @Test
    void last_position_rejects_unknown_unit_and_preparing_course() throws Exception {
        Tokens tokens = loginDefaultUser();

        // 없는 유닛 → 404 NOT_FOUND (콘텐츠 FK가 없으므로 앱이 존재를 검증한다 — 설계/03 §4-1)
        mockMvc.perform(put(LAST_POSITION_URL)
                        .header(HttpHeaders.AUTHORIZATION, bearer(tokens.accessToken()))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                { "courseId": 2, "unitNo": 999, "stepKey": "kanji" }
                                """))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.errorCode").value("NOT_FOUND"));

        // 준비중 코스 → 404 COURSE_PREPARING (없음과 준비중을 구분한다 — 결정기록 B-4)
        // 대상은 CourseCatalog가 계산한다 — 입문이 열린 뒤로는 N1이 그 자리다(설계/03 §5-1)
        mockMvc.perform(put(LAST_POSITION_URL)
                        .header(HttpHeaders.AUTHORIZATION, bearer(tokens.accessToken()))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                { "courseId": %d, "unitNo": 1, "stepKey": "kanji" }
                                """.formatted(CourseCatalog.somePreparingCourse().id)))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.errorCode").value("COURSE_PREPARING"));
    }

    // ── 완료 토글 ────────────────────────────────────────────────────────────

    @Test
    void unit_completion_is_turned_on_and_is_idempotent(/* AC-P-01 */) throws Exception {
        Tokens tokens = loginDefaultUser();

        mockMvc.perform(put(completion(N5_COURSE_ID, 3))
                        .header(HttpHeaders.AUTHORIZATION, bearer(tokens.accessToken()))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                { "completed": true }
                                """))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.courseId").value(N5_COURSE_ID))
                .andExpect(jsonPath("$.data.unitNo").value(3))
                .andExpect(jsonPath("$.data.completed").value(true));

        // 같은 요청을 다시 보내도 200이고 행은 하나다 (UNIQUE 제약 — 설계/03 §4-1)
        setCompleted(tokens, N5_COURSE_ID, 3, true);

        mockMvc.perform(get("/api/progress")
                        .header(HttpHeaders.AUTHORIZATION, bearer(tokens.accessToken())))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.completedUnits", hasSize(1)))
                .andExpect(jsonPath("$.data.completedUnits[0].courseId").value(N5_COURSE_ID))
                .andExpect(jsonPath("$.data.completedUnits[0].unitNo").value(3));
    }

    @Test
    void unit_completion_is_turned_off_by_the_same_endpoint(/* AC-P-04·05 */) throws Exception {
        Tokens tokens = loginDefaultUser();
        setCompleted(tokens, N5_COURSE_ID, 3, true);

        mockMvc.perform(put(completion(N5_COURSE_ID, 3))
                        .header(HttpHeaders.AUTHORIZATION, bearer(tokens.accessToken()))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                { "completed": false }
                                """))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.completed").value(false));

        mockMvc.perform(get("/api/progress")
                        .header(HttpHeaders.AUTHORIZATION, bearer(tokens.accessToken())))
                .andExpect(jsonPath("$.data.completedUnits", hasSize(0)));

        // 없던 것을 다시 끄는 것도 200 (멱등 — 실패 재시도가 안전해야 한다)
        setCompleted(tokens, N5_COURSE_ID, 3, false);
    }

    @Test
    void completed_units_are_returned_in_course_then_unit_order() throws Exception {
        Tokens tokens = loginDefaultUser();
        setCompleted(tokens, N4_COURSE_ID, 2, true);
        setCompleted(tokens, N5_COURSE_ID, 5, true);
        setCompleted(tokens, N5_COURSE_ID, 1, true);

        // 응답 순서는 결정적이어야 한다(프론트가 정렬을 다시 하지 않게)
        mockMvc.perform(get("/api/progress")
                        .header(HttpHeaders.AUTHORIZATION, bearer(tokens.accessToken())))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.completedUnits", hasSize(3)))
                .andExpect(jsonPath("$.data.completedUnits[0].courseId").value(N5_COURSE_ID))
                .andExpect(jsonPath("$.data.completedUnits[0].unitNo").value(1))
                .andExpect(jsonPath("$.data.completedUnits[1].courseId").value(N5_COURSE_ID))
                .andExpect(jsonPath("$.data.completedUnits[1].unitNo").value(5))
                .andExpect(jsonPath("$.data.completedUnits[2].courseId").value(N4_COURSE_ID))
                .andExpect(jsonPath("$.data.completedUnits[2].unitNo").value(2));
    }

    @Test
    void unit_completion_requires_completed_flag() throws Exception {
        Tokens tokens = loginDefaultUser();

        mockMvc.perform(put(completion(N5_COURSE_ID, 3))
                        .header(HttpHeaders.AUTHORIZATION, bearer(tokens.accessToken()))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{}"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.errorCode").value("VALIDATION_ERROR"));
    }

    @Test
    void unit_completion_rejects_unknown_unit_and_preparing_course() throws Exception {
        Tokens tokens = loginDefaultUser();

        mockMvc.perform(put(completion(N5_COURSE_ID, 999))
                        .header(HttpHeaders.AUTHORIZATION, bearer(tokens.accessToken()))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                { "completed": true }
                                """))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.errorCode").value("NOT_FOUND"));

        // 준비중 코스의 완료 토글도 같은 규칙 — 대상은 표에서 계산한다
        mockMvc.perform(put(completion(CourseCatalog.somePreparingCourse().id, 1))
                        .header(HttpHeaders.AUTHORIZATION, bearer(tokens.accessToken()))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                { "completed": true }
                                """))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.errorCode").value("COURSE_PREPARING"));
    }

    // ── 초기화 ──────────────────────────────────────────────────────────────

    @Test
    void progress_reset_clears_units_and_last_position_but_keeps_bookmarks(/* AC-P-29·30 */) throws Exception {
        Tokens tokens = loginDefaultUser();
        setCompleted(tokens, N5_COURSE_ID, 1, true);
        setCompleted(tokens, N5_COURSE_ID, 2, true);
        saveLastPosition(tokens, N5_COURSE_ID, 2, "vocab");

        // 보관함에 하나 담아 둔다 — 초기화가 여기까지 지우면 안 된다
        long kanjiId = firstKanjiIdOfUnit(N5_COURSE_ID, 1);
        mockMvc.perform(put("/api/bookmarks/kanji/" + kanjiId)
                        .header(HttpHeaders.AUTHORIZATION, bearer(tokens.accessToken()))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                { "bookmarked": true }
                                """))
                .andExpect(status().isOk());

        mockMvc.perform(delete("/api/progress")
                        .header(HttpHeaders.AUTHORIZATION, bearer(tokens.accessToken())))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.deletedUnitCount").value(2));

        mockMvc.perform(get("/api/progress")
                        .header(HttpHeaders.AUTHORIZATION, bearer(tokens.accessToken())))
                .andExpect(jsonPath("$.data.completedUnits", hasSize(0)))
                .andExpect(jsonPath("$.data.lastPosition").value(nullValue()));

        // 보관함은 그대로 (AC-P-30)
        mockMvc.perform(get("/api/bookmarks/summary")
                        .header(HttpHeaders.AUTHORIZATION, bearer(tokens.accessToken())))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.kanji").value(1));
    }

    @Test
    void progress_reset_is_idempotent() throws Exception {
        Tokens tokens = loginDefaultUser();

        mockMvc.perform(delete("/api/progress")
                        .header(HttpHeaders.AUTHORIZATION, bearer(tokens.accessToken())))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.deletedUnitCount").value(0));
    }

    // ── 헬퍼 ────────────────────────────────────────────────────────────────

    private void setCompleted(Tokens tokens, long courseId, int unitNo, boolean completed) throws Exception {
        mockMvc.perform(put(completion(courseId, unitNo))
                        .header(HttpHeaders.AUTHORIZATION, bearer(tokens.accessToken()))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{ \"completed\": " + completed + " }"))
                .andExpect(status().isOk());
    }

    private void saveLastPosition(Tokens tokens, long courseId, int unitNo, String stepKey) throws Exception {
        mockMvc.perform(put(LAST_POSITION_URL)
                        .header(HttpHeaders.AUTHORIZATION, bearer(tokens.accessToken()))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{ \"courseId\": %d, \"unitNo\": %d, \"stepKey\": \"%s\" }"
                                .formatted(courseId, unitNo, stepKey)))
                .andExpect(status().isOk());
    }

    /** 시드 id를 테스트에 박지 않고 공개 API에서 얻는다(콘텐츠가 바뀌어도 테스트가 버틴다). */
    private long firstKanjiIdOfUnit(long courseId, int unitNo) throws Exception {
        String body = mockMvc.perform(get("/api/courses/" + courseId + "/units/" + unitNo))
                .andExpect(status().isOk())
                .andReturn().getResponse().getContentAsString();
        return objectMapper.readTree(body).path("data").path("kanjis").get(0).path("id").asLong();
    }
}
