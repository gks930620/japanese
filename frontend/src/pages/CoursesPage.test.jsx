// TDD Red — senior-dev 작성 (2026-09-03 판정 D-4 · 08 C-7)
//
// 코스 목록 상단 안내 띠의 "처음이면 ○○부터 시작하세요"는 **계산된 시작점**(lib/courses.entryCourseNo)에서 만든다.
// 지금은 문구가 "왕초보(N5)"로 박혀 있어, 같은 화면의 배지("여기서 시작하세요")는 입문을 가리키고
// 문구는 왕초보를 가리킨다 — 첫 화면이 "어디부터?"에 두 답을 준다. 배지와 문구는 **같은 값**에서 나와야 한다.
//
// 이 테스트를 수정하지 말 것 — 계약 변경은 senior-dev 경유 (CLAUDE.md TDD 규칙 2).
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it } from "vitest";
import { apiSuccess, stubFetch } from "../test/helpers.jsx";
import { CoursesPage } from "./CoursesPage.jsx";

function course(overrides) {
  return {
    id: 2, courseNo: 1, levelLabel: "JLPT N5", levelCode: "N5", title: "왕초보",
    targetAudience: "대상", goal: "목표", notice: null, status: "AVAILABLE", unitCount: 20,
    ...overrides,
  };
}

function renderCourses(list) {
  stubFetch((url) => (url.includes("/api/courses") ? apiSuccess(list) : apiSuccess(null)));
  render(
    <MemoryRouter initialEntries={["/courses"]}>
      <CoursesPage />
    </MemoryRouter>,
  );
}

describe("코스 목록 안내 띠 — 시작점 문구는 배지와 같은 계산에서 나온다 (D-4)", () => {
  it("입문(코스 0)이 열려 있으면 안내 띠도 입문부터 시작하라고 말한다", async () => {
    renderCourses([
      course({ id: 1, courseNo: 0, levelLabel: "문자", levelCode: "INTRO", title: "입문", unitCount: 10 }),
      course(),
    ]);

    const notice = await screen.findByText(/처음이면/);
    expect(notice.textContent).toMatch(/입문.*부터 시작하세요/);
    expect(notice.textContent).not.toMatch(/왕초보\(N5\)부터/);
    // 배지와 같은 코스를 가리킨다
    expect(screen.getByText("여기서 시작하세요").closest("a")).toHaveAttribute("href", "/courses/1");
  });

  it("입문이 준비중이면 안내 띠는 그다음 열린 코스(왕초보)를 말한다 — 문구가 계산을 따라간다", async () => {
    renderCourses([
      course({ id: 1, courseNo: 0, levelLabel: "문자", levelCode: "INTRO", title: "입문", status: "PREPARING", unitCount: 0 }),
      course(),
    ]);

    const notice = await screen.findByText(/처음이면/);
    expect(notice.textContent).toMatch(/왕초보.*부터 시작하세요/);
    expect(notice.textContent).not.toMatch(/입문.*부터/);
  });
});
