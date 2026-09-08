package com.test.test.integration;

import com.fasterxml.jackson.databind.JsonNode;
import com.test.test.bookmark.repository.UserBookmarkRepository;
import com.test.test.progress.repository.UserLastPositionRepository;
import com.test.test.progress.repository.UserUnitCompletionRepository;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MvcResult;

import static org.assertj.core.api.Assertions.assertThat;
import static org.hamcrest.Matchers.hasItem;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * 회원 탈퇴 API 통합테스트 (senior-dev 작성)
 *
 * <p>계약 문서: `설계/04_API계약.md` §4-1 (탈퇴 미리보기 · POST /api/me/withdrawal)
 * 인수 조건: AC-A-30 ~ AC-A-40, AC-X-07
 *
 * <p>2026-08-17 — <b>채팅 기능이 사용자 결정으로 제거됐다</b>(설계/04 §5).
 * 채팅 참여 삭제·메시지 익명화·방장 표기 검증과 미리보기의 채팅 숫자 검증을 이 파일에서 걷어냈다.
 * 미리보기 응답에 채팅 필드가 <b>없어야 한다</b>는 것도 계약이므로 doesNotExist로 고정한다.
 *
 * <p><b>탈퇴는 되돌릴 수 없다.</b> 그래서 이 테스트는 두 가지를 함께 고정한다 —
 * ① 지워져야 할 것이 지워졌는가 ② <b>지워지면 안 되는 것이 남았는가</b>.
 *
 * <p>⚠️ 이 파일에만 리포지토리 직접 검증이 있다(컨벤션 §6의 "컨트롤러 통합테스트만"에 대한 명시적 예외).
 * 탈퇴 후에는 그 계정으로 로그인·조회가 불가능해 <b>삭제 사실을 응답으로 확인할 방법이 없고</b>,
 * 되돌릴 수 없는 삭제를 검증 없이 넘길 수는 없기 때문이다. 행위는 여전히 MockMvc로만 일으킨다.
 *
 * <p>이 테스트를 수정하지 말 것 — 계약 변경은 senior-dev 경유 (CLAUDE.md TDD 규칙 2).
 */
class WithdrawalApiIntegrationTest extends ApiIntegrationTestSupport {

    private static final String PREVIEW_URL = "/api/me/withdrawal-preview";
    private static final String WITHDRAWAL_URL = "/api/me/withdrawal";

    /** 시드 사용자 id — `data-users.sql`(3 = gks930620) */
    private static final long DEFAULT_USER_ID = 3L;

    private static final long N5_COURSE_ID = 2L;
    private static final long VOCAB_ENTRY_ID = 1217L;

    private static final String WITHDRAWN_NICKNAME = "탈퇴한 회원";

    @Autowired
    private UserUnitCompletionRepository userUnitCompletionRepository;

    @Autowired
    private UserLastPositionRepository userLastPositionRepository;

    @Autowired
    private UserBookmarkRepository userBookmarkRepository;

    private void makeSomeUserData(Tokens tokens) throws Exception {
        mockMvc.perform(put("/api/progress/units/" + N5_COURSE_ID + "/1/completion")
                        .header(HttpHeaders.AUTHORIZATION, bearer(tokens.accessToken()))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                { "completed": true }
                                """))
                .andExpect(status().isOk());

        mockMvc.perform(put("/api/progress/last-position")
                        .header(HttpHeaders.AUTHORIZATION, bearer(tokens.accessToken()))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                { "courseId": 2, "unitNo": 1, "stepKey": "kanji" }
                                """))
                .andExpect(status().isOk());

        mockMvc.perform(put("/api/bookmarks/vocabulary/" + VOCAB_ENTRY_ID)
                        .header(HttpHeaders.AUTHORIZATION, bearer(tokens.accessToken()))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                { "bookmarked": true }
                                """))
                .andExpect(status().isOk());
    }

    private void withdrawWithPassword(Tokens tokens, String password) throws Exception {
        mockMvc.perform(post(WITHDRAWAL_URL)
                        .header(HttpHeaders.AUTHORIZATION, bearer(tokens.accessToken()))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                { "password": "%s" }
                                """.formatted(password)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.withdrawn").value(true));
    }

