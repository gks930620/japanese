import { render as rtlRender, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { describe, expect, it } from "vitest";
import { apiSuccess, stubFetch } from "../test/helpers.jsx";
import { LocationProbe } from "../test/LocationProbe.jsx";
import { EnStartPage } from "./EnStartPage.jsx";

/**
 * 영어 자가진단 `/en/start` (설계/06 §11-12 — TDD Red, senior-dev 작성)
 *
 * **진단이 아니라 자기 선택이다** — 문제도 채점도 정답도 없다. can-do 5문장 중 하나를 고르면 그 코스로 간다.
 * 서버 엔드포인트가 없다(`GET /api/en/courses` 응답으로 계산).
 *
 * 레벨은 서버가 준 `levelCode`를 **그대로** 쓴다. 문자열을 가공하지 않는다(08 C-9 · 3단계 치명 ①).
 *
 * 이 테스트를 수정하지 말 것 — 계약 변경은 senior-dev 경유.
 */

const EN_COURSES = [
  { id: 101, courseNo: 1, levelCode: "E1", levelLabel: "E1", title: "다시 세우기", status: "AVAILABLE", unitCount: 2 },
  { id: 102, courseNo: 2, levelCode: "E2", levelLabel: "E2", title: "일상 말하기", status: "PREPARING", unitCount: 0 },
  { id: 103, courseNo: 3, levelCode: "E3", levelLabel: "E3", title: "이어 말하기", status: "PREPARING", unitCount: 0 },
  { id: 104, courseNo: 4, levelCode: "E4", levelLabel: "E4", title: "뉘앙스", status: "PREPARING", unitCount: 0 },
  { id: 105, courseNo: 5, levelCode: "E5", levelLabel: "E5", title: "실전과 격식", status: "PREPARING", unitCount: 0 },
];

function renderStart() {
  const fetchMock = stubFetch((url) => {
    if (url.includes("/api/en/courses")) return apiSuccess(EN_COURSES);
    return apiSuccess(null);
  });

  rtlRender(
    <MemoryRouter initialEntries={["/en/start"]}>
      <LocationProbe />
      <Routes>
        <Route element={<EnStartPage />} path="/en/start" />
        <Route element={<div>영어 코스</div>} path="/en/courses/:courseId" />
      </Routes>
    </MemoryRouter>,
  );
  return fetchMock;
}

describe("자가진단 — 채점하지 않는다", () => {
  it("can-do 문장 5개를 고르게 한다", async () => {
    renderStart();

    await waitFor(() => expect(screen.getAllByRole("button", { name: /요$|어요|해요/ }).length).toBeGreaterThanOrEqual(5));
  });

  it("고르면 그 코스 상세로 간다", async () => {
    renderStart();
    const user = userEvent.setup();

    const choices = await screen.findAllByRole("button", { name: /요$|어요|해요/ });
    await user.click(choices[0]);

    await waitFor(() => expect(screen.getByTestId("location").textContent).toBe("/en/courses/101"));
  });

  it("정답·오답 표시가 없다 — 진단이 아니다", async () => {
    renderStart();

    await waitFor(() => expect(screen.getByRole("heading", { level: 1 })).toBeInTheDocument());
    expect(screen.queryByText(/정답|오답|점수/)).not.toBeInTheDocument();
  });

  it("결과를 저장하지 않는다고 알린다", async () => {
    renderStart();

    await waitFor(() => expect(screen.getByText(/저장되지 않아요|저장하지 않아요/)).toBeInTheDocument());
  });

  /** 준비중 코스를 골라도 막지 않는다 — 코스 상세는 열리고 유닛만 막힌다(현행 준비중 동작) */
  it("준비중 코스를 골라도 코스 상세로 보낸다", async () => {
    renderStart();
    const user = userEvent.setup();

    const choices = await screen.findAllByRole("button", { name: /요$|어요|해요/ });
    await user.click(choices[choices.length - 1]);

    await waitFor(() => expect(screen.getByTestId("location").textContent).toBe("/en/courses/105"));
  });
});
