import { describe, expect, it } from "vitest";
import { stagePlan } from "./diagnosis.js";
import { coursesFixture } from "../test/apiFixtures.js";

/**
 * 입문 개통이 실력 진단에 미치는 파급 (설계/05 §15-2 · 설계/06 §2·§6 (판정 J-5) — TDD Red, senior-dev 작성)
 *
 * 진단은 단계당 **어휘 1 · 한자 1 · 문법 1 고정**이다(P3). 입문이 AVAILABLE이 되는 순간
 * 1단계가 입문이 되는데 **한자 재료가 0건**이라 그 단계를 구성할 수 없다 —
 * 기획서가 놓친 파급이고, 그대로 두면 진단 첫 화면이 깨진다.
 *
 * 판정: **계단은 "한자 자료실 레벨 선택지에 있는 코드"만 쓴다.** 입문은 빠진다.
 * 기능은 죽지 않는다 — "1단계도 통과 못 함 → 입장 가능한 첫 코스"가 입문을 가리킨다.
 *
 * 이 테스트를 수정하지 말 것 — 계약 변경은 senior-dev 경유.
 */

/** 입문·N1이 열린 상태(4단계 이후의 실제 코스 구성) */
function openedCourses() {
  return coursesFixture().map((course) => ({
    ...course,
    status: "AVAILABLE",
    levelCode: { 0: "INTRO", 1: "N5", 2: "N4", 3: "N3", 4: "N2", 5: "N1" }[course.courseNo],
  }));
}

describe("입문은 진단 계단에서 빠진다 (J-5)", () => {
  it("입문이 열려도 계단은 N5부터 시작한다", () => {
    const plan = stagePlan(openedCourses());
    expect(plan[0].levelCode).toBe("N5");
    expect(plan.map((s) => s.levelCode)).not.toContain("INTRO");
  });

  it("N1이 열리면 계단이 5단계가 된다 — 최대 문항 수는 상수가 아니라 계산값이다", () => {
    const plan = stagePlan(openedCourses());
    expect(plan.map((s) => s.levelCode)).toEqual(["N5", "N4", "N3", "N2", "N1"]);
    expect(plan.length * 3).toBe(15);
  });

  it("입문만 열려 있으면 계단이 비어 진단 배너가 뜨지 않는다", () => {
    const onlyIntro = openedCourses().map((course) =>
      course.courseNo === 0 ? course : { ...course, status: "PREPARING" },
    );
    expect(stagePlan(onlyIntro)).toEqual([]);
  });

  it("한자 재료가 없는 코스는 levelCode가 있어도 계단에 넣지 않는다", () => {
    // INTRO는 유효한 자료실 코드지만 한자 자료실 선택지에는 없다 — 그것이 판정 기준이다
    const plan = stagePlan(openedCourses());
    plan.forEach((stage) => expect(["N5", "N4", "N3", "N2", "N1"]).toContain(stage.levelCode));
  });
});