    // ── 인증 계약 ────────────────────────────────────────────────────────────

    @Test
    void withdrawal_apis_require_login() throws Exception {
        mockMvc.perform(get(PREVIEW_URL))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.errorCode").value("NOT_AUTHENTICATED"));

        mockMvc.perform(post(WITHDRAWAL_URL)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                { "password": "1234" }
                                """))
                .andExpect(status().isUnauthorized());
    }

    // ── 탈퇴 안내 화면의 숫자 (AC-A-30) ──────────────────────────────────────

    @Test
    void withdrawal_preview_reports_real_numbers() throws Exception {
        Tokens tokens = loginDefaultUser();
        makeSomeUserData(tokens);

        mockMvc.perform(get(PREVIEW_URL)
                        .header(HttpHeaders.AUTHORIZATION, bearer(tokens.accessToken())))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.completedUnitCount").value(1))
                .andExpect(jsonPath("$.data.bookmarkCounts.vocabulary").value(1))
                .andExpect(jsonPath("$.data.bookmarkCounts.total").value(1))
                // "남는 것"의 숫자 — 시드 사용자 3은 댓글이 있고 글은 없다
                .andExpect(jsonPath("$.data.communityCount").value(0))
                .andExpect(jsonPath("$.data.commentCount").isNumber())
                // 로컬 계정은 비밀번호로 본인을 확인한다 (AC-A-18의 반대 분기)
                .andExpect(jsonPath("$.data.confirmationType").value("PASSWORD"))
                // 채팅 제거(설계/04 §5) — 죽은 숫자를 계약에 남기지 않는다
                .andExpect(jsonPath("$.data.chatMessageCount").doesNotExist())
                .andExpect(jsonPath("$.data.joinedRoomCount").doesNotExist())
                .andExpect(jsonPath("$.data.ownedRoomCount").doesNotExist());
    }

    @Test
    void withdrawal_preview_counts_my_own_post() throws Exception {
        Tokens tokens = loginDefaultUser();
        createPost(tokens);

        mockMvc.perform(get(PREVIEW_URL)
                        .header(HttpHeaders.AUTHORIZATION, bearer(tokens.accessToken())))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.communityCount").value(1));
    }

    // ── 본인 확인 (AC-A-33) ─────────────────────────────────────────────────

    @Test
    void withdrawal_rejects_wrong_password_and_keeps_the_account_alive() throws Exception {
        Tokens tokens = loginDefaultUser();

        mockMvc.perform(post(WITHDRAWAL_URL)
                        .header(HttpHeaders.AUTHORIZATION, bearer(tokens.accessToken()))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                { "password": "wrong-password" }
                                """))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.errorCode").value("PASSWORD_MISMATCH"));

