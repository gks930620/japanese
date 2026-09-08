package com.test.test.integration;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import org.junit.jupiter.api.Test;

/**
 * 공개 응답은 <b>로그인 아이디를 싣지 않는다</b> (TDD Red — senior-dev 작성 / 판정 2026-08-25 C-1)
 *
 * <p><b>문제</b>: 비로그인으로 부를 수 있는 `GET /api/communities`·`/api/communities/{id}`·`.../comments`가
 * {@code username}(= 로그인 아이디)을 그대로 내려준다. 라이브 확인:
 * {@code {"userId":6,"username":"user6","nickname":"박서준", ...}}.
 * <b>자격증명의 절반이 목록으로 공개</b>되는 셈이고, 비밀번호 4자가 허용되며(사용자 결정) 시도 제한도 없는 상태다.
 *
 * <p><b>계약</b>: 공개 응답에는 {@code nickname}(표시용)과 {@code userId}(동일인 판정용)만 싣는다.
 * 화면은 이미 닉네임을 우선 표시하고, "내 글인가"는 {@code userId} == `/api/users/me`의 {@code id}로 판정한다
 * (08 F-11이 "작성자 판정은 <b>id 기준</b>"이라고 이미 적어 두었다 — 문서가 맞고 코드가 어긋나 있었다).
 * 서버 인가는 그대로다: {@code isWrittenBy}는 <b>토큰 주체</b>로 판정하지 응답값을 쓰지 않는다.
 *
 * <p>이 테스트를 수정하지 말 것 — 계약 변경은 senior-dev 경유 (CLAUDE.md TDD 규칙 2).
 */
class PublicResponseNoLoginIdContractIntegrationTest extends ApiIntegrationTestSupport {

    private static final long SEEDED_POST_ID = 1L;

    @Test
    void the_public_post_list_does_not_expose_login_ids() throws Exception {
        mockMvc.perform(get("/api/communities").param("size", "1"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.content[0].username").doesNotExist())
                .andExpect(jsonPath("$.data.content[0].userId").exists())
                .andExpect(jsonPath("$.data.content[0].nickname").exists());
    }

    @Test
    void the_public_post_detail_does_not_expose_login_ids() throws Exception {
        mockMvc.perform(get("/api/communities/{id}", SEEDED_POST_ID))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.username").doesNotExist())
                .andExpect(jsonPath("$.data.userId").exists())
                .andExpect(jsonPath("$.data.nickname").exists());
    }

    @Test
    void the_public_comment_list_does_not_expose_login_ids() throws Exception {
        mockMvc.perform(get("/api/communities/{id}/comments", SEEDED_POST_ID).param("size", "1"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.content[0].username").doesNotExist())
                .andExpect(jsonPath("$.data.content[0].userId").exists())
                .andExpect(jsonPath("$.data.content[0].nickname").exists());
    }

    @Test
    void my_own_identity_is_still_available_where_it_should_be(/* 가드 — 아이디를 완전히 못 보게 하는 게 아니다 */)
            throws Exception {
        Tokens tokens = loginDefaultUser();

        mockMvc.perform(get("/api/users/me").header("Authorization", bearer(tokens.accessToken())))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.username").value(DEFAULT_USERNAME))
                .andExpect(jsonPath("$.data.id").exists());
    }
}
