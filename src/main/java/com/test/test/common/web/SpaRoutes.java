package com.test.test.common.web;

import jakarta.servlet.http.HttpServletRequest;
import java.util.List;

/**
 * 무엇이 화면이고 무엇이 서버 자원인가 — SPA 폴백 경계의 <b>단일 출처</b> (설계/04 §1-7 · 08 C-25).
 *
 * <p>서버는 들어온 요청을 세 부류로 가른다.</p>
 * <ol>
 *   <li><b>예약 네임스페이스</b>({@link #RESERVED_NAMESPACES}) — 각자의 규칙 그대로(JSON 404/401/리다이렉트).
 *       <b>SPA로 보내지 않는다.</b> 없는 API에 index.html(200)이 오면 클라이언트가 HTML을 JSON으로 파싱하다
 *       엉뚱한 곳에서 실패한다.</li>
 *   <li><b>마지막 세그먼트에 점이 있는 경로</b> — 정적 자원 요청이다. 있으면 그 파일, <b>없으면 404</b>.
 *       배포 직후 캐시에 남은 옛 번들 요청({@code /assets/index-옛해시.js})에 200 HTML을 주면
 *       브라우저가 {@code Unexpected token '<'}로 죽는다. 404가 와야 브라우저·CDN이 "없음"을 안다.</li>
 *   <li><b>그 밖의 GET·HEAD</b> — 200 + {@code forward:/index.html}. 라우팅의 단일 기준은 React 라우터이고,
 *       없는 화면은 {@code NotFoundPage}가 그린다.</li>
 * </ol>
 *
 * <p><b>왜 이 판정이 한 곳에 있어야 하나</b>(설계/07 §5-2 "세 곳을 함께 관리한다"):
 * 시큐리티 화이트리스트({@code SecurityConfig})와 폴백({@code GlobalExceptionHandler})이 각자 판정하면
 * 곧 갈린다. 갈리는 순간 둘 중 하나다 — 화면에 401 JSON 원문이 보이거나(결함 A의 원래 모습),
 * 보호 네임스페이스가 폴백을 타고 함께 열린다. 그래서 두 곳 모두 이 클래스에만 묻는다.</p>
 *
 * <p>화면 경로를 <b>열거하지 않는다</b>: 프론트가 라우트를 추가할 때마다 백엔드를 고쳐야 하고,
 * 빠뜨린 경로는 배포에서만 드러난다(Vite dev는 무엇이든 index.html을 준다).</p>
 */
public final class SpaRoutes {

    /** SPA 진입 파일 — forward 대상이자 폴백의 종착지 */
    public static final String SPA_ENTRY = "/index.html";

    /** 컨트롤러가 돌려주는 forward 지시자 */
    public static final String FORWARD_TO_SPA = "forward:" + SPA_ENTRY;

    /**
     * 예약 네임스페이스 — 접두사 자신({@code /api})과 그 하위({@code /api/...})가 모두 예약이다.
     *
     * <p>{@code /login}은 <b>화면</b>이고 {@code /login/oauth2/**}만 서버 콜백이다 — 더 긴 경로를 예약한다.
     * ({@code login}을 통째로 예약하면 {@code /login/zzz} 같은 화면 경로가 함께 막힌다.)</p>
     */
    private static final List<String> RESERVED_NAMESPACES = List.of(
            "/api",
            "/uploads",
            "/images",
            "/h2-console",
            "/actuator",
            "/swagger-ui",
            "/v3/api-docs",
            "/error",
            "/custom-oauth2",
            "/oauth2",
            "/login/oauth2"
    );

    private SpaRoutes() {
    }

    /** 컨텍스트 경로를 뺀 요청 경로 — 판정은 언제나 이 값으로 한다 */
    public static String pathOf(HttpServletRequest request) {
        String uri = request.getRequestURI();
        if (uri == null || uri.isEmpty()) {
            return "/";
        }
        String contextPath = request.getContextPath();
        if (contextPath != null && !contextPath.isEmpty() && uri.startsWith(contextPath)) {
            uri = uri.substring(contextPath.length());
        }
        return uri.isEmpty() ? "/" : uri;
    }

    /** ① 서버가 제 규칙으로 답하는 네임스페이스인가 */
    public static boolean isReserved(String path) {
        for (String namespace : RESERVED_NAMESPACES) {
            if (path.equals(namespace) || path.startsWith(namespace + "/")) {
                return true;
            }
        }
        return false;
    }

    /** ② 정적 자원 요청인가 — 마지막 세그먼트에 점(확장자)이 있다 */
    public static boolean looksLikeStaticAsset(String path) {
        return path.indexOf('.', path.lastIndexOf('/') + 1) >= 0;
    }

    /**
     * 화면 쪽 요청인가 — <b>시큐리티 화이트리스트가 쓰는 판정</b>이다.
     *
     * <p>점이 있는 경로(없는 번들)도 여기 포함된다. 그래야 401이 아니라 <b>404</b>로 드러난다 —
     * 401은 "로그인하면 되나?"로 읽히지만 실제로는 존재하지 않는 자원이다(설계/04 §1-4).
     * 대신 <b>GET·HEAD만</b>이다. 주소창 진입은 GET이고, 화면 경로로 오는 POST는 화이트리스트 밖이라 401이 유지된다.</p>
     */
    public static boolean isScreenRequest(String method, String path) {
        return ("GET".equals(method) || "HEAD".equals(method)) && !isReserved(path);
    }

    /** ③ index.html로 forward할 요청인가 — 화면 요청이면서 정적 자원 모양이 아니다 */
    public static boolean isSpaFallback(String method, String path) {
        return isScreenRequest(method, path) && !looksLikeStaticAsset(path);
    }

    /** {@link #isSpaFallback(String, String)}의 요청 버전 */
    public static boolean isSpaFallback(HttpServletRequest request) {
        return isSpaFallback(request.getMethod(), pathOf(request));
    }
}
