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
 * H2 콘솔이 <b>켜진 환경(= 로컬 개발 파리티)</b>의 가드 (senior-dev 작성 / 감사 2026-08-25 H1)
 *
 * <p>H1의 수정이 <b>로컬 개발 편의를 깨지 않는지</b>를 고정한다 — 운영에서 닫는 것이 목적이지
 * 개발자에게서 {@code /h2-console}을 빼앗는 것이 목적이 아니다.
 *
 * <p>MockMvc는 DispatcherServlet만 타므로 H2 콘솔 서블릿({@code JakartaWebServlet}) 자체에는 닿지 않는다.
 * 그래서 여기서 보는 것은 <b>보안 필터가 통과시키는가</b> 하나다 —
 * 401이면 시큐리티가 막은 것이고, 404면 통과시킨 뒤 DispatcherServlet에 핸들러가 없었던 것이다.
 * 실제 서버에서는 그 자리에 콘솔 서블릿이 응답한다.
 *
 * <p>짝: {@code H2ConsoleSecurityContractIntegrationTest}(운영 파리티 — 401이어야 한다).
 * 이 테스트를 수정하지 말 것 — 계약 변경은 senior-dev 경유 (CLAUDE.md TDD 규칙 2).
 */
@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
@TestPropertySource(properties = "spring.h2.console.enabled=true")
class H2ConsoleEnabledLocalContractIntegrationTest {

    @Autowired
    private MockMvc mockMvc;

    @Test
    void h2_console_stays_reachable_for_local_development() throws Exception {
        mockMvc.perform(get("/h2-console"))
                .andExpect(status().isNotFound());
    }

    @Test
    void framing_stays_same_origin_so_the_console_renders() throws Exception {
        mockMvc.perform(get("/api/courses"))
                .andExpect(status().isOk())
                .andExpect(header().string("X-Frame-Options", "SAMEORIGIN"));
    }
}
