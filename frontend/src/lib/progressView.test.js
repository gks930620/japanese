import { describe, expect, it } from "vitest";
import {
  completedCount,
  courseBadges,
  isUnitCompleted,
  nextUnitNo,
  progressRatio,
  resolveStepIndex,
} from "./progressView.js";

/**
 * 진도 표시 계산 계약 (설계/04_API계약.md §6 (계산 규칙은 설계/01 §8))
 *
 * 홈·코스 목록·코스 상세가 같은 판정을 하므로 계산을 한 곳에 모은다.
 * 서버에 두지 않는 이유: **비로그인도 같은 계산을 localStorage 문서로** 해야 해서,
 * 서버에 두면 규칙이 두 벌이 된다.
 *
 * 배지는 문구가 아니라 코드다 — 문구는 designer의 결정 사항이다(결정기록 C-8).
 *
 * 이 테스트를 수정하지 말 것 — 계약 변경은 senior-dev 경유.
 */

const COURSES = [
  { id: 1, courseNo: 0, status: "PREPARING", unitCount: 0 },
  { id: 2, courseNo: 1, status: "AVAILABLE", unitCount: 20 },
  { id: 3, courseNo: 2, status: "AVAILABLE", unitCount: 20 },
  { id: 4, courseNo: 3, status: "AVAILABLE", unitCount: 25 },
  { id: 5, courseNo: 4, status: "AVAILABLE", unitCount: 25 },
  { id: 6, courseNo: 5, status: "PREPARING", unitCount: 0 },
];

function units(courseId, from, to) {
  const list = [];
  for (let unitNo = from; unitNo <= to; unitNo += 1) {
    list.push({ courseId, unitNo });
  }
  return list;
}

const EMPTY_PROGRESS = { completedUnits: [], lastPosition: null };

describe("progressView — 완료 판정 · 개수", () => {
  it("완료한 유닛만 true다", () => {
    const completed = [{ courseId: 2, unitNo: 3 }];
    expect(isUnitCompleted(completed, 2, 3)).toBe(true);
    expect(isUnitCompleted(completed, 2, 4)).toBe(false);
    expect(isUnitCompleted(completed, 3, 3)).toBe(false);
    expect(isUnitCompleted([], 2, 3)).toBe(false);
  });

  it("코스별 완료 개수를 센다 (AC-P-14)", () => {
    const completed = [...units(2, 1, 7), ...units(3, 1, 2)];
    expect(completedCount(completed, 2)).toBe(7);
    expect(completedCount(completed, 3)).toBe(2);
    expect(completedCount(completed, 4)).toBe(0);
  });

  it("진도 막대 비율은 1에서 멈춘다 (콘텐츠 축소 — 설계/05 §8)", () => {
    expect(progressRatio(0, 20)).toBe(0);
    expect(progressRatio(10, 20)).toBe(0.5);
    expect(progressRatio(21, 20)).toBe(1);
    expect(progressRatio(3, 0)).toBe(0);
  });
});

describe("progressView — 다음에 볼 유닛 (AC-P-15·16·17)", () => {
  it("진도가 없으면 유닛 1이다", () => {
    expect(nextUnitNo([], 2, 20)).toBe(1);
  });

  it("1~7을 완료했으면 유닛 8이다", () => {
    expect(nextUnitNo(units(2, 1, 7), 2, 20)).toBe(8);
  });

  it("유닛 3만 완료하고 1·2를 건너뛰었으면 유닛 1이다 (가장 앞선 미완료)", () => {
    expect(nextUnitNo([{ courseId: 2, unitNo: 3 }], 2, 20)).toBe(1);
  });

  it("전부 완료했으면 null이다 (= 완주)", () => {
    expect(nextUnitNo(units(2, 1, 20), 2, 20)).toBeNull();
  });

  it("다른 코스의 완료는 섞이지 않는다", () => {
    expect(nextUnitNo(units(3, 1, 20), 2, 20)).toBe(1);
  });
});

