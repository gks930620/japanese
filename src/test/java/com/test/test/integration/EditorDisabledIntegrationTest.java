package com.test.test.integration;

import com.fasterxml.jackson.databind.JsonNode;
import org.junit.jupiter.api.Test;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MvcResult;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * 관리자 편집 API — 편집 모드 <b>꺼진</b> 환경(기본값) (TDD Red — senior-dev 작성)
 *
 * <p>계약 문서: `설계/04_API계약.md` §9 (게이팅이 계약의 일부다) / 인수 조건: A1·A14·C4
 *
 * <p>꺼진 환경에서는 편집 컨트롤러 빈이 <b>등록되지 않는다</b>(@ConditionalOnProperty).
 * 그래서 응답은 "권한 없음"이 아니라 <b>미매핑 404</b>다 — 다른 없는 주소와 구별할 수 없어야
 * "화면·주소 어디에도 흔적이 없다"(C4)가 성립한다.
 *
 * <p>`app.editor.enabled`의 기본값이 false라는 것 자체가 계약이다 — 이 클래스는 아무 프로퍼티도 켜지 않는다.
 *
 * <p>이 테스트를 수정하지 말 것 — 계약 변경은 senior-dev 경유 (CLAUDE.md TDD 규칙 2).
 */
class EditorDisabledIntegrationTest extends ApiIntegrationTestSupport {

    @Test
    void editor_status_is_an_unknown_path_when_disabled(/* C4 — 프론트는 이 404로 꺼짐을 안다 */) throws Exception {
        mockMvc.perform(get("/api/editor/status"))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.errorCode").value("NOT_FOUND"));
    }

    @Test
    void editor_write_does_not_exist_and_nothing_is_saved(/* A14 */) throws Exception {
        MvcResult unit = mockMvc.perform(get("/api/courses/{courseId}/units/{unitNo}", 2L, 1))
                .andExpect(status().isOk())
                .andReturn();
        JsonNode kanji = objectMapper.readTree(unit.getResponse().getContentAsString())
                .path("data").path("kanjis").get(0);
        long kanjiId = kanji.path("id").asLong();
        String originalMeaning = kanji.path("meaningKo").asText();

        mockMvc.perform(put("/api/editor/kanji/{kanjiId}", kanjiId)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                { "meaningKo": "몰래 고치기", "onyomi": "コウ", "kunyomi": "", "words": [] }
                                """))
                .andExpect(status().isNotFound());

        // 아무것도 저장되지 않았다
        mockMvc.perform(get("/api/library/kanji/{kanjiId}", kanjiId))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.meaningKo").value(originalMeaning));
    }

    @Test
    void even_an_authenticated_user_gets_404(/* 켜고 끄는 기준은 로그인이 아니라 환경이다 — 판정 ④ */) throws Exception {
        Tokens tokens = loginDefaultUser();

        mockMvc.perform(get("/api/editor/status")
                        .header(HttpHeaders.AUTHORIZATION, bearer(tokens.accessToken())))
                .andExpect(status().isNotFound());
    }
}
