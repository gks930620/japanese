package com.test.test.integration;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import org.junit.jupiter.api.Test;
import org.springframework.test.web.servlet.MvcResult;

/**
 * 파일 조회 파라미터의 오류 응답 (TDD Red — senior-dev 작성 / 판정 2026-08-25 G-1 — 감사 L1)
 *
 * <p><b>문제</b>: {@code FileService}가 {@code RefType.valueOf(...)}를 그대로 불러
 * 예외 메시지가 그대로 클라이언트로 나간다 — {@code "No enum constant com.test.test.file.entity.RefType.BOGUS"}.
 * 내부 패키지 구조가 노출되고, 자료실의 잘 다듬어진 400 메시지와 품질이 두 배로 갈린다.
 * 게다가 상태코드를 <b>한국어 메시지 문자열 매칭</b>으로 정하는 임시 경로({@code determineStatusFromMessage})를 탄다.
 *
 * <p><b>계약</b>: 허용 밖 enum 파라미터는 <b>400 {@code TYPE_MISMATCH}</b>다(04 §1-2의 "요청 형식 오류").
 * 응답 어디에도 <b>내부 클래스명이 없다.</b>
 * 구현은 컨트롤러에서 enum으로 바인딩하면 끝난다 — 같은 컨트롤러의 {@code POST /api/files}가 이미 그렇게 한다.
 *
 * <p>이 테스트를 수정하지 말 것 — 계약 변경은 senior-dev 경유 (CLAUDE.md TDD 규칙 2).
 */
class FileRequestParamContractIntegrationTest extends ApiIntegrationTestSupport {

    @Test
    void an_unknown_ref_type_is_a_type_mismatch_without_internals() throws Exception {
        MvcResult result = mockMvc.perform(get("/api/files")
                        .param("refId", "1")
                        .param("refType", "BOGUS"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.errorCode").value("TYPE_MISMATCH"))
                .andReturn();

        assertThat(result.getResponse().getContentAsString())
                .as("에러 응답에 내부 클래스명이 없다")
                .doesNotContain("com.test.test");
    }

    @Test
    void an_unknown_usage_is_a_type_mismatch_without_internals() throws Exception {
        MvcResult result = mockMvc.perform(get("/api/files/paths")
                        .param("refId", "1")
                        .param("refType", "COMMUNITY")
                        .param("usage", "NOPE"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.errorCode").value("TYPE_MISMATCH"))
                .andReturn();

        assertThat(result.getResponse().getContentAsString())
                .as("에러 응답에 내부 클래스명이 없다")
                .doesNotContain("com.test.test");
    }

    @Test
    void valid_parameters_still_work(/* 가드 */) throws Exception {
        mockMvc.perform(get("/api/files").param("refId", "1").param("refType", "COMMUNITY"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true));
    }
}
