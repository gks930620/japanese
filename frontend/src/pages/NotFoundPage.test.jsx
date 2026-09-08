// TDD Red — senior-dev 작성 (2026-09-03 판정 D-6 · 08 C-12 ④)
//
// 전역 404(`*` 라우트)는 어디서 왔든 "없는 코스·유닛이에요"라고 말했다. 커뮤니티·계정 주소를 잘못 친 사람에게
// 코스 얘기를 하면 자기가 뭘 잘못했는지 모른 채 관계없는 코스 목록으로 안내받는다.
// 전역 404의 설명은 **대상 없이** 쓴다. 코스·유닛 전용 문구는 코스 경로의 카드에만 남는다(UnitStudyPage·CourseDetailPage).
//
// 이 테스트를 수정하지 말 것 — 계약 변경은 senior-dev 경유 (CLAUDE.md TDD 규칙 2).
import { render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { describe, expect, it } from "vitest";
import { NotFoundPage } from "./NotFoundPage.jsx";

function renderAt(route) {
  render(
    <MemoryRouter initialEntries={[route]}>
      <Routes>
        <Route element={<NotFoundPage />} path="*" />
      </Routes>
    </MemoryRouter>,
  );
}

describe("전역 404 — 대상 없이 말한다 (D-6)", () => {
  it.each(["/nope/nope", "/community/typo", "/mypage/typo"])("%s 에서 코스·유닛을 언급하지 않는다", (route) => {
    renderAt(route);

    expect(screen.getByText("찾을 수 없는 페이지예요")).toBeInTheDocument();
    expect(screen.queryByText(/코스·유닛/)).toBeNull();
    // 주소 문제라는 사실은 여전히 말한다
    expect(screen.getByText(/주소가 바뀌었거나/)).toBeInTheDocument();
    // 되돌릴 수 없는 실패에 [다시 시도]는 없고, 나갈 길은 있다(C-12 ④)
    expect(screen.queryByRole("button", { name: "다시 시도" })).toBeNull();
    expect(screen.getByRole("link", { name: "홈으로" })).toHaveAttribute("href", "/");
  });

  it("영어 화면 안의 오타는 영어 코스 목록으로 보낸다 (A-M3 유지)", () => {
    renderAt("/en/nope");

    expect(screen.getByRole("link", { name: "영어 코스 목록으로" })).toHaveAttribute("href", "/en/courses");
    expect(screen.queryByText(/코스·유닛/)).toBeNull();
  });
});
