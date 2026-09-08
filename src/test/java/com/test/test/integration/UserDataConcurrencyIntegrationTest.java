package com.test.test.integration;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.util.ArrayList;
import java.util.List;
import java.util.concurrent.Callable;
import java.util.concurrent.CyclicBarrier;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.Future;
import java.util.concurrent.TimeUnit;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.context.TestPropertySource;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.request.MockHttpServletRequestBuilder;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * 동시 요청에서도 멱등인가 (설계/04 §6-3 · §6-4) — qa 결함 1번의 회귀 방지. backend-dev 작성.
 *
 * <p>별·완료 토글의 가장 자연스러운 조작이 <b>더블클릭</b>이다. "조회 후 없으면 삽입"은 경합에서 깨져
 * 한쪽이 UNIQUE 제약에 걸리고, 화면은 실패로 받아 ★를 되돌린다 — <b>서버엔 담겼는데 화면엔 안 담긴</b>
 * 불일치가 생긴다. 계약은 전건 200이므로 경합에서도 멱등이 성립해야 한다.</p>
 *
 * <p>이 클래스만 <b>트랜잭션 밖</b>에서 돈다(다른 통합테스트는 롤백된다) — 경합은 커밋되는
 * 별개 트랜잭션 사이에서만 일어나기 때문이다. 대신 남는 행은 {@link #cleanup()}이 API로 지운다.</p>
 */
@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
@TestPropertySource(properties = {
        "file.upload-dir=./build/test-uploads",
        "app.cookie.secure=false"
})
class UserDataConcurrencyIntegrationTest {

    private static final long N5_COURSE_ID = 2L;
    private static final int UNIT_NO = 1;
    private static final int CONCURRENT_REQUESTS = 8;

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    private String accessToken;

    @AfterEach
    void cleanup() throws Exception {
        if (accessToken == null) {
            return;
        }
        mockMvc.perform(delete("/api/progress").header(HttpHeaders.AUTHORIZATION, bearer()));
        for (String type : List.of("kanji", "grammar", "vocabulary")) {
            mockMvc.perform(delete("/api/bookmarks/" + type).header(HttpHeaders.AUTHORIZATION, bearer()));
        }
    }

    @Test
    void completing_the_same_unit_concurrently_is_all_200_and_one_row() throws Exception {
        login();

        List<Integer> statuses = fireConcurrently(() -> mockMvc.perform(put(
                        "/api/progress/units/" + N5_COURSE_ID + "/" + UNIT_NO + "/completion")
                        .header(HttpHeaders.AUTHORIZATION, bearer())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{ \"completed\": true }"))
                .andReturn().getResponse().getStatus());

        assertThat(statuses).as("완료 토글 연타는 전건 200이어야 한다 (설계/04 §6-3 멱등)").containsOnly(200);

        JsonNode progress = readData(get("/api/progress").header(HttpHeaders.AUTHORIZATION, bearer()));
        assertThat(progress.path("completedUnits")).hasSize(1);
        assertThat(progress.path("completedUnits").get(0).path("courseId").asLong()).isEqualTo(N5_COURSE_ID);
        assertThat(progress.path("completedUnits").get(0).path("unitNo").asInt()).isEqualTo(UNIT_NO);
    }

    @Test
    void saving_the_last_position_concurrently_is_all_200_and_one_row() throws Exception {
        login();

        // 스텝 이동은 자동 저장이라 빠른 연속 조작이 겹치기 쉽다. 마지막 위치는 사용자당 1행(UNIQUE(user_id))이므로
        // 첫 저장이 겹치면 한쪽이 제약에 걸린다 — 설계/04 §6-3의 upsert는 그때도 성립해야 한다.
        List<Integer> statuses = fireConcurrently(() -> mockMvc.perform(put("/api/progress/last-position")
                        .header(HttpHeaders.AUTHORIZATION, bearer())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{ \"courseId\": " + N5_COURSE_ID + ", \"unitNo\": " + UNIT_NO
                                + ", \"stepKey\": \"kanji\" }"))
                .andReturn().getResponse().getStatus());

        assertThat(statuses).as("마지막 위치 저장 연타는 전건 200이어야 한다 (설계/04 §6-3 upsert)").containsOnly(200);

        JsonNode progress = readData(get("/api/progress").header(HttpHeaders.AUTHORIZATION, bearer()));
        assertThat(progress.path("lastPosition").path("courseId").asLong()).isEqualTo(N5_COURSE_ID);
        assertThat(progress.path("lastPosition").path("unitNo").asInt()).isEqualTo(UNIT_NO);
        assertThat(progress.path("lastPosition").path("stepKey").asText()).isEqualTo("kanji");
    }

    @Test
    void bookmarking_the_same_kanji_concurrently_is_all_200_and_one_row() throws Exception {
        login();
        long kanjiId = firstKanjiId();

        List<Integer> statuses = fireConcurrently(() -> mockMvc.perform(put("/api/bookmarks/kanji/" + kanjiId)
                        .header(HttpHeaders.AUTHORIZATION, bearer())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{ \"bookmarked\": true }"))
                .andReturn().getResponse().getStatus());

        assertThat(statuses).as("담기 연타는 전건 200이어야 한다 (설계/04 §6-4 멱등)").containsOnly(200);

        JsonNode summary = readData(get("/api/bookmarks/summary").header(HttpHeaders.AUTHORIZATION, bearer()));
        assertThat(summary.path("kanji").asInt()).isEqualTo(1);
        assertThat(summary.path("total").asInt()).isEqualTo(1);
    }

    // ── 헬퍼 ────────────────────────────────────────────────────────────────

    /** 같은 순간에 출발시킨다 — 배리어가 없으면 요청이 줄지어 실행돼 경합이 재현되지 않는다. */
    private List<Integer> fireConcurrently(Callable<Integer> request) throws Exception {
        ExecutorService pool = Executors.newFixedThreadPool(CONCURRENT_REQUESTS);
        CyclicBarrier startTogether = new CyclicBarrier(CONCURRENT_REQUESTS);
        try {
            List<Future<Integer>> futures = new ArrayList<>();
            for (int i = 0; i < CONCURRENT_REQUESTS; i++) {
                futures.add(pool.submit(() -> {
                    startTogether.await(10, TimeUnit.SECONDS);
                    return request.call();
                }));
            }
            List<Integer> statuses = new ArrayList<>();
            for (Future<Integer> future : futures) {
                statuses.add(future.get(30, TimeUnit.SECONDS));
            }
            return statuses;
        } finally {
            pool.shutdownNow();
        }
    }

    private void login() throws Exception {
        String body = mockMvc.perform(post("/api/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .accept(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "username": "gks930620",
                                  "password": "1234"
                                }
                                """))
                .andExpect(status().isOk())
                .andReturn().getResponse().getContentAsString();
        accessToken = objectMapper.readTree(body).path("access_token").asText();
    }

    private String bearer() {
        return "Bearer " + accessToken;
    }

    private long firstKanjiId() throws Exception {
        JsonNode unit = readData(get("/api/courses/" + N5_COURSE_ID + "/units/" + UNIT_NO));
        return unit.path("kanjis").get(0).path("id").asLong();
    }

    private JsonNode readData(MockHttpServletRequestBuilder request) throws Exception {
        String body = mockMvc.perform(request)
                .andExpect(status().isOk())
                .andReturn().getResponse().getContentAsString();
        return objectMapper.readTree(body).path("data");
    }
}