describe("progressView — 코스 카드 배지 (AC-P-18·19·20·21)", () => {
  it("진도가 하나도 없으면 AVAILABLE 중 courseNo 최솟값이 START다 (현행 규칙 유지)", () => {
    const badges = courseBadges(COURSES, EMPTY_PROGRESS);

    expect(badges[2]).toBe("START");
    expect(badges[3]).toBe("OPEN");
    expect(badges[4]).toBe("OPEN");
    expect(badges[5]).toBe("OPEN");
    expect(badges[1]).toBe("PREPARING");
    expect(badges[6]).toBe("PREPARING");
  });

  it("마지막으로 학습한 코스를 아직 안 끝냈으면 그 코스가 CONTINUE이고 START는 사라진다 (AC-P-18)", () => {
    const badges = courseBadges(COURSES, {
      completedUnits: units(3, 1, 5),
      lastPosition: { courseId: 3, unitNo: 6, stepKey: "kanji", updatedAt: "2026-08-14T09:00:00" },
    });

    expect(badges[3]).toBe("CONTINUE");
    expect(Object.values(badges)).not.toContain("START");
  });

  it("마지막 학습 코스를 완주했으면 그 코스는 DONE, 다음 AVAILABLE 코스가 NEXT다 (AC-P-17)", () => {
    const badges = courseBadges(COURSES, {
      completedUnits: units(2, 1, 20),
      lastPosition: { courseId: 2, unitNo: 20, stepKey: "summary", updatedAt: "2026-08-14T09:00:00" },
    });

    expect(badges[2]).toBe("DONE");
    expect(badges[3]).toBe("NEXT");
    expect(Object.values(badges)).not.toContain("CONTINUE");
  });

  it("준비중 코스는 강조 대상이 아니다 — 다음 AVAILABLE로 건너뛴다", () => {
    const badges = courseBadges(COURSES, {
      completedUnits: units(5, 1, 25),
      lastPosition: { courseId: 5, unitNo: 25, stepKey: "summary", updatedAt: "2026-08-14T09:00:00" },
    });

    expect(badges[5]).toBe("DONE");
    // 다음은 N1(코스 6)인데 PREPARING이므로 아무 카드도 강조하지 않는다
    expect(badges[6]).toBe("PREPARING");
    expect(Object.values(badges)).not.toContain("NEXT");
  });

  it("어떤 상태에서도 강조 카드는 정확히 한 장이다 (AC-P-20)", () => {
    const cases = [
      EMPTY_PROGRESS,
      {
        completedUnits: units(2, 1, 3),
        lastPosition: { courseId: 2, unitNo: 4, stepKey: "vocab", updatedAt: "2026-08-14T09:00:00" },
      },
      {
        completedUnits: units(2, 1, 20),
        lastPosition: { courseId: 2, unitNo: 20, stepKey: "summary", updatedAt: "2026-08-14T09:00:00" },
      },
      // 마지막 위치가 사라진 코스를 가리키는 경우 (콘텐츠 개편)
      // → 마지막 위치를 버리고 "진도가 있는 AVAILABLE 코스 중 courseNo 최솟값"으로 대체한다
      {
        completedUnits: units(2, 1, 3),
        lastPosition: { courseId: 99, unitNo: 1, stepKey: "kanji", updatedAt: "2026-08-14T09:00:00" },
      },
    ];

    cases.forEach((progress, index) => {
      const highlighted = Object.values(courseBadges(COURSES, progress)).filter((badge) =>
        ["CONTINUE", "START", "NEXT"].includes(badge),
      );
      expect(highlighted, `case ${index}`).toHaveLength(1);
    });
  });

  it("마지막 위치가 없어도 진도가 있는 미완주 코스가 CONTINUE가 된다 (강조 카드가 사라지지 않게)", () => {
    const badges = courseBadges(COURSES, { completedUnits: units(3, 1, 4), lastPosition: null });

    expect(badges[3]).toBe("CONTINUE");
    expect(badges[2]).toBe("OPEN");
  });

  it("마지막 위치가 준비중 코스를 가리키면 무시한다 (설계/05 §8)", () => {
    const badges = courseBadges(COURSES, {
      completedUnits: [],
      lastPosition: { courseId: 6, unitNo: 1, stepKey: "kanji", updatedAt: "2026-08-14T09:00:00" },
    });

    expect(badges[6]).toBe("PREPARING");
    expect(badges[2]).toBe("START");
  });
});

describe("progressView — 스텝 복원 (설계/04 §6-2)", () => {
  const STEP_KEYS = ["grammar-0", "grammar-1", "dialog", "kanji", "vocab", "summary"];

  it("저장된 키의 위치를 찾는다 (AC-P-07 — '(4/7)' 표기의 근거)", () => {
    expect(resolveStepIndex(STEP_KEYS, "kanji")).toBe(3);
    expect(resolveStepIndex(STEP_KEYS, "grammar-0")).toBe(0);
    expect(resolveStepIndex(STEP_KEYS, "summary")).toBe(5);
  });

  it("없는 키(콘텐츠 개편으로 사라진 스텝)면 첫 스텝으로 되돌린다", () => {
    expect(resolveStepIndex(STEP_KEYS, "grammar-2")).toBe(0);
    expect(resolveStepIndex(STEP_KEYS, null)).toBe(0);
    expect(resolveStepIndex(STEP_KEYS, "")).toBe(0);
    expect(resolveStepIndex([], "kanji")).toBe(0);
  });
});
