import { render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { describe, expect, it } from "vitest";
import { apiError, apiSuccess, stubFetch } from "../test/helpers.jsx";
import { enCoursesFixture } from "../test/apiFixtures.js";
import { AuthProvider } from "../context/AuthContext.jsx";
import { UserDataProvider } from "../context/UserDataContext.jsx";
import { CourseDetailPage } from "./CourseDetailPage.jsx";
import { NotFoundPage } from "./NotFoundPage.jsx";

/**
 * 영어 과정의 **막다른 길 두 곳** (2026-08-25 판정 A-M2 · A-M3)
 *
 * 이 저장소는 "과정을 벗어나 튕기지 않는다"를 이미 여러 곳에서 지킨다 — 코스·유닛·자료실 상세가 전부
 * 자기 과정으로 되돌린다. 남은 두 곳이 이번 건이다:
 *   - **A-M2**: 준비중 영어 코스 상세가 `openTo={null}`이라 "지금 볼 수 있는 코스" 줄이 통째로 빠진다.
 *     인수 B-7과 설계/05 §16-4가 **명시적으로 요구한 prop을 null로 넣어 기능을 껐다.**
 *     자가진단 선택지 5개 중 4개가 준비중 코스로 가므로 **5분의 4가 막다른 카드로 끝난다.**
 *   - **A-M3**: `/en/**`의 없는 주소가 일본어 코스 목록으로 되돌린다(인수 G-1 위반). 마지막 와일드카드만 남았다.
 *
 * 계약:
 *   ① 준비중 영어 코스 → **열린 첫 영어 코스**로 가는 줄을 준다. 열린 코스가 하나도 없으면 그 줄은 만들지 않는다
 *      (없는 것을 약속하지 않는다 — 08 C-12 ②).
 *   ② `/en` 하위의 없는 주소 → 404 화면의 주 버튼이 **영어 코스 목록**이다.
 *
 * 이 테스트를 수정하지 말 것 — 계약 변경은 senior-dev 경유.
 */

/** GET /api/en/courses/102 — 준비중 코스 상세(실측: description null, summary 0, units []) */
function preparingDetail(overrides = {}) {
  return {
    id: 102,
    courseNo: 2,
    levelCode: "E2",
    levelLabel: "E2",
    title: "일상 말하기",
    targetAudience: "",
    goal: "",
    notice: null,
    description: null,
    status: "PREPARING",
    summary: { unitCount: 0, grammarCount: 0, expressionCount: 0, vocabCount: 0 },
    units: [],
    ...overrides,
  };
}

function renderEnPreparing(courses = enCoursesFixture()) {
  stubFetch((url) => {
    const target = String(url);
    if (target.includes("/api/users/me")) return apiError(401, "NOT_AUTHENTICATED");
    if (target.includes("/api/en/courses/102")) return apiSuccess(preparingDetail());
    if (target.includes("/api/en/courses")) return apiSuccess(courses);
    return apiSuccess(null);
  });
  render(
    <MemoryRouter initialEntries={["/en/courses/102"]}>
      <AuthProvider>
        <UserDataProvider>
          <Routes>
            <Route element={<CourseDetailPage lang="en" />} path="/en/courses/:courseId" />
          </Routes>
        </UserDataProvider>
      </AuthProvider>
    </MemoryRouter>,
  );
}

describe("준비중 영어 코스에서 나가는 길 (A-M2)", () => {
  it("열린 첫 영어 코스로 가는 링크가 있다", async () => {
    renderEnPreparing();

    expect(await screen.findByText(/일상 말하기 코스는 지금 만들고 있어요/)).toBeInTheDocument();
    const open = screen.getByRole("link", { name: /지금.*볼 수 있|시작할 수 있/ });
    expect(open).toHaveAttribute("href", "/en/courses/101"); // 유일한 AVAILABLE 영어 코스
  });

  it("일본어 코스로는 절대 보내지 않는다", async () => {
    renderEnPreparing();

    await screen.findByText(/일상 말하기 코스는 지금 만들고 있어요/);
    screen.getAllByRole("link").forEach((link) => {
      expect(link.getAttribute("href") ?? "").not.toMatch(/^\/courses/);
    });
    expect(screen.getByRole("link", { name: "영어 코스 목록으로" })).toHaveAttribute("href", "/en/courses");
  });

  it("열린 영어 코스가 하나도 없으면 그 줄을 만들지 않는다 (없는 것을 약속하지 않는다)", async () => {
    renderEnPreparing(enCoursesFixture().map((course) => ({ ...course, status: "PREPARING", unitCount: 0 })));

    await screen.findByText(/일상 말하기 코스는 지금 만들고 있어요/);
    expect(screen.queryByRole("link", { name: /지금.*볼 수 있|시작할 수 있/ })).not.toBeInTheDocument();
    expect(screen.getByRole("link", { name: "영어 코스 목록으로" })).toBeInTheDocument();
  });
});

describe("/en 하위의 없는 주소 (A-M3)", () => {
  const renderNotFoundAt = (route) =>
    render(
      <MemoryRouter initialEntries={[route]}>
        <Routes>
          <Route element={<NotFoundPage />} path="*" />
        </Routes>
      </MemoryRouter>,
    );

  it("영어 주소면 주 버튼이 영어 코스 목록이다", () => {
    renderNotFoundAt("/en/bogus");

    const primary = screen.getByRole("link", { name: /영어 코스 목록/ });
    expect(primary).toHaveAttribute("href", "/en/courses");
    expect(screen.queryByRole("link", { name: "코스 목록으로" })).not.toBeInTheDocument();
  });

  it("영어 자료실의 없는 주소도 같다", () => {
    renderNotFoundAt("/en/library/kanji");

    expect(screen.getByRole("link", { name: /영어 코스 목록/ })).toHaveAttribute("href", "/en/courses");
  });

  it("일본어 주소는 그대로다 (회귀)", () => {
    renderNotFoundAt("/bogus");

    expect(screen.getByRole("link", { name: "코스 목록으로" })).toHaveAttribute("href", "/courses");
  });

  it("`/english-club` 같은 이름에 속지 않는다", () => {
    renderNotFoundAt("/english-club");

    expect(screen.getByRole("link", { name: "코스 목록으로" })).toHaveAttribute("href", "/courses");
  });
});
