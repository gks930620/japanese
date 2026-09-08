import { describe, expect, it } from "vitest";
import { recommend, stagePlan } from "./diagnosis.js";
import { coursesFixture } from "../test/apiFixtures.js";

/**
 * 진단 추천 — **계단(측정)과 추천(안내)은 다른 목록을 쓴다** (2026-08-25 판정, 감사 높음 1).
 *
 * 계단은 "측정할 수 있는 레벨"만 쓴다 — 단계마다 한자 1문항이 필요한데 입문은 한자가 0자다(설계/06 §2·§6).
 * 그런데 **추천까지 계단 안에서만 고르면**, 1단계(N5)에서 떨어진 사람에게 다시 N5를 권하게 된다 —
 * 히라가나를 모르는 사람이 입문을 건너뛴다. 계단에 없다고 해서 **추천 대상에서까지 빠질 이유는 없다.**
 *
 * 판정: **추천 후보 = 입장 가능한 코스 전체(courseNo 순).** 1단계 탈락이면 그 첫 코스(지금은 입문)다.
 *
 * 이 테스트를 수정하지 말 것 — 계약 변경은 senior-dev 경유.
 */

const COURSES = coursesFixture();
const INTRO = 1;
const N5 = 2;
const N4 = 3;
const N1 = 6;

describe("1단계 탈락 — 계단 아래의 코스를 추천한다 (감사 높음 1)", () => {
  it("N5 단계에서 떨어지면 입문을 추천한다 (N5를 다시 권하지 않는다)", () => {
    const result = recommend({
      courses: COURSES,
      stageResults: [{ levelCode: "N5", levelLabel: "JLPT N5", correct: 1, total: 3 }],
    });

    expect(result.recommendedCourseId).toBe(INTRO);
    // 첫 코스 아래로는 더 내려갈 곳이 없다
    expect(result.stepDownCourseId).toBeNull();
  });

  it("입문이 준비중이면 계단 첫 코스(N5)로 되돌아간다 — 준비중은 절대 추천하지 않는다 (P10)", () => {
    const withoutIntro = COURSES.map((course) =>
      course.courseNo === 0 ? { ...course, status: "PREPARING", unitCount: 0 } : course,
    );

    const result = recommend({
      courses: withoutIntro,
      stageResults: [{ levelCode: "N5", levelLabel: "JLPT N5", correct: 0, total: 3 }],
    });

    expect(result.recommendedCourseId).toBe(N5);
  });
});

describe("통과한 단계가 있으면 그다음 단계 코스 (기존 규칙 유지)", () => {
  it("N5까지 통과하면 N4를 추천하고, 한 단계 아래는 N5다", () => {
    const result = recommend({
      courses: COURSES,
      stageResults: [
        { levelCode: "N5", levelLabel: "JLPT N5", correct: 3, total: 3 },
        { levelCode: "N4", levelLabel: "JLPT N4", correct: 1, total: 3 },
      ],
    });

    expect(result.recommendedCourseId).toBe(N4);
    expect(result.stepDownCourseId).toBe(N5);
  });

  it("전부 통과하면 가장 높은 공개 코스(N1)를 추천한다", () => {
    const result = recommend({
      courses: COURSES,
      stageResults: stagePlan(COURSES).map((stage) => ({
        levelCode: stage.levelCode,
        levelLabel: stage.levelLabel,
        correct: 3,
        total: 3,
      })),
    });

    expect(result.recommendedCourseId).toBe(N1);
    expect(result.allPassed).toBe(true);
  });
});

describe("계단은 그대로 — 입문은 측정 단계가 아니다", () => {
  it("입문이 열려 있어도 계단은 N5부터다 (한자 0자라 단계를 만들 수 없다)", () => {
    expect(stagePlan(COURSES).map((stage) => stage.levelCode)).toEqual(["N5", "N4", "N3", "N2", "N1"]);
  });
});

/**
 * ↓ `diagnosis.test.js`에 있던 추천 판정 2건을 여기로 옮겼다(2026-08-25).
 * 추천 규칙을 두 파일이 각각 고정한 탓에 "1단계 탈락 → 무엇을 추천하나"가 갈라졌다 —
 * `recommend()`의 계약은 **이 파일 하나**가 기준이다. `diagnosis.test.js`는 측정 규칙만 맡는다.
 */
describe("추천 대상의 불변 조건", () => {
  it("추천은 준비중 코스를 절대 가리키지 않는다 (P10)", () => {
    // 통과 여부와 무관하게 추천 대상은 항상 AVAILABLE이다
    const result = recommend({
      courses: COURSES,
      stageResults: [
        { levelCode: "N5", levelLabel: "JLPT N5", correct: 2, total: 3 },
        { levelCode: "N4", levelLabel: "JLPT N4", correct: 2, total: 3 },
        { levelCode: "N3", levelLabel: "JLPT N3", correct: 2, total: 3 },
        { levelCode: "N2", levelLabel: "JLPT N2", correct: 2, total: 3 },
      ],
    });

    const recommended = COURSES.find((course) => course.id === result.recommendedCourseId);
    expect(recommended.status).toBe("AVAILABLE");
  });

  it("결과에 단계별 정답 수가 그대로 실린다 (P9 — 결과 화면의 근거 표)", () => {
    const stageResults = [
      { levelCode: "N5", levelLabel: "JLPT N5", correct: 3, total: 3 },
      { levelCode: "N4", levelLabel: "JLPT N4", correct: 0, total: 3 },
    ];

    const result = recommend({ courses: COURSES, stageResults });

    expect(result.stages).toEqual(stageResults);
  });
});
