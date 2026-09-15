import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import { coursesFixture } from "../test/apiFixtures.js";
import { renderDiagnosis, resultRows, startLevel, submitLevel } from "../test/diagnosisHelpers.jsx";

/**
 * 진단 — **목록의 끝에 닿았을 때** (설계/09 §3-2 · 05 §15-2 — TDD Red, senior-dev 2026-09-14 개편)
 *
 * 기획 D11·D14 / 인수 조건 **A34** + 예외 **E20·E21** + 2026-08-25 판정 **M4**.
 *
 * ★ 이 파일은 `DiagnosisPage.allPassed.test.jsx`를 **대체한다.** 그 파일은 계단을 여섯 번 통과시켜(`passEveryStage`)
 *   전체 통과 상태를 만들었는데, **그 조작이 더 이상 존재하지 않는다**(통과해도 자동 전환이 없다 — D10).
 *   지금은 **가장 높은 레벨을 골라 한 판만 쳐도** 같은 상태가 된다(`allPassed`의 뜻이 "가장 높은 레벨 통과"로 바뀌었다).
 *   위·아래 어느 쪽이든 **끝에 닿으면 버튼이 사라지고 문구가 그 자리를 말한다** — 두 경우가 대칭이므로 한 파일에 둔다.
 *
 * 이 테스트를 수정하지 말 것 — 계약 변경은 senior-dev 경유.
 */

const headline = () => document.querySelector(".diag-headline")?.textContent?.trim() ?? null;
const primaryLabels = () => [...document.querySelectorAll(".k-btn--primary")].map((node) => node.textContent.trim());

describe("가장 높은 레벨을 통과했을 때 (E20 · A34)", () => {
  it("위로 가는 버튼이 DOM에 없고 코스 시작하기가 주 버튼을 물려받는다", async () => {
    renderDiagnosis();
    const user = userEvent.setup();
    await startLevel(user, "고급(JLPT N1)");
    await submitLevel(user, { correct: true });

    expect(headline()).toBe("이 레벨은 충분해요");
    expect(screen.getByText("가장 높은 레벨까지 확인했어요 — 더 볼 위 레벨이 없어요.")).toBeInTheDocument();
    // 비활성 버튼을 두지 않는다 — "왜 안 눌리지"라는 질문을 만든다(05 §15-4)
    expect(screen.queryByRole("button", { name: /도전하기/ })).toBeNull();
    expect(primaryLabels()).toEqual(["고급 코스 시작하기 ›"]);
    expect(screen.getByRole("button", { name: "다른 레벨 고르기" })).toBeInTheDocument();
    expect(resultRows()).toEqual([["JLPT N1", "6 / 6", "통과"]]);
  });

  /** N1은 JLPT 최상위이자 마지막 코스다 — 없는 것을 약속하지 않는다(08 C-12 ②) */
  it("준비중 코스가 하나도 없으면 '그 위 코스는 준비 중' 안내를 하지 않는다 (M4)", async () => {
    const courses = coursesFixture();
    expect(courses.every((course) => course.status === "AVAILABLE")).toBe(true);

    renderDiagnosis({ courses });
    const user = userEvent.setup();
    await startLevel(user, "고급(JLPT N1)");
    await submitLevel(user, { correct: true });

    expect(screen.queryByText(/준비하고 있어요/)).toBeNull();
  });

  it("정말로 준비중인 코스가 있으면 그때는 안내한다 (M4)", async () => {
    // N1만 준비중으로 되돌린다 — 목록의 끝은 N2가 되고, 그 위(N1)는 실제로 준비 중이다
    const courses = coursesFixture().map((course) =>
      course.levelCode === "N1" ? { ...course, status: "PREPARING", unitCount: 0 } : course,
    );

    renderDiagnosis({ courses });
    const user = userEvent.setup();
    await startLevel(user, "중상급(JLPT N2)");
    await submitLevel(user, { correct: true });

    expect(screen.getByText("그 위 코스는 지금 준비하고 있어요.")).toBeInTheDocument();
    // 추천은 준비중을 가리키지 않는다 — 가장 높은 **공개** 코스다
    expect(primaryLabels()).toEqual(["중상급 코스 시작하기 ›"]);
  });
});

describe("가장 낮은 레벨에서 미달했을 때 (E21 · A34)", () => {
  /** 가장 낮은 레벨의 미달은 **진단의 정상적인 결론**이다 — 벌주는 화면을 만들지 않는다 */
  it("아래로 가는 버튼이 없고, 여기가 끝이라고 말한다", async () => {
    renderDiagnosis();
    const user = userEvent.setup();
    await startLevel(user); // 기본값 = 가장 낮은 레벨(입문)
    await submitLevel(user, { correct: false });

    expect(headline()).toBe("이 레벨은 아직 조금 어려워요");
    expect(screen.getByText("여기가 가장 낮은 레벨이에요.")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /확인하기/ })).toBeNull();
    expect(primaryLabels()).toEqual(["입문 코스 시작하기 ›"]);
    expect(screen.getByText("지금 시작한다면 입문(문자) 코스가 좋아요.")).toBeInTheDocument();
  });
});