        // 실패해도 로그인은 유지된다 (설계/04 §4-1 예외표)
        mockMvc.perform(get("/api/users/me")
                        .header(HttpHeaders.AUTHORIZATION, bearer(tokens.accessToken())))
                .andExpect(status().isOk());
    }

    @Test
    void withdrawal_rejects_missing_confirmation() throws Exception {
        Tokens tokens = loginDefaultUser();

        mockMvc.perform(post(WITHDRAWAL_URL)
                        .header(HttpHeaders.AUTHORIZATION, bearer(tokens.accessToken()))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{}"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.errorCode").value("PASSWORD_MISMATCH"));
    }

    // ── 지워지는 것 ─────────────────────────────────────────────────────────

    @Test
    void withdrawal_deletes_progress_and_bookmarks(/* AC-X-07 */) throws Exception {
        Tokens tokens = loginDefaultUser();
        makeSomeUserData(tokens);

        withdrawWithPassword(tokens, SEED_PASSWORD);

        assertThat(userUnitCompletionRepository.findByUserIdOrderByCourseIdAscUnitNoAsc(DEFAULT_USER_ID)).isEmpty();
        assertThat(userLastPositionRepository.findByUserId(DEFAULT_USER_ID)).isEmpty();
        assertThat(userBookmarkRepository.findByUserIdOrderByCreatedAtDescIdDesc(DEFAULT_USER_ID)).isEmpty();
    }

    // ── 계정이 죽는다 ───────────────────────────────────────────────────────

    @Test
    void withdrawn_account_cannot_login(/* AC-A-37 */) throws Exception {
        Tokens tokens = loginDefaultUser();
        withdrawWithPassword(tokens, SEED_PASSWORD);

        mockMvc.perform(post("/api/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .accept(MediaType.APPLICATION_JSON)
                        .content("""
                                { "username": "%s", "password": "%s" }
                                """.formatted(DEFAULT_USERNAME, SEED_PASSWORD)))
                .andExpect(status().isUnauthorized());
    }

    @Test
    void tokens_of_a_withdrawn_account_stop_working_immediately() throws Exception {
        Tokens tokens = loginDefaultUser();
        withdrawWithPassword(tokens, SEED_PASSWORD);

        mockMvc.perform(get("/api/users/me")
                        .header(HttpHeaders.AUTHORIZATION, bearer(tokens.accessToken())))
                .andExpect(status().isUnauthorized());
    }

    @Test
    void the_same_local_username_cannot_be_taken_again(/* AC-A-40 — 판정 §5-1 */) throws Exception {
        Tokens tokens = loginDefaultUser();
        withdrawWithPassword(tokens, SEED_PASSWORD);

        mockMvc.perform(post("/api/users")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                { "username": "%s", "password": "1234",
                                  "email": "rejoin@example.com", "nickname": "다시가입" }
                                """.formatted(DEFAULT_USERNAME)))
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.errorCode").value("DUPLICATE_RESOURCE"));
    }

    /**
     * 판정 §5-1 — 이메일 재사용은 <b>막지 않는다</b>.
     * 탈퇴 시 이메일을 지우기 때문이며(지워야 할 개인정보다), 재사용을 막으려면 그 값을 계속 들고 있어야 해서
     * "지웠다"는 약속과 어긋난다. 비밀번호 찾기를 만들지 않기로 한 이상(D-3) 이 제약은 목적도 사라졌다.
     */
    @Test
    void the_email_of_a_withdrawn_account_can_be_used_again() throws Exception {
        Tokens tokens = loginDefaultUser();
        withdrawWithPassword(tokens, SEED_PASSWORD);

        mockMvc.perform(post("/api/users")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                { "username": "rejoined_user", "password": "1234",
                                  "email": "gks9306202@gmail.com", "nickname": "다시가입" }
                                """))
                .andExpect(status().isCreated());
    }

    // ── 남는 것 ─────────────────────────────────────────────────────────────

    @Test
    void my_posts_stay_and_the_author_becomes_anonymous(/* AC-A-38 */) throws Exception {
        Tokens tokens = loginDefaultUser();
        long communityId = createPost(tokens);

        withdrawWithPassword(tokens, SEED_PASSWORD);

        mockMvc.perform(get("/api/communities/{communityId}", communityId))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.title").value("탈퇴 검증용 글"))
                .andExpect(jsonPath("$.data.nickname").value(WITHDRAWN_NICKNAME));
    }

    @Test
    void my_comments_stay_and_the_author_becomes_anonymous(/* AC-A-39 */) throws Exception {
        Tokens tokens = loginDefaultUser();
        // 시드: 사용자 3은 1번 글에 댓글이 있다 (`data-comment.sql`)
        withdrawWithPassword(tokens, SEED_PASSWORD);

        mockMvc.perform(get("/api/communities/{communityId}/comments", 1L)
                        .param("page", "0")
                        .param("size", "20"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.content[*].nickname", hasItem(WITHDRAWN_NICKNAME)));
    }

    // ── 헬퍼 ────────────────────────────────────────────────────────────────

    private long createPost(Tokens tokens) throws Exception {
        MvcResult result = mockMvc.perform(post("/api/communities")
                        .header(HttpHeaders.AUTHORIZATION, bearer(tokens.accessToken()))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                { "title": "탈퇴 검증용 글", "content": "탈퇴해도 남아야 한다" }
                                """))
                .andExpect(status().isCreated())
                .andReturn();

        JsonNode root = objectMapper.readTree(result.getResponse().getContentAsString());
        return root.path("data").asLong();
    }
}
