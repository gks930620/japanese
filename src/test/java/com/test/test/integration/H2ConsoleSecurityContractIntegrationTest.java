package com.test.test.integration;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.header;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.context.TestPropertySource;
import org.springframework.test.web.servlet.MockMvc;

/**
 * H2 콘솔이 <b>꺼진 환경(= 운영 파리티)</b>의 보안 계약 (TDD Red — senior-dev 작성 / 감사 2026-08-25 H1)
 *
 * <p><b>문제</b>: {@code SecurityConfig}가 {@code /h2-console/**}를 <b>무조건</b> permitAll하고
 * frameOptions를 sameOrigin으로 완화한다. 콘솔이 꺼진 환경에서도 그 규칙이 남아 있어,
 * {@code spring.h2.console.enabled}가 실수로 켜지는 순간 <b>인증 없이</b> DB 콘솔이 열린다.
 * H2 콘솔은 접속자가 임의 JDBC URL을 넣을 수 있어 단순 정보 노출로 끝나지 않는다.
 *
 * <p><b>계약</b>: 콘솔이 꺼져 있으면 그 완화 규칙도 <b>존재하지 않는다.</b>
 * 화이트리스트 밖 경로의 기본값대로 <b>401</b>이고(설계/07 §5-1 "기본이 차단이다"),
 * 프레이밍 허용도 되돌아간다. 404가 아니라 401인 이유: 404는 "permitAll을 통과해 핸들러가 없었다"는 뜻이라
 * <b>보안 규칙이 아직 살아 있음</b>을 드러낸다. 이 두 상태를 구분하는 것이 이 테스트의 목적이다.
 *
 * <p>테스트 프로파일은 {@code spring.h2.console.enabled}를 선언하지 않지만, 계약을 눈에 보이게 하려고
 * 명시적으로 {@code false}를 준다(운영과 같은 상태).
 *
 * <p>짝: {@code H2ConsoleEnabledLocalContractIntegrationTest}(로컬 개발이 깨지지 않는지).
 * 이 테스트를 수정하지 말 것 — 계약 변경은 senior-dev 경유 (CLAUDE.md TDD 규칙 2).
 */
@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
@TestPropertySource(properties = "spring.h2.console.enabled=false")
class H2ConsoleSecurityContractIntegrationTest {

    @Autowired
    private MockMvc mockMvc;

    @Test
    void h2_console_is_not_whitelisted_when_the_console_is_off() throws Exception {
        mockMvc.perform(get("/h2-console"))
                .andExpect(status().isUnauthorized());
    }

    @Test
    void h2_console_subpaths_are_not_whitelisted_when_the_console_is_off() throws Exception {
        mockMvc.perform(get("/h2-console/login.jsp"))
                .andExpect(status().isUnauthorized());
    }

    @Test
    void framing_is_denied_when_the_console_is_off() throws Exception {
        mockMvc.perform(get("/api/courses"))
                .andExpect(status().isOk())
                .andExpect(header().string("X-Frame-Options", "DENY"));
    }
}
