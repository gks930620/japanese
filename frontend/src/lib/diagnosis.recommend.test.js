import { describe, expect, it } from "vitest";
import { recommend, stagePlan } from "./diagnosis.js";
import { coursesFixture } from "../test/apiFixtures.js";

/**
 * 진단 추천 — **계단(측정)과 추천(안내)은 다른 목록을 쓴다** (설계/09 §3-2 — 2026-08-25 판정, 감사 높음 1).
 *
 * 판정: **추천 후보 = 입장 가능한 코스 전체(courseNo 순).** 1단계에서 떨어지면 그 첫 코스다.
 *
 * ★ 2026-09-10 개편 이후: 한자 낱자 문항이 빠지면서 **입문도 계단에 들어와**(08 §F-13 뒤집힘 절)
 * 계단과 추천 후보가 거의 같아졌다. 그래도 **두 목록을 하나로 합치지 않는다** —
 * 계단은 "재료로 측정할 수 있는 레벨", 추천은 "보낼 수 있는 코스"라 성격이 다르고,
 * 코스가 계단에 못 들어가는 경우(재료 부족으로 3문항 미만 — E2·E3)는 언제든 다시 생긴다.
 *
 * 통과 판정은 **단계 기록의 `total`을 그대로 쓴다**(`정답 ≥ ceil(total × 2/3)`).
 * 계단 구성·통과 임계값 자체는 `diagnosis.test.js`가 단일 기준이다(08 C-11).
 *
 * 이 테스트를 수정하지 말 것 — 계약 변경은 senior-dev 경유.
 */

const COURSES = coursesFixture();
const INTRO = 1;
const N5 = 2;
const N4 = 3;
const N1 = 6;

/** 6문항 단계의 기록 한 줄 */
const stage = (levelCode, levelLabel, correct) => ({ levelCode, levelLabel, correct, total: 6 });

describe("1단계에서 떨어졌을 때 (감사 높음 1)", () => {
  it("입문 단계에서 미달이면 입문 코스를 추천하고, 더 내려갈 곳은 없다", () => {
    const result = recommend({
      courses: COURSES,
      stageResults: [stage("INTRO", "문자", 3)], // 6문항 중 3 → 미달
    });

    expect(result.recommendedCourseId).toBe(INTRO);
    expect(result.stepDownCourseId).toBeNull();
  });

  it("입문이 준비중이면 계단이 N5부터라, N5 미달에도 준비중 코스를 가리키지 않는다 (P10)", () => {
    const withoutIntro = COURSES.map((course) =>
      course.courseNo === 0 ? { ...course, status: "PREPARING", unitCount: 0 } : course,
    );

    const result = recommend({
      courses: withoutIntro,
      stageResults: [stage("N5", "JLPT N5", 0)],
    });

    expect(result.recommendedCourseId).toBe(N5);
  });
});

describe("통과한 단계가 있으면 그다음 단계 코스 (기존 규칙 유지)", () => {
  it("입문을 통과하고 N5에서 떨어지면 N5를 추천하고, 한 단계 아래는 입문이다", () => {
    const result = recommend({
      courses: COURSES,
      stageResults: [stage("INTRO", "문자", 6), stage("N5", "JLPT N5", 2)],
    });

    expect(result.recommendedCourseId).toBe(N5);
    expect(result.stepDownCourseId).toBe(INTRO);
  });

  it("N5까지 통과하면 N4를 추천한다", () => {
    const result = recommend({
      courses: COURSES,
      stageResults: [stage("INTRO", "문자", 6), stage("N5", "JLPT N5", 4), stage("N4", "JLPT N4", 1)],
    });

    expect(result.recommendedCourseId).toBe(N4);
    expect(result.stepDownCourseId).toBe(N5);
  });

  it("전부 통과하면 가장 높은 공개 코스(N1)를 추천한다", () => {
    const result = recommend({
      courses: COURSES,
      stageResults: stagePlan(COURSES).map((plan) => stage(plan.levelCode, plan.levelLabel, 6)),
    });

    expect(result.recommendedCourseId).toBe(N1);
    expect(result.allPassed).toBe(true);
  });
});

/**
 * ★ 통과선은 **그 단계의 실제 문항 수**로 정해진다(D5). 재료가 모자라 5문항이 나온 단계도
 * 같은 비율(2/3)로 판정되므로, 추천은 기록의 `total`을 그대로 넘겨받아 써야 한다.
 * 여기서 `total`을 무시하고 상수(2 또는 4)로 비교하면 5문항 단계의 판정이 조용히 어긋난다.
 */
describe("판정은 단계의 실제 문항 수를 쓴다 (E5)", () => {
  it("6문항 중 4는 통과 — 다음 단계 코스를 추천한다", () => {
    const result = recommend({ courses: COURSES, stageResults: [stage("INTRO", "문자", 4)] });
    expect(result.recommendedCourseId).toBe(N5);
  });

  it("5문항 중 4는 통과, 3은 미달이다", () => {
    const passed = recommend({
      courses: COURSES,
      stageResults: [{ levelCode: "INTRO", levelLabel: "문자", correct: 4, total: 5 }],
    });
    const failed = recommend({
      courses: COURSES,
      stageResults: [{ levelCode: "INTRO", levelLabel: "문자", correct: 3, total: 5 }],
    });

    expect(passed.recommendedCourseId).toBe(N5);
    expect(failed.recommendedCourseId).toBe(INTRO);
  });
});

describe("추천 대상의 불변 조건", () => {
  it("추천은 준비중 코스를 절대 가리키지 않는다 (P10)", () => {
    const result = recommend({
      courses: COURSES,
      stageResults: [
        stage("INTRO", "문자", 4),
        stage("N5", "JLPT N5", 4),
        stage("N4", "JLPT N4", 4),
        stage("N3", "JLPT N3", 4),
        stage("N2", "JLPT N2", 4),
      ],
    });

    const recommended = COURSES.find((course) => course.id === result.recommendedCourseId);
    expect(recommended.status).toBe("AVAILABLE");
  });

  it("결과에 단계별 정답 수가 그대로 실린다 (A19 — 결과 화면의 근거 표)", () => {
    const stageResults = [stage("INTRO", "문자", 6), stage("N5", "JLPT N5", 1)];

    const result = recommend({ courses: COURSES, stageResults });

    expect(result.stages).toEqual(stageResults);
  });
});
