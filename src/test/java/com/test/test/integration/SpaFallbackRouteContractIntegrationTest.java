package com.test.test.integration;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.forwardedUrl;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import org.junit.jupiter.api.Test;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MvcResult;

/**
 * SPA 폴백 경계 계약 (TDD Red — senior-dev 작성, 2026-09-21 qa 결함 A)
 *
 * <p><b>문제</b>: {@code HomeController}가 화면 경로를 <b>열거</b>한다. 열거 밖 주소
 * ({@code /nonexistent-page} · {@code /bookmarks/zzz} · {@code /signup/x})는 시큐리티 화이트리스트에도 없어
 * <b>401 JSON 원문</b>이 화면에 그대로 보인다. 사용자는 "로그인하면 되나?"로 읽지만 실제로는 없는 주소다
 * (설계/04 §1-4 · 현재_기능현황 §9 "미매핑 화면 경로는 SPA가 받아 404 화면"). Vite dev(5103)는 200이라
 * <b>개발 중엔 보이지 않고 배포에서만 드러난다.</b></p>
 *
 * <p><b>계약 — 무엇이 SPA로 가고 무엇이 가지 않는가</b> (설계/04 §1-7):
 * <ol>
 *   <li><b>간다</b>: 예약 네임스페이스 밖의 <b>GET</b>이면서, 마지막 경로 세그먼트에 점(확장자)이 없는 요청
 *       → 200 + {@code forward:/index.html}. 라우팅의 단일 기준은 React 라우터이고, 없는 화면은
 *       {@code NotFoundPage}가 그린다.</li>
 *   <li><b>안 간다 — 예약 네임스페이스</b>: {@code /api} · {@code /uploads} · {@code /images} ·
 *       {@code /h2-console} · {@code /actuator} · {@code /swagger-ui} · {@code /v3/api-docs} ·
 *       {@code /error} · {@code /custom-oauth2} · {@code /oauth2} · <b>{@code /login/oauth2}</b>.
 *       ({@code /login}은 화면이고 {@code /login/oauth2/**}만 서버 콜백이다 — 더 긴 경로가 이긴다.)</li>
 *   <li><b>안 간다 — 점이 있는 경로</b>({@code /nope.js} · {@code /assets/x.css}): 없으면 <b>404</b>다.
 *       없는 번들에 index.html(200)을 주면 브라우저가 HTML을 JS로 파싱해 "Unexpected token '&lt;'"로 죽는다 —
 *       배포 직후 캐시된 옛 번들 요청이 정확히 이 모양이라, 404가 와야 브라우저·CDN이 "없음"을 안다.</li>
 *   <li><b>안 간다 — GET이 아닌 것</b>: 주소창 진입은 GET이다. 화면 경로로 오는 POST는 클라이언트 오류이고
 *       화이트리스트 밖이므로 <b>401</b>이 유지된다(설계/04 §1-2 "화이트리스트에 없는 메서드는 401").</li>
 * </ol>
 *
 * <p><b>보안 경계가 이 테스트의 핵심이다</b>(설계/07 §5-2 "세 곳을 항상 함께 관리한다").
 * 폴백을 넓히면서 보호 네임스페이스({@code /api/me/**} · {@code /api/progress/**} · {@code /actuator/**} ·
 * {@code /h2-console/**})가 함께 열리면, 결함 하나를 고치고 구멍 하나를 여는 것이다.
 * 아래 "가드" 테스트들은 지금 통과한다 — <b>고친 뒤에도 통과해야</b> 한다.</p>
 *
 * <p>이 테스트를 수정하지 말 것 — 계약 변경은 senior-dev 경유 (CLAUDE.md TDD 규칙 2).
 */
class SpaFallbackRouteContractIntegrationTest extends ApiIntegrationTestSupport {

    private static final String SPA_ENTRY = "/index.html";

    // ── ① SPA로 간다: 열거 밖 화면 경로 ──────────────────────────────────────

    @Test
    void unknown_screen_paths_are_handed_to_the_spa() throws Exception {
        for (String path : new String[]{
                "/nonexistent-page",          // qa 재현 ①
                "/bookmarks/zzz",             // qa 재현 ② — /bookmarks는 단일 경로라 하위가 없다
                "/signup/x",                  // qa 재현 ③
                "/diagnosis/zzz",             // 같은 모양의 나머지 단일 경로
                "/login/zzz",                 // /login은 화면이다 — 예약은 /login/oauth2/** 뿐
                "/nonexistent-page/deeper/still"
        }) {
            mockMvc.perform(get(path))
                    .andExpect(status().isOk())
                    .andExpect(forwardedUrl(SPA_ENTRY));
        }
    }

    @Test
    void known_screen_paths_are_unchanged(/* 가드 — 폴백이 기존 화면 라우팅을 대체하지 않는다 */) throws Exception {
        for (String path : new String[]{
                "/", "/login", "/signup", "/bookmarks", "/diagnosis",
                "/community", "/community/detail",
                "/courses", "/courses/2", "/library/kanji",
                "/en/courses", "/mypage/edit"
        }) {
            mockMvc.perform(get(path))
                    .andExpect(status().isOk())
                    .andExpect(forwardedUrl(SPA_ENTRY));
        }
    }

    // ── ② API 네임스페이스는 절대 SPA가 아니다 ───────────────────────────────

