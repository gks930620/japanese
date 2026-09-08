// frontend-dev 작성 — 영어 코스 목록 (설계/05 §16·§16-2).
// 핵심은 두 가지다: **레벨 라벨을 화면에 쓰지 않는다**(코스명이 곧 단계 이름) ·
// 시작 배지를 자동으로 붙이지 않는다(진단 결과에만 — 진단은 저장하지 않으므로 목록에는 없다).
import { render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { describe, expect, it } from "vitest";
import { apiError, apiSuccess, stubFetch } from "../test/helpers.jsx";
import { enCoursesFixture } from "../test/apiFixtures.js";
import { AuthProvider } from "../context/AuthContext.jsx";
import { UserDataProvider } from "../context/UserDataContext.jsx";
import { EnCoursesPage } from "./EnCoursesPage.jsx";

function renderPage({ fail = false } = {}) {
  const fetchMock = stubFetch((url) => {
    if (url.includes("/api/users/me")) return apiError(401, "NOT_AUTHENTICATED");
    if (url.includes("/api/en/courses")) {
      return fail ? apiError(500, "INTERNAL_SERVER_ERROR") : apiSuccess(enCoursesFixture());
    }
    return apiSuccess(null);
  });
  render(
    <MemoryRouter initialEntries={["/en/courses"]}>
      <AuthProvider>
        <UserDataProvider>
          <Routes>
            <Route element={<EnCoursesPage />} path="/en/courses" />
          </Routes>
        </UserDataProvider>
      </AuthProvider>
    </MemoryRouter>,
  );
  return fetchMock;
}

describe("영어 코스 목록", () => {
  it("영어 코스만 부른다 — 일본어 목록 API를 섞지 않는다", async () => {
    const fetchMock = renderPage();

    await screen.findByText("다시 세우기");
    const calls = fetchMock.mock.calls.map(([url]) => String(url));
    expect(calls.some((url) => url.includes("/api/en/courses"))).toBe(true);
    expect(calls.some((url) => /\/api\/courses/.test(url))).toBe(false);
  });

  it("코스 5개가 코스명으로 보인다", async () => {
    renderPage();

    await screen.findByText("다시 세우기");
    ["일상 말하기", "이어 말하기", "뉘앙스", "실전과 격식"].forEach((title) => {
      expect(screen.getByText(title)).toBeInTheDocument();
    });
  });

  it("레벨 라벨(E1…)을 화면에 쓰지 않는다", async () => {
    renderPage();

    await screen.findByText("다시 세우기");
    expect(screen.queryByText(/E[1-5]/)).not.toBeInTheDocument();
  });

  it("자가진단으로 가는 안내가 있다", async () => {
    renderPage();

    const link = await screen.findByRole("link", { name: /어디서 시작/ });
    expect(link.getAttribute("href")).toBe("/en/start");
  });

  it("열린 코스만 상세로 이어진다 — 준비중은 링크가 아니다", async () => {
    renderPage();

    const link = await screen.findByRole("link", { name: /다시 세우기/ });
    expect(link.getAttribute("href")).toBe("/en/courses/101");
    expect(screen.queryByRole("link", { name: /뉘앙스/ })).not.toBeInTheDocument();
  });

  it("조회에 실패하면 다시 시도 버튼이 뜬다", async () => {
    renderPage({ fail: true });

    await waitFor(() => expect(screen.getByRole("button", { name: /다시/ })).toBeInTheDocument());
  });
});
