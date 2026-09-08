package com.test.test.integration;

import static org.assertj.core.api.Assertions.assertThat;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.web.client.TestRestTemplate;
import org.springframework.core.io.ByteArrayResource;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.context.TestPropertySource;
import org.springframework.util.LinkedMultiValueMap;
import org.springframework.util.MultiValueMap;

/**
 * 업로드 상한 초과는 <b>413</b>이다 (TDD Red — senior-dev 작성 / 판정 2026-08-25 E-1 — 감사 M1)
 *
 * <p><b>문제</b>: 단일 파일 상한(10MB)을 넘기면 {@code MaxUploadSizeExceededException}이 나는데
 * 핸들러가 없어 최후의 {@code Exception} 핸들러가 받아 <b>500</b>을 준다(로컬 8083에서 재현).
 * 프론트는 500을 "잠시 후 다시 시도"로 그리는데, <b>파일이 큰 것은 재시도로 회복되지 않는다</b> —
 * 이 저장소가 404·405·415에서 반복해 없애 온 패턴이 여기 한 곳에 남았다.
 * 코드 컨벤션 §2가 <b>413을 이름까지 짚어</b> 금지한다.
 *
 * <p><b>계약</b>: 413 + {@code errorCode: PAYLOAD_TOO_LARGE}(04 §1-2에 추가).
 *
 * <p><b>왜 MockMvc가 아닌가</b>: MockMvc는 {@code MockMultipartFile}을 직접 넣기 때문에
 * <b>멀티파트 상한 자체가 적용되지 않는다</b> — 이 계약은 실제 서블릿 컨테이너에서만 관측된다.
 * 그래서 이 클래스만 {@code RANDOM_PORT}로 띄운다(컨벤션 §6의 "컨트롤러 통합테스트" 정신은 그대로다:
 * 요청을 보내고 상태코드·응답 바디를 본다).
 * 초과분은 <b>64KB</b>만 준다 — Tomcat의 {@code max-swallow-size}(기본 2MB) 안이라야 서버가 남은 본문을 읽어 내고
 * 커넥션을 끊는 대신 <b>에러 응답을 돌려준다.</b>
 *
 * <p>이 테스트를 수정하지 말 것 — 계약 변경은 senior-dev 경유 (CLAUDE.md TDD 규칙 2).
 */
@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT)
@ActiveProfiles("test")
@TestPropertySource(properties = {
        "file.upload-dir=./build/test-uploads",
        // 상한값 자체는 설정이지 계약이 아니다 — 작게 낮춰 "초과하면 413"만 본다(루프백으로 10MB를 밀지 않는다)
        "spring.servlet.multipart.max-file-size=64KB",
        "spring.servlet.multipart.max-request-size=1MB",
        "app.cookie.secure=false"
})
class UploadSizeLimitContractIntegrationTest {

    /** 이 테스트에서 낮춘 상한(64KB)의 두 배 — "초과"라는 사실만 만들면 된다 */
    private static final int OVER_THE_LIMIT = 128 * 1024;

    @Autowired
    private TestRestTemplate restTemplate;

    @Autowired
    private ObjectMapper objectMapper;

    @Test
    void an_upload_over_the_limit_is_413_not_500() throws Exception {
        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.MULTIPART_FORM_DATA);
        headers.setBearerAuth(accessToken());

        MultiValueMap<String, Object> body = new LinkedMultiValueMap<>();
        body.add("files", new ByteArrayResource(new byte[OVER_THE_LIMIT]) {
            @Override
            public String getFilename() {
                return "too-big.png";
            }
        });
        body.add("refId", "0");
        body.add("refType", "COMMUNITY");
        body.add("usage", "IMAGES");

        ResponseEntity<String> response =
                restTemplate.postForEntity("/api/files", new HttpEntity<>(body, headers), String.class);

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.PAYLOAD_TOO_LARGE);
        assertThat(response.getBody()).contains("PAYLOAD_TOO_LARGE");
    }

    private String accessToken() throws Exception {
        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_JSON);
        headers.setAccept(java.util.List.of(MediaType.APPLICATION_JSON));

        ResponseEntity<String> response = restTemplate.postForEntity("/api/login",
                new HttpEntity<>("""
                        { "username": "gks930620", "password": "1234" }
                        """, headers), String.class);

        JsonNode root = objectMapper.readTree(response.getBody());
        return root.path("access_token").asText();
    }
}