    @Test
    void the_api_namespace_never_becomes_the_spa() throws Exception {
        // 없는 API에 index.html(200)이 오면 클라이언트가 HTML을 JSON으로 파싱하다 엉뚱하게 실패한다.
        // 공개 네임스페이스 아래의 미매핑은 404 JSON이다(설계/04 §1-4).
        for (String path : new String[]{"/api/courses/2/zzz", "/api/library/foo", "/api/en/nope"}) {
            MvcResult result = mockMvc.perform(get(path))
                    .andExpect(status().isNotFound())
                    .andExpect(jsonPath("$.success").value(false))
                    .andExpect(jsonPath("$.errorCode").value("NOT_FOUND"))
                    .andReturn();
            assertThat(result.getResponse().getForwardedUrl())
                    .as("%s 는 SPA로 넘어가지 않는다", path)
                    .isNotEqualTo(SPA_ENTRY);
        }

        // 화이트리스트 밖의 API 경로는 시큐리티가 먼저 답한다 — 401 JSON이다(설계/07 §5-1 "기본이 차단이다").
        // 상태코드가 401이든 404든 <b>JSON이라는 것</b>이 계약이다. 접두사만 맞춘 폴백(/api/ 로 시작하는 것만
        // 예약)이면 마지막 줄의 "/api"가 200 index.html이 된다 — 그것도 API 네임스페이스다.
        for (String path : new String[]{"/api/nonexistent", "/api/zzz/zzz", "/api"}) {
            MvcResult result = mockMvc.perform(get(path))
                    .andExpect(status().isUnauthorized())
                    .andExpect(jsonPath("$.errorCode").value("NOT_AUTHENTICATED"))
                    .andReturn();
            assertThat(result.getResponse().getForwardedUrl())
                    .as("%s 는 SPA로 넘어가지 않는다", path)
                    .isNotEqualTo(SPA_ENTRY);
        }
    }

    @Test
    void protected_api_paths_are_not_opened_by_the_fallback(/* 가드 — 설계/07 §5-2 */) throws Exception {
        for (String path : new String[]{
                "/api/me/account", "/api/me/zzz",
                "/api/progress", "/api/progress/zzz",
                "/api/bookmarks", "/api/bookmarks/kanji"
        }) {
            mockMvc.perform(get(path))
                    .andExpect(status().isUnauthorized())
                    .andExpect(jsonPath("$.errorCode").value("NOT_AUTHENTICATED"));
        }
    }

    // ── ③ 점이 있는 경로(정적 자원)는 404다 ──────────────────────────────────

    @Test
    void asset_like_requests_are_404_not_the_spa() throws Exception {
        for (String path : new String[]{
                "/assets/does-not-exist.js",   // 배포 직후 캐시에 남은 옛 번들 요청
                "/assets/does-not-exist.css",
                "/nope.js",                    // 루트의 점 있는 경로 — 지금은 화이트리스트 밖이라 401이다
                "/styles/missing.css"
        }) {
            MvcResult result = mockMvc.perform(get(path))
                    .andExpect(status().isNotFound())
                    .andExpect(jsonPath("$.errorCode").value("NOT_FOUND"))
                    .andReturn();
            assertThat(result.getResponse().getForwardedUrl())
                    .as("%s 에 index.html을 주면 브라우저가 HTML을 JS/CSS로 파싱한다", path)
                    .isNotEqualTo(SPA_ENTRY);
        }
    }

    @Test
    void real_static_files_are_still_served(/* 가드 — 폴백이 정적 핸들러를 가리지 않는다 */) throws Exception {
        MvcResult favicon = mockMvc.perform(get("/favicon.svg"))
                .andExpect(status().isOk())
                .andReturn();
        assertThat(favicon.getResponse().getForwardedUrl()).isNull();
        assertThat(favicon.getResponse().getContentAsByteArray()).isNotEmpty();

        mockMvc.perform(get("/index.html")).andExpect(status().isOk());
    }

    // ── ④ 서버 네임스페이스는 제 답을 그대로 낸다 ────────────────────────────

    @Test
    void server_namespaces_are_not_handed_to_the_spa(/* 가드 */) throws Exception {
        // H2 콘솔: 테스트 프로파일은 콘솔이 꺼져 있다 → 화이트리스트 밖이라 401이 유지된다
        // (H2ConsoleSecurityContractIntegrationTest와 같은 계약 — 폴백이 이걸 200으로 열면 안 된다)
        mockMvc.perform(get("/h2-console/login.jsp")).andExpect(status().isUnauthorized());
        mockMvc.perform(get("/h2-console")).andExpect(status().isUnauthorized());

        // actuator: health/info만 공개다. metrics가 폴백으로 열리면 안 된다
        mockMvc.perform(get("/actuator/metrics")).andExpect(status().isUnauthorized());

        // 파일 서빙: 없는 파일은 404다(200 index.html이면 <img>가 HTML을 그림으로 읽는다)
        mockMvc.perform(get("/uploads/does-not-exist.png")).andExpect(status().isNotFound());
        mockMvc.perform(get("/images/does-not-exist.png")).andExpect(status().isNotFound());

        // OAuth2 시작점은 제공자로 리다이렉트한다 — 폴백이 삼키면 소셜 로그인이 화면만 다시 그린다
        MvcResult oauth = mockMvc.perform(get("/custom-oauth2/login/web/kakao"))
                .andExpect(status().is3xxRedirection())
                .andReturn();
        assertThat(oauth.getResponse().getForwardedUrl()).isNotEqualTo(SPA_ENTRY);
    }

    // ── ⑤ GET만 SPA로 간다 ──────────────────────────────────────────────────

    @Test
    void only_get_reaches_the_spa(/* 가드 */) throws Exception {
        MvcResult result = mockMvc.perform(post("/nonexistent-page")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{}"))
                .andExpect(status().isUnauthorized())
                .andReturn();
        assertThat(result.getResponse().getForwardedUrl()).isNotEqualTo(SPA_ENTRY);

        mockMvc.perform(post("/bookmarks/zzz")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{}"))
                .andExpect(status().isUnauthorized());
    }
}
