// TDD Red — senior-dev 작성 (2026-11-14, qa 결함 3)
//
// ── 무엇이 문제였나 ──────────────────────────────────────────────────
// 영어만 공부한 사람이 **일본어** 코스 목록에서 "지금 코스가 너무 쉽거나 어렵나요?"(= 진도 있음 배너)를 본다.
// `CoursesPage`의 `hasProgress`가 진도 문서 **전체**(completedUnits.length > 0 || lastPosition != null)를 보기 때문이다.
// 같은 화면의 입문 카드는 "여기서 시작하세요"(= 진도 없음 판정)라 **띠와 배지가 서로 다른 말을 한다** —
// 배지 계산(`courseBadges`)은 이미 **그 화면의 코스 목록 안에서만** 판정하고 있었다.
//
// ── 계약 (senior-dev, 작업자(AI)_문서/04 §6-1 "진도 배너 판정은 과정별이다") ──
//   hasProgressIn(progress, courses) = 그 목록에 있는 코스의 완료 유닛이 하나라도 있거나,
//                                      lastPosition이 그 목록의 코스를 가리킨다
// 띠와 배지가 **같은 재료**(그 화면이 들고 있는 목록)로 판정해야 둘이 갈리지 않는다.
//
// ⚠️ **"마지막 위치는 사이트 전체에 하나"(01 §10-4)를 뒤집는 것이 아니다.** 저장 문서는 그대로 하나이고,
// 홈·마이페이지의 이어보기(`lib/resume.js`)는 두 과정 목록을 다 받아 어느 쪽이든 가리킨다.
// 여기서 바꾸는 것은 **한 과정만 보여주는 화면의 배너 판정**뿐이다.
//
// 이 테스트를 수정하지 말 것 — 계약 변경은 senior-dev 경유 (CLAUDE.md TDD 규칙 2).
import { describe, expect, it } from "vitest";
import { hasProgressIn } from "./progressView.js";

const JA = [
  { id: 1, courseNo: 0, status: "AVAILABLE", unitCount: 10 },
  { id: 2, courseNo: 1, status: "AVAILABLE", unitCount: 20 },
];
const EN = [{ id: 102, courseNo: 2, status: "AVAILABLE", unitCount: 5 }];

describe("hasProgressIn — 진도 판정은 그 화면의 과정 안에서 (qa 결함 3)", () => {
  it("영어만 공부한 사람의 일본어 목록은 '진도 없음'이다", () => {
    const progress = { completedUnits: [{ courseId: 102, unitNo: 1 }], lastPosition: { courseId: 102, unitNo: 2 } };

    expect(hasProgressIn(progress, JA)).toBe(false);
    expect(hasProgressIn(progress, EN)).toBe(true);
  });

  it("그 과정에 완료 유닛이 있으면 진도 있음 — 마지막 위치가 다른 과정이어도 그렇다", () => {
    const progress = { completedUnits: [{ courseId: 2, unitNo: 1 }], lastPosition: { courseId: 102, unitNo: 2 } };

    expect(hasProgressIn(progress, JA)).toBe(true);
  });

  it("마지막 위치만 그 과정에 있어도 진도 있음 — 한 유닛도 안 마쳤어도 '보던 중'이다", () => {
    const progress = { completedUnits: [], lastPosition: { courseId: 2, unitNo: 3 } };

    expect(hasProgressIn(progress, JA)).toBe(true);
  });

  it("목록에 없는 코스(사라졌거나 아직 안 온 목록)는 진도로 치지 않는다", () => {
    const progress = { completedUnits: [{ courseId: 999, unitNo: 1 }], lastPosition: { courseId: 999, unitNo: 1 } };

    expect(hasProgressIn(progress, JA)).toBe(false);
    expect(hasProgressIn(progress, [])).toBe(false);
  });

  it("진도도 목록도 비어 있으면 거짓 — 입력이 없을 때 터지지 않는다", () => {
    expect(hasProgressIn({ completedUnits: [], lastPosition: null }, JA)).toBe(false);
    expect(hasProgressIn(null, JA)).toBe(false);
    expect(hasProgressIn({ completedUnits: [{ courseId: 2, unitNo: 1 }], lastPosition: null }, null)).toBe(false);
  });
});
