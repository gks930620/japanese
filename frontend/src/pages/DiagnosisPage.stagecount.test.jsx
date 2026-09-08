// frontend-dev 작성 — 최대 문항 수는 상수가 아니라 계단(코스 수)에서 파생된다.
// N1이 열리면 계단이 5단계가 되고 안내 문구도 15문제로 따라 움직여야 한다(설계/05 §15-2).
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

describe("시작 화면의 최대 문항 수 (계단 × 3)", () => {
  // 문항 수는 상수가 아니라 **계단 길이에서 파생되는 값**이다 — 코스가 열리면 자동으로 늘어난다.
  // 그래서 숫자를 적지 않고 stagePlan에서 계산해 비교한다(픽스처가 실제 상태를 따라가므로 이것이 곧 제품 값이다).
  it("개통된 코스만큼 계단이 늘어난다 — 지금은 N5~N1 다섯 단계", async () => {
    const courses = coursesFixture();
    renderPage(courses);

    const expected = stagePlan(courses).length * 3;
    expect(await screen.findByText(new RegExp(`최대 ${expected}문제`))).toBeInTheDocument();
  });

  it("N1이 준비중으로 돌아가면 문항 수가 줄어든다", async () => {
    const courses = coursesWithStatus({ 5: "PREPARING" });
    renderPage(courses);

    const expected = stagePlan(courses).length * 3;
    expect(await screen.findByText(new RegExp(`최대 ${expected}문제`))).toBeInTheDocument();
  });

  it("입문이 열려도 계단에 들어가지 않아 문항 수가 늘지 않는다", async () => {
    // 입문은 한자 0자라 단계를 만들 수 없다(설계/06 §2·§6 판정 J-5) — 추천 대상이긴 하다(설계/08 C-11)
    const withIntro = coursesWithStatus({ 0: "AVAILABLE" });
    const withoutIntro = coursesWithStatus({ 0: "PREPARING" });
    expect(stagePlan(withIntro).length).toBe(stagePlan(withoutIntro).length);

    renderPage(withIntro);
    const expected = stagePlan(withIntro).length * 3;
    expect(await screen.findByText(new RegExp(`최대 ${expected}문제`))).toBeInTheDocument();
  });
});
