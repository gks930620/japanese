package com.test.test;

import org.springframework.stereotype.Controller;
import org.springframework.web.bind.annotation.GetMapping;

/**
 * SPA 진입점 — 화면 경로를 모두 index.html로 forward한다 (설계 §4-B-6 · §7-17 ②).
 *
 * <p>섹션 하위는 <b>와일드카드</b>로 받는다. 라우팅의 단일 기준은 React 라우터이고, 서버가 화면 경로를
 * 개별로 나열하면 프론트가 라우트를 추가할 때마다 백엔드도 고쳐야 하는 데다, 빠진 경로는 500이 되어
 * 사용자가 "다시 시도"만 반복하게 된다. 없는 하위 경로는 SPA가 받아 404 화면을 그린다.
 * (API 미매핑은 반대로 404 JSON — GlobalExceptionHandler. 화면에 JSON을 주면 사용자가 JSON 텍스트를 본다.)</p>
 */
@Controller
public class HomeController {

    @GetMapping({
            "/",
            "/login",
            "/signup",
            "/mypage", "/mypage/**",
            // 섹션 와일드카드 — 코스·유닛 직접 접근(인수 19), 자료실 새로고침(자료실 인수 6) 포함
            "/community", "/community/**",
            "/courses", "/courses/**",
            "/library", "/library/**",
            // 영어 과정 (설계/05 §16) — /en 단독 홈은 만들지 않는다. 서버는 index.html로 넘기기만 하고
            // "/en → /en/courses" 리다이렉트는 SPA 라우터가 한다(라우팅의 단일 기준은 React 라우터다)
            "/en", "/en/**",
            // 보관함 — 비로그인도 보는 화면이다(게스트 기록을 그린다 — 설계/04 §6-6)
            "/bookmarks",
            // 실력 진단 — 비로그인도 본다(설계/05 §15-2)
            "/diagnosis"
    })
    public String forward() {
        return "forward:/index.html";
    }
}
