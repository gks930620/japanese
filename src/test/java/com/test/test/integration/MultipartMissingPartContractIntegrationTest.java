package com.test.test.integration;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.multipart;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import org.junit.jupiter.api.Test;
import org.springframework.http.HttpHeaders;
import org.springframework.test.web.servlet.MvcResult;

/**
 * multipart 파트 누락 계약 (TDD Red — senior-dev 작성, 2026-09-21 qa 결함 D)
 *
 * <p><b>문제</b>: {@code POST /api/files}에 {@code files} 파트 없이 보내면 <b>500</b>이다.
 * {@code MissingServletRequestPartException}에 핸들러가 없어 최후의 {@code Exception} 핸들러가 받는다.
 * 파트 누락은 <b>요청을 고쳐야 회복되는 클라이언트 잘못</b>이라 재시도로 낫지 않는데, 500이면
 * 모니터링에 서버 장애로 잡히고 프론트는 "잠시 후 다시 시도"를 띄운다(설계/04 §1-2 · 컨벤션 §2).
 * 415·413·405를 이미 같은 이유로 고쳤다 — 그때 빠진 나머지다.</p>
 *
 * <p><b>계약</b>: 필수 파트 누락은 쿼리 파라미터 누락과 <b>같은 답</b>이다 —
 * <b>400 {@code MISSING_PARAMETER}</b>, 메시지는 {@code "필수 파라미터가 누락되었습니다: files"}.
 * 클라이언트가 보는 문제는 "필수 입력이 안 왔다" 하나인데 전송 방식(쿼리/파트)에 따라 코드가 갈리면
 * 프론트가 같은 상황을 두 갈래로 처리하게 된다.</p>
 *
 * <p>응답에 내부 클래스명을 싣지 않는다(판정 2026-08-25 G-1).
 * 이 테스트를 수정하지 말 것 — 계약 변경은 senior-dev 경유 (CLAUDE.md TDD 규칙 2).
 */
class MultipartMissingPartContractIntegrationTest extends ApiIntegrationTestSupport {

    @Test
    void a_multipart_upload_without_the_files_part_is_400() throws Exception {
        Tokens tokens = loginDefaultUser();

        MvcResult result = mockMvc.perform(multipart("/api/files")
                        .param("refId", "0")
                        .param("refType", "COMMUNITY")
                        .param("usage", "IMAGES")
                        .header(HttpHeaders.AUTHORIZATION, bearer(tokens.accessToken())))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.success").value(false))
                .andExpect(jsonPath("$.errorCode").value("MISSING_PARAMETER"))
                .andExpect(jsonPath("$.message").value("필수 파라미터가 누락되었습니다: files"))
                .andReturn();

        assertThat(result.getResponse().getContentAsString())
                .as("에러 응답에 내부 클래스명이 없다(판정 G-1)")
                .doesNotContain("com.test.test");
    }

    @Test
    void a_missing_query_parameter_is_still_400(/* 가드 — 두 경로가 같은 답을 낸다 */) throws Exception {
        mockMvc.perform(get("/api/files").param("refId", "1"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.errorCode").value("MISSING_PARAMETER"))
                .andExpect(jsonPath("$.message").value("필수 파라미터가 누락되었습니다: refType"));
    }

    @Test
    void an_unauthenticated_upload_is_still_401(/* 가드 — 판정 순서는 시큐리티가 먼저다 */) throws Exception {
        mockMvc.perform(multipart("/api/files")
                        .param("refId", "0")
                        .param("refType", "COMMUNITY")
                        .param("usage", "IMAGES"))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.errorCode").value("NOT_AUTHENTICATED"));
    }
}
