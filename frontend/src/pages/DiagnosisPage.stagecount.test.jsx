// 시작 화면이 말하는 **최대 단계 수**는 상수가 아니라 공개 코스에서 계산된 값이다 (설계/09 §3-1 · 인수 조건 A1).
// 2026-09-10 개편: "최대 {계단×3}문제"(한 문항씩 넘기던 화면) → **"최대 {계단}단계"**(레벨마다 6문항 한 화면).
// 문항 수가 아니라 **단계 수**를 말하는 이유는, 단계마다 재료 사정으로 5문항이 나올 수 있어
// "최대 36문항"이 정확한 약속이 아니기 때문이다(E5). 단계 수는 코스 상태만으로 정확하다.
//
// ★ 이 규칙은 이 파일 하나가 고정한다(08 C-11) — `DiagnosisPage.test.jsx`는 문구·흐름만 본다.
import { render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { describe, expect, it } from "vitest";
import { apiError, apiSuccess, stubFetch } from "../test/helpers.jsx";
import { coursesFixture } from "../test/apiFixtures.js";
import { stagePlan } from "../lib/diagnosis.js";
import { DiagnosisPage } from "./DiagnosisPage.jsx";

/** 픽스처는 apiFixtures에서만 온다(08 C-9) — 상태만 바꿔 "열린 코스"를 만든다 */
function coursesWithStatus(statusByCourseNo) {
  return coursesFixture().map((course) => ({
    ...course,
    status: statusByCourseNo[course.courseNo] ?? course.status,
  }));
}

function renderPage(courses) {
  stubFetch((url) => {
    if (url.includes("/api/users/me")) return apiError(401, "NOT_AUTHENTICATED");
    if (url.includes("/api/courses")) return apiSuccess(courses);
    return apiSuccess(null);
  });
  render(
    <MemoryRouter initialEntries={["/diagnosis"]}>
      <Routes>
        <Route element={<DiagnosisPage />} path="/diagnosis" />
      </Routes>
    </MemoryRouter>,
  );
}

describe("시작 화면의 최대 단계 수 (A1)", () => {
  it("개통된 코스만큼 계단이 된다 — 지금은 입문~N1 여섯 단계", async () => {
    const courses = coursesFixture();
    renderPage(courses);

    const expected = stagePlan(courses).length;
    expect(expected).toBe(6); // 입문이 계단에 들어왔다(08 §F-13 뒤집힘 절)
    expect(await screen.findByText(new RegExp(`최대 ${expected}단계`))).toBeInTheDocument();
  });

  it("N1이 준비중으로 돌아가면 단계 수가 줄어든다", async () => {
    const courses = coursesWithStatus({ 5: "PREPARING" });
    renderPage(courses);

    expect(await screen.findByText(new RegExp(`최대 ${stagePlan(courses).length}단계`))).toBeInTheDocument();
  });

  it("입문이 준비중이면 단계가 하나 줄고 계단은 N5부터다 (E9)", async () => {
    const withoutIntro = coursesWithStatus({ 0: "PREPARING" });
    const withIntro = coursesFixture();
    expect(stagePlan(withoutIntro).length).toBe(stagePlan(withIntro).length - 1);

    renderPage(withoutIntro);
    expect(await screen.findByText(new RegExp(`최대 ${stagePlan(withoutIntro).length}단계`))).toBeInTheDocument();
  });
});
