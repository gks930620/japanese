// frontend-dev 작성 — 영어 자가진단의 선택지 계산 (설계/06 §11-12).
// 채점이 아니라 자기 선택이므로 규칙은 "코스 5개를 학습 순서대로 문장에 붙인다"가 전부다.
// **levelCode만 쓴다** — levelLabel을 가공하지 않는다(설계/05 §16-2).
import { describe, expect, it } from "vitest";
import { enCoursesFixture, coursesFixture } from "../test/apiFixtures.js";
import { canDoChoices } from "./enStart.js";

describe("canDoChoices — can-do 문장 5개", () => {
  it("코스 5개를 레벨 코드 순서(E1→E5)로 준다", () => {
    const choices = canDoChoices(enCoursesFixture());

    expect(choices.map((c) => c.levelCode)).toEqual(["E1", "E2", "E3", "E4", "E5"]);
    expect(choices.map((c) => c.courseId)).toEqual([101, 102, 103, 104, 105]);
  });

  it("응답 순서가 뒤섞여 와도 학습 순서로 세운다", () => {
    const shuffled = [...enCoursesFixture()].reverse();

    expect(canDoChoices(shuffled).map((c) => c.levelCode)).toEqual(["E1", "E2", "E3", "E4", "E5"]);
  });

  it("문장은 코스마다 다르고 비어 있지 않다", () => {
    const sentences = canDoChoices(enCoursesFixture()).map((c) => c.sentence);

    expect(new Set(sentences).size).toBe(5);
    sentences.forEach((s) => expect(s.length).toBeGreaterThan(0));
  });

  it("준비중 코스도 선택지에 남는다 — 코스 상세로 보내고 유닛만 막힌다", () => {
    const choices = canDoChoices(enCoursesFixture());

    expect(choices).toHaveLength(5);
    expect(choices[4].courseId).toBe(105);
  });

  it("일본어 코스가 섞여 들어와도 선택지가 되지 않는다", () => {
    const mixed = [...coursesFixture(), ...enCoursesFixture()];

    expect(canDoChoices(mixed).map((c) => c.levelCode)).toEqual(["E1", "E2", "E3", "E4", "E5"]);
  });

  it("응답이 비어 있으면 선택지도 비어 있다", () => {
    expect(canDoChoices([])).toEqual([]);
    expect(canDoChoices(null)).toEqual([]);
  });
});
