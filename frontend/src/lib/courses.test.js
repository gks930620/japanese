import { describe, expect, it } from "vitest";
import { entryCourseNo } from "./courses.js";

describe("entryCourseNo — 시작점 코스 판별 (설계/05 §3-3, 하드코딩 금지)", () => {
  const courses = [
    { id: 1, courseNo: 0, status: "PREPARING" },
    { id: 2, courseNo: 1, status: "AVAILABLE" },
    { id: 3, courseNo: 2, status: "AVAILABLE" },
    { id: 6, courseNo: 5, status: "PREPARING" },
  ];

  it("AVAILABLE 중 courseNo가 가장 작은 코스가 시작점이다", () => {
    expect(entryCourseNo(courses)).toBe(1);
  });

  it("입문(코스 0)이 열리면 자동으로 그쪽이 시작점이 된다", () => {
    const withIntro = courses.map((c) => (c.courseNo === 0 ? { ...c, status: "AVAILABLE" } : c));
    expect(entryCourseNo(withIntro)).toBe(0);
  });

  it("응답 순서가 뒤섞여도 최솟값으로 판별한다", () => {
    expect(entryCourseNo([...courses].reverse())).toBe(1);
  });

  it("AVAILABLE이 없거나 목록이 비면 null", () => {
    expect(entryCourseNo([{ courseNo: 0, status: "PREPARING" }])).toBeNull();
    expect(entryCourseNo([])).toBeNull();
    expect(entryCourseNo(null)).toBeNull();
  });
});
