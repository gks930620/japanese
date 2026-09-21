// frontend-dev 작성 — 영어 코스 상세 (설계/05 §16-2).
// 일본어 상세와 갈리는 지점만 본다: 레벨 괄호 없음 · 한자 자리가 표현 · 진행 안내(course.notice).
import { render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { describe, expect, it } from "vitest";
import { apiError, apiSuccess, stubFetch } from "../test/helpers.jsx";
import { enCourseDetailFixture } from "../test/apiFixtures.js";
import { AuthProvider } from "../context/AuthContext.jsx";
import { UserDataProvider } from "../context/UserDataContext.jsx";
import { CourseDetailPage } from "./CourseDetailPage.jsx";

function renderDetail(payload, { status = 200 } = {}) {
  const fetchMock = stubFetch((url) => {
    if (url.includes("/api/users/me")) return apiError(401, "NOT_AUTHENTICATED");
    if (url.includes("/api/en/courses/")) {
      return status === 200 ? apiSuccess(payload) : apiError(status, "NOT_FOUND");
    }
    return apiSuccess(null);
  });
  render(
    <MemoryRouter initialEntries={["/en/courses/101"]}>
      <AuthProvider>
        <UserDataProvider>
          <Routes>
            <Route element={<CourseDetailPage lang="en" />} path="/en/courses/:courseId" />
          </Routes>
        </UserDataProvider>
      </AuthProvider>
    </MemoryRouter>,
  );
  return fetchMock;
}

describe("영어 코스 상세", () => {
  it("영어 API로 묻는다", async () => {
    const fetchMock = renderDetail(enCourseDetailFixture());

    await screen.findByRole("heading", { name: "다시 세우기" });
    expect(fetchMock.mock.calls.some(([url]) => String(url).includes("/api/en/courses/101"))).toBe(true);
  });

  it("제목에 레벨 괄호를 붙이지 않는다", async () => {
    renderDetail(enCourseDetailFixture());

    const heading = await screen.findByRole("heading", { name: "다시 세우기" });
    expect(heading.textContent).toBe("다시 세우기");
    expect(screen.queryByText(/E1/)).not.toBeInTheDocument();
  });

  it("집계 줄은 유닛·문법·표현·어휘다 — 한자가 없다", async () => {
    renderDetail(enCourseDetailFixture());

    await screen.findByRole("heading", { name: "다시 세우기" });
    expect(screen.getByText("표현")).toBeInTheDocument();
    expect(screen.queryByText(/한자/)).not.toBeInTheDocument();
    expect(screen.queryByText(/약 32/)).not.toBeInTheDocument();
  });

  it("진행 안내를 course.notice로 낸다", async () => {
    // 문구를 리터럴로 적지 않는다 — 픽스처와 같은 문자열을 두 곳에 두면 한쪽만 고치는 길이 열린다.
    // 이 테스트가 고정하는 것은 "notice 값이 화면에 그대로 나온다"이지 문구 자체가 아니다.
    const fixture = enCourseDetailFixture();
    renderDetail(fixture);

    // 화면은 `✎ {notice}`로 렌더하므로 부분 일치로 본다 — 접두 기호는 이 테스트가 고정할 것이 아니다.
    expect(await screen.findByText(fixture.notice, { exact: false })).toBeInTheDocument();
  });

  it("유닛 행 메타가 문법·회화·표현·어휘다", async () => {
    renderDetail(enCourseDetailFixture());

    expect(await screen.findByText("문법 3 · 회화 1 · 표현 7 · 어휘 16개")).toBeInTheDocument();
  });

  it("유닛 링크와 주 버튼이 영어 경로로 간다", async () => {
    renderDetail(enCourseDetailFixture());

    const cta = await screen.findByRole("link", { name: /유닛 1부터 시작하기/ });
    expect(cta.getAttribute("href")).toBe("/en/courses/101/units/1");
    expect(screen.getByRole("link", { name: /첫 문장 다시 세우기/ }).getAttribute("href")).toBe(
      "/en/courses/101/units/1",
    );
  });

  it("준비중 코스는 코스 이름만 넣고, 일본어 코스로 튕기지 않는다", async () => {
    renderDetail(enCourseDetailFixture({ id: 104, title: "뉘앙스", status: "PREPARING" }));

    expect(await screen.findByText(/뉘앙스 코스는 지금 만들고 있어요/)).toBeInTheDocument();
    expect(screen.queryByText(/왕초보/)).not.toBeInTheDocument();
    expect(screen.getByRole("link", { name: "영어 코스 목록으로" }).getAttribute("href")).toBe("/en/courses");
  });

  it("없는 코스면 영어 코스 목록으로 돌려보낸다", async () => {
    renderDetail(null, { status: 404 });

    await waitFor(() => expect(screen.getByText(/찾을 수 없는/)).toBeInTheDocument());
    expect(screen.getByRole("link", { name: /영어 코스 목록으로/ }).getAttribute("href")).toBe("/en/courses");
  });
});
