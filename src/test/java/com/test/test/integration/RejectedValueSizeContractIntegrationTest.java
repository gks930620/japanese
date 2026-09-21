package com.test.test.integration;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.fasterxml.jackson.databind.JsonNode;
import java.util.stream.Collectors;
import java.util.stream.IntStream;
import org.junit.jupiter.api.Test;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MvcResult;

/**
 * 검증 실패 응답이 요청을 되비추지 않는다 (TDD Red — senior-dev 작성, 2026-09-21 qa 결함 F)
 *
 * <p><b>문제</b>: {@code POST /api/me/merge}에 상한을 넘는 배열(501건)을 보내면
 * {@code errors[0].rejectedValue}에 <b>501개가 전부</b> 실려 응답이 수십 KB가 된다.
 * 긴 본문·긴 제목도 같다 — 에러 응답이 요청 크기에 비례하는 <b>증폭기</b>가 된다(50MB 요청 = 50MB 응답).
 * 그 값은 로그·개발자도구·에러 수집기에 한 번 더 남는다.</p>
 *
 * <p><b>계약 (설계/04 §1-2에 추가)</b>: {@code errors[].rejectedValue}는 <b>요청을 고치는 데 도움이 되는
 * 짧은 스칼라 값</b>일 때만 싣는다. 마스킹 방식은 기존과 같다 — <b>키 생략</b>(판정 D-13).
 * <ul>
 *   <li>싣는다: 100자 이하 문자열 · 숫자 · 불리언 · null</li>
 *   <li>생략한다: 필드명에 {@code password}가 든 값(D-13) · <b>100자 초과 문자열</b> ·
 *       <b>배열/컬렉션/맵/객체</b></li>
 * </ul>
 * 사용자는 {@code message}("최대 500개까지 보낼 수 있습니다")로 충분히 고칠 수 있다 —
 * 무엇을 보냈는지는 클라이언트가 이미 안다.</p>
 *
 * <p>이 테스트를 수정하지 말 것 — 계약 변경은 senior-dev 경유 (CLAUDE.md TDD 규칙 2).
 */
class RejectedValueSizeContractIntegrationTest extends ApiIntegrationTestSupport {

    /** 응답이 요청 크기를 따라가지 않는다 — 에러 응답 하나의 상한(여유 있게 잡은 값) */
    private static final int MAX_ERROR_BODY_CHARS = 2000;

    @Test
    void a_rejected_object_array_is_not_echoed_back() throws Exception {
        Tokens tokens = loginDefaultUser();

        String units = IntStream.rangeClosed(1, 501)
                .mapToObj(i -> "{\"courseId\":2,\"unitNo\":" + i + "}")
                .collect(Collectors.joining(","));

        MvcResult result = mockMvc.perform(post("/api/me/merge")
                        .header(HttpHeaders.AUTHORIZATION, bearer(tokens.accessToken()))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"progress\":{\"completedUnits\":[" + units + "]}}"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.errorCode").value("VALIDATION_ERROR"))
                .andReturn();

        String body = result.getResponse().getContentAsString();
        assertThat(body).as("거부된 배열을 통째로 되돌려주지 않는다").doesNotContain("courseId");
        assertThat(body.length())
                .as("에러 응답 크기가 요청 크기를 따라가지 않는다")
                .isLessThan(MAX_ERROR_BODY_CHARS);
        assertNoRejectedValue(body, "completedUnits");
    }

    @Test
    void a_rejected_number_array_is_not_echoed_back() throws Exception {
        Tokens tokens = loginDefaultUser();

        String ids = IntStream.rangeClosed(900001, 900201)
                .mapToObj(String::valueOf)
                .collect(Collectors.joining(","));

        MvcResult result = mockMvc.perform(post("/api/me/merge")
                        .header(HttpHeaders.AUTHORIZATION, bearer(tokens.accessToken()))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"bookmarks\":{\"kanji\":[" + ids + "]}}"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.errorCode").value("VALIDATION_ERROR"))
                .andReturn();

        String body = result.getResponse().getContentAsString();
        assertThat(body).doesNotContain("900201");
        assertThat(body.length()).isLessThan(MAX_ERROR_BODY_CHARS);
        assertNoRejectedValue(body, "kanji");
    }

    @Test
    void a_rejected_long_string_is_not_echoed_back() throws Exception {
        Tokens tokens = loginDefaultUser();
        String hugeTitle = "가".repeat(5000);   // 제목 상한은 200자다

        MvcResult result = mockMvc.perform(post("/api/communities")
                        .header(HttpHeaders.AUTHORIZATION, bearer(tokens.accessToken()))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"title\":\"" + hugeTitle + "\",\"content\":\"본문\"}"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.errorCode").value("VALIDATION_ERROR"))
                .andReturn();

        String body = result.getResponse().getContentAsString();
        assertThat(body).as("긴 문자열도 되돌려주지 않는다").doesNotContain("가".repeat(101));
        assertThat(body.length()).isLessThan(MAX_ERROR_BODY_CHARS);
        assertNoRejectedValue(body, "title");
    }

    @Test
    void a_short_scalar_is_still_echoed(/* 가드 — 값을 전부 가리는 게 아니다 */) throws Exception {
        MvcResult result = mockMvc.perform(post("/api/users")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                { "username": "ab", "password": "1234",
                                  "nickname": "짧은아이디", "email": "short-id@example.com" }
                                """))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.errorCode").value("VALIDATION_ERROR"))
                .andReturn();

        JsonNode errors = objectMapper.readTree(result.getResponse().getContentAsString()).path("errors");
        boolean echoed = false;
        for (JsonNode error : errors) {
            if (error.path("field").asText().equals("username")) {
                echoed = error.path("rejectedValue").asText().equals("ab");
            }
        }
        assertThat(echoed).as("짧은 스칼라는 그대로 돌려준다 — 사용자가 무엇을 잘못 넣었는지 알아야 한다").isTrue();
    }

    /** 해당 필드의 검증 오류가 있고, 그 오류에 rejectedValue 키가 <b>없다</b> */
    private void assertNoRejectedValue(String body, String fieldFragment) throws Exception {
        JsonNode errors = objectMapper.readTree(body).path("errors");
        assertThat(errors.isArray()).isTrue();

        boolean sawField = false;
        for (JsonNode error : errors) {
            if (error.path("field").asText().contains(fieldFragment)) {
                sawField = true;
                assertThat(error.has("rejectedValue"))
                        .as("'%s' 의 rejectedValue는 생략한다(마스킹 = 키 생략)", error.path("field").asText())
                        .isFalse();
            }
        }
        assertThat(sawField).as("'%s' 검증 오류가 있어야 이 테스트가 의미 있다", fieldFragment).isTrue();
    }
}
