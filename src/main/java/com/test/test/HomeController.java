package com.test.test;

import com.test.test.common.web.SpaRoutes;
import org.springframework.stereotype.Controller;
import org.springframework.web.bind.annotation.GetMapping;

/**
 * SPA 진입점 — 루트(`/`)를 index.html로 forward한다 (설계/04 §1-7 · 08 C-25).
 *
 * <p><b>화면 경로를 열거하지 않는다.</b> 예전에는 여기에 화면 경로를 나열했고, 열거 밖 주소
 * ({@code /nonexistent-page} · {@code /bookmarks/zzz})는 시큐리티 화이트리스트에도 없어 <b>401 JSON 원문</b>이
 * 화면에 그대로 보였다. 지금은 "예약 네임스페이스의 여집합"이 화면이다 — 판정은 {@link SpaRoutes} 하나이고,
 * 매핑되지 않은 화면 경로의 forward는 {@code GlobalExceptionHandler}가 그 판정으로 처리한다.</p>
 *
 * <p>루트만 여기 남는 이유: {@code /}는 스프링 부트의 welcome page 매핑이 먼저 가져가 상대 경로
 * ({@code forward:index.html})로 넘긴다. 진입 경로가 하나로 보이도록 루트만 명시적으로 잡아 둔다.</p>
 */
@Controller
public class HomeController {

    @GetMapping("/")
    public String forward() {
        return SpaRoutes.FORWARD_TO_SPA;
    }
}
