import { render, screen, within } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { describe, expect, it } from "vitest";
import { apiError, apiSuccess, stubFetch } from "../test/helpers.jsx";
import { AuthProvider } from "../context/AuthContext.jsx";
import { Layout } from "./Layout.jsx";

/**
 * GNB 배선 — **메뉴가 과정을 배신하지 않는다** (2026-08-25 판정 A-H1)
 *
 * `lib/nav.en.test.js`가 규칙을 고정하고, 이 파일은 **화면이 그 규칙을 실제로 쓰는가**를 본다.
 * 규칙만 고쳐 놓고 `Layout`이 옛 상수를 계속 그리면 사용자에게는 아무것도 바뀌지 않는다(08 C-9의 교훈).
 *
 * 이 테스트를 수정하지 말 것 — 계약 변경은 senior-dev 경유.
 */

function renderAt(route) {
  stubFetch((url) =>
    String(url).includes("/api/users/me") ? apiError(401, "NOT_AUTHENTICATED") : apiSuccess(null),
  );
  render(
    <MemoryRouter initialEntries={[route]}>
      <AuthProvider>
        <Routes>
          <Route element={<Layout />} path="*" />
        </Routes>
      </AuthProvider>
    </MemoryRouter>,
  );
  return screen.getByRole("navigation", { name: "주 메뉴" });
}

describe("영어 화면의 GNB (A-H1)", () => {
  it("자료실은 영어 자료실로 간다 — 한자 목록이 아니다", () => {
    const nav = renderAt("/en/library/expressions");

    expect(within(nav).getByRole("link", { name: "자료실" })).toHaveAttribute(
      "href",
      "/en/library/expressions",
    );
  });

  it("학습은 영어 코스 목록으로 간다", () => {
    const nav = renderAt("/en/courses/101/units/1");

    expect(within(nav).getByRole("link", { name: "학습" })).toHaveAttribute("href", "/en/courses");
  });

  it("영어 화면에서도 활성 표시가 켜진다 — 지금은 어느 메뉴도 안 켜진다", () => {
    const nav = renderAt("/en/library/expressions");

    expect(within(nav).getByRole("link", { name: "자료실" })).toHaveAttribute("aria-current", "page");
    expect(within(nav).getByRole("link", { name: "학습" })).not.toHaveAttribute("aria-current");
  });

  it("일본어 화면은 그대로다 (회귀)", () => {
    const nav = renderAt("/library/kanji");

    expect(within(nav).getByRole("link", { name: "자료실" })).toHaveAttribute("href", "/library/kanji");
    expect(within(nav).getByRole("link", { name: "학습" })).toHaveAttribute("href", "/courses");
    expect(within(nav).getByRole("link", { name: "자료실" })).toHaveAttribute("aria-current", "page");
  });

  it("커뮤니티는 과정과 무관하게 같은 곳이다 (메뉴를 언어별로 늘리지 않는다)", () => {
    const enNav = renderAt("/en/courses");
    expect(within(enNav).getByRole("link", { name: "커뮤니티" })).toHaveAttribute("href", "/community");
  });
});
