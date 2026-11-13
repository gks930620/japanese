// TDD Red — senior-dev 작성 (2026-11-14, qa 결함 1·2)
//
// ── 무엇이 문제였나 ──────────────────────────────────────────────────
// "완주"와 "열린 데까지의 끝"을 가르는 규칙(작업자(AI)_문서/04 §2-3-A)이 **유닛 학습 화면에만** 있었다.
// 코스 목록·코스 상세·홈·마이페이지는 응답에 계획 수가 없어 판정할 수조차 없었고,
// 그래서 E2(계획 20 중 일부 공개)에서 코스 카드가 5/5 = 100% 막대와 "✓ 완주" 배지를 띄웠다.
//
// ── 계약 (senior-dev, 작업자(AI)_문서/04 §2-3-B) ─────────────────────
// 코스 목록·상세 응답에 `plannedUnitCount: Integer|null`이 실린다(null = 계획값 없음 = 지금 있는 유닛이 전부).
// 판정식은 **화면마다 다시 쓰지 않는다** — 이 결함의 뿌리가 "규칙이 한 화면에만 있었다"이기 때문이다.
// `lib/progressView.js`가 순수 함수 두 개로 들고 있고, 유닛 화면과 코스 화면이 **같은 함수**를 부른다:
//
//   moreUnitsComing(openUnits, plannedUnits) = plannedUnits != null && openUnits < plannedUnits
//   courseUnitTotal(course)                  = course.plannedUnitCount ?? course.unitCount ?? 0   // 진도 막대의 분모
//
// 인자를 코스 객체가 아니라 **숫자 둘**로 받는 이유: 유닛 응답은 (`totalUnits`, `coursePlannedUnits`),
// 코스 응답은 (`unitCount`, `plannedUnitCount`)로 **이름이 다르다**(주어가 다르기 때문 — §2-3-B).
// 객체를 받으면 두 모양 중 하나만 알게 되고, 그 순간 판정이 또 두 벌이 된다.
//
// ⚠️ **일본어는 한 줄도 바뀌지 않아야 한다** — `plannedUnitCount`가 null이면 지금 동작 그대로다. 그것이 회귀 방어선이다.
//
// 이 테스트를 수정하지 말 것 — 계약 변경은 senior-dev 경유 (CLAUDE.md TDD 규칙 2).
import { describe, expect, it } from "vitest";
import { courseBadges, courseUnitTotal, moreUnitsComing } from "./progressView.js";

/** 부분 공개 코스 — 열린 5 / 계획 20 (E2가 지금 그렇다) */
const PARTLY_PUBLISHED = { id: 102, courseNo: 2, status: "AVAILABLE", unitCount: 5, plannedUnitCount: 20 };

/** 계획을 채운 코스 — 열린 15 / 계획 15 (E1) */
const PLAN_MET = { id: 101, courseNo: 1, status: "AVAILABLE", unitCount: 15, plannedUnitCount: 15 };

/** 계획을 선언한 적 없는 코스 — 일본어 전부 */
const NO_PLAN = { id: 2, courseNo: 1, status: "AVAILABLE", unitCount: 20, plannedUnitCount: null };

const units = (courseId, from, to) => {
  const list = [];
  for (let unitNo = from; unitNo <= to; unitNo += 1) list.push({ courseId, unitNo });
  return list;
};

describe("moreUnitsComing — 아직 채우는 중인가 (작업자(AI)_문서/04 §2-3-A 판정식)", () => {
  it("계획이 열린 수보다 많으면 참", () => {
    expect(moreUnitsComing(5, 20)).toBe(true);
  });

  it("계획값이 없으면(null·undefined) 거짓 — 지금 있는 유닛이 전부다", () => {
    expect(moreUnitsComing(20, null)).toBe(false);
    expect(moreUnitsComing(20, undefined)).toBe(false);
  });

  it("계획을 채우면 거짓 — 사람이 플래그를 내리지 않아도 완주로 넘어간다", () => {
    expect(moreUnitsComing(15, 15)).toBe(false);
  });

  it("열린 수가 계획을 넘어도 거짓 — 숫자가 어긋난 시드에서 '채우는 중'이라고 말하지 않는다", () => {
    expect(moreUnitsComing(20, 15)).toBe(false);
  });
});

describe("courseUnitTotal — 진도 막대의 분모 (작업자(AI)_문서/04 §6-1)", () => {
  it("계획이 있으면 계획 수가 분모다 — 열린 수를 분모로 쓰면 5/5 = 100%가 되어 막대가 '완주'를 대신 말한다", () => {
    expect(courseUnitTotal(PARTLY_PUBLISHED)).toBe(20);
  });

  it("계획이 없으면 열린 유닛 수 그대로 — 일본어는 지금과 같다", () => {
    expect(courseUnitTotal(NO_PLAN)).toBe(20);
  });

  it("둘 다 없으면 0 — 준비중 코스에서 막대를 그리지 않는 판정이 그대로 선다", () => {
    expect(courseUnitTotal({ status: "PREPARING" })).toBe(0);
  });
});

describe("코스 카드 배지 — 부분 공개 코스는 완주가 아니다 (qa 결함 1)", () => {
  it("열린 유닛을 다 마쳐도 DONE이 아니다 — 계획이 남아 있다", () => {
    const progress = { completedUnits: units(102, 1, 5), lastPosition: { courseId: 102, unitNo: 5 } };
    const badges = courseBadges([PARTLY_PUBLISHED], progress);

    expect(badges[102]).not.toBe("DONE");
    // 끝난 코스가 아니므로 "학습 중"이다 — 배지 문구는 designer의 것이고 계약은 코드다(08 C-8)
    expect(badges[102]).toBe("CONTINUE");
  });

  it("계획을 채운 코스는 다 마치면 DONE이다 — 개수가 같아지는 순간 저절로 넘어간다", () => {
    const progress = { completedUnits: units(101, 1, 15), lastPosition: { courseId: 101, unitNo: 15 } };
    expect(courseBadges([PLAN_MET], progress)[101]).toBe("DONE");
  });

  it("계획이 없는 코스(일본어)는 지금 그대로 DONE이다 — 회귀 방어선", () => {
    const progress = { completedUnits: units(2, 1, 20), lastPosition: { courseId: 2, unitNo: 20 } };
    expect(courseBadges([NO_PLAN], progress)[2]).toBe("DONE");
  });

  it("부분 공개 코스를 다 봤다고 다음 코스가 NEXT로 넘어가지 않는다 — 앞 코스가 아직 안 끝났다", () => {
    const next = { id: 103, courseNo: 3, status: "AVAILABLE", unitCount: 10, plannedUnitCount: null };
    const progress = { completedUnits: units(102, 1, 5), lastPosition: { courseId: 102, unitNo: 5 } };
    const badges = courseBadges([PARTLY_PUBLISHED, next], progress);

    expect(badges[103]).not.toBe("NEXT");
  });
});
