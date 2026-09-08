package com.test.test.integration;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.Comparator;
import org.junit.jupiter.api.AfterEach;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.context.TestPropertySource;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;
import org.springframework.transaction.annotation.Transactional;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
@TestPropertySource(properties = {
        "file.upload-dir=./build/test-uploads",
        "app.cookie.secure=false"
})
@Transactional
public abstract class ApiIntegrationTestSupport {

    @Autowired
    protected MockMvc mockMvc;

    @Autowired
    protected ObjectMapper objectMapper;

    protected record Tokens(String accessToken, String refreshToken) {
    }

    /** 시드 사용자 id=3 (LOCAL, 닉네임 한창희) */
    protected static final String DEFAULT_USERNAME = "gks930620";

    /** 시드 사용자 id=4 (LOCAL, 닉네임 김민수) — 소유자가 아닌 "다른 사용자" 역할 */
    protected static final String OTHER_USERNAME = "user4";

    /** 시드 로컬 계정의 공통 비밀번호(평문) — `data-users.sql` 주석 참고 */
    protected static final String SEED_PASSWORD = "1234";

    protected Tokens loginDefaultUser() throws Exception {
        return login(DEFAULT_USERNAME, SEED_PASSWORD);
    }

    /** 소유자가 아닌 다른 사용자 — 인가(403) 음성 케이스에 쓴다(설계/07 §5-3 체크리스트) */
    protected Tokens loginOtherUser() throws Exception {
        return login(OTHER_USERNAME, SEED_PASSWORD);
    }

    protected Tokens login(String username, String password) throws Exception {
        MvcResult result = mockMvc.perform(post("/api/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .accept(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "username": "%s",
                                  "password": "%s"
                                }
                                """.formatted(username, password)))
                .andExpect(status().isOk())
                .andReturn();

        JsonNode root = objectMapper.readTree(result.getResponse().getContentAsString());
        return new Tokens(root.path("access_token").asText(), root.path("refresh_token").asText());
    }

    protected String bearer(String accessToken) {
        return "Bearer " + accessToken;
    }

    @AfterEach
    void cleanupUploadedFiles() throws Exception {
        Path testUploadRoot = Path.of("build", "test-uploads").toAbsolutePath().normalize();
        if (!Files.exists(testUploadRoot)) {
            return;
        }

        Files.walk(testUploadRoot)
                .sorted(Comparator.reverseOrder())
                .forEach(path -> {
                    if (!path.equals(testUploadRoot)) {
                        try {
                            Files.deleteIfExists(path);
                        } catch (Exception ignored) {
                        }
                    }
                });
    }
}
