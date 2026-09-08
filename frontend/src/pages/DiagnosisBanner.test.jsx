// frontend-dev 작성 — 진단 배너 위치·분기(화면정의서 판정 B). 선작성 테스트가 덮지 않는 부분.
import { render as rtlRender, screen, waitFor } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { beforeEach, describe, expect, it } from "vitest";
import { apiError, apiSuccess, stubFetch } from "../test/helpers.jsx";
import { AuthProvider } from "../context/AuthContext.jsx";
import { UserDataProvider } from "../context/UserDataContext.jsx";
import { setGuestUnitCompleted, setGuestLastPosition } from "../lib/guestStore.js";
import { HomePage } from "./HomePage.jsx";
import { CoursesPage } from "./CoursesPage.jsx";

const COURSES = [
  { id: 2, courseNo: 1, levelLabel: "JLPT N5", title: "왕초보", status: "AVAILABLE", unitCount: 2 },
  { id: 3, courseNo: 2, levelLabel: "JLPT N4", title: "초급", status: "AVAILABLE", unitCount: 2 },
];

function renderPage(element, path) {
  stubFetch((url) => {
    if (url.includes("/api/users/me")) return apiError(401, "NOT_AUTHENTICATED");
    if (url.includes("/api/courses")) return apiSuccess(COURSES);
    return apiSuccess(null);
  });
  rtlRender(
    <MemoryRouter initialEntries={[path]}>
      <AuthProvider>
        <UserDataProvider>
          <Routes>
            <Route element={element} path={path} />
          </Routes>
        </UserDataProvider>
      </AuthProvider>
    </MemoryRouter>,
  );
}

beforeEach(() => {
  window.localStorage.clear();
});

describe("홈 배너 (판정 B — 히어로 바로 아래, 항상 노출)", () => {
  it("[내 시작점 찾기]가 /diagnosis로 간다", async () => {
    renderPage(<HomePage />, "/");

    expect(await screen.findByRole("link", { name: "내 시작점 찾기" })).toHaveAttribute("href", "/diagnosis");
  });
});

describe("코스 목록 배너 (기존 시작 안내 띠에 병합)", () => {
  it("진도 없음 — 기본값 문구와 병기된다", async () => {
    renderPage(<CoursesPage />, "/courses");

    await waitFor(() => expect(screen.getByText(/처음이면/)).toBeInTheDocument());
    expect(screen.getByRole("link", { name: "내 시작점 찾기" })).toHaveAttribute("href", "/diagnosis");
  });

  it("진도 있음 — 진단 문구로 바뀌고 링크는 유지된다", async () => {
    setGuestUnitCompleted(2, 1, true);
    setGuestLastPosition({ courseId: 2, unitNo: 2, stepKey: "kanji" }, new Date());
    renderPage(<CoursesPage />, "/courses");

    await waitFor(() => expect(screen.getByText(/고민되나요/)).toBeInTheDocument());
    expect(screen.queryByText(/처음이면/)).not.toBeInTheDocument();
    expect(screen.getByRole("link", { name: "내 시작점 찾기" })).toBeInTheDocument();
  });

  it("전부 완주 — 진단 배너를 생략하고 완주 띠만 보인다", async () => {
    setGuestUnitCompleted(2, 1, true);
    setGuestUnitCompleted(2, 2, true);
    setGuestUnitCompleted(3, 1, true);
    setGuestUnitCompleted(3, 2, true);
    renderPage(<CoursesPage />, "/courses");

    await waitFor(() => expect(screen.getByText(/모두 마쳤어요/)).toBeInTheDocument());
    expect(screen.queryByRole("link", { name: "내 시작점 찾기" })).not.toBeInTheDocument();
  });
});
