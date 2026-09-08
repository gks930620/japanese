import { describe, expect, it } from "vitest";
import { badgeView, isEntryBadge } from "./badgeView.js";

/** 배지 코드 → 문구·클래스·강조 매핑 (설계/05 §8). 계산은 progressView가 하고 여기는 표기만 한다. */
describe("badgeView — 코드 → 문구·클래스", () => {
  it("6종 코드에 정의서의 문구를 붙인다", () => {
    // CONTINUE 배지는 "이어서 학습하기"를 쓰지 않는다 — 카드는 코스 상세로 가는데 홈 버튼과 같은 말을 하면
    // 같은 말·다른 목적지가 된다(결정_2026-09_이어서_확인문제 §1-3 · AC-R-8). 권장 문구 "학습 중인 코스"
    expect(badgeView("CONTINUE").label).toBe("학습 중인 코스");
    expect(badgeView("CONTINUE").label).not.toMatch(/이어서/);
    expect(badgeView("START").label).toBe("여기서 시작하세요");
    expect(badgeView("NEXT").label).toBe("다음 코스를 시작하세요");
    expect(badgeView("DONE").label).toBe("✓ 완주");
    expect(badgeView("OPEN").label).toBe("바로 볼 수 있어요");
    expect(badgeView("PREPARING").label).toBe("준비중");
  });

  it("강조 3종은 같은 톤(.ok)이고 완주는 무채색(.done)이다", () => {
    expect(badgeView("CONTINUE").className).toBe("status-badge ok");
    expect(badgeView("START").className).toBe("status-badge ok");
    expect(badgeView("NEXT").className).toBe("status-badge ok");
    expect(badgeView("DONE").className).toBe("status-badge done");
    expect(badgeView("OPEN").className).toBe("status-badge neutral");
    expect(badgeView("PREPARING").className).toBe("preparing-badge");
  });

  it("모르는 코드는 OPEN으로 떨어진다 (화면이 깨지지 않게)", () => {
    expect(badgeView("WHATEVER").label).toBe("바로 볼 수 있어요");
    expect(badgeView(null).label).toBe("바로 볼 수 있어요");
  });
});

describe("isEntryBadge — 강조는 CONTINUE·START·NEXT에서 파생 (AC-P-20)", () => {
  it("강조 3종만 true", () => {
    expect(isEntryBadge("CONTINUE")).toBe(true);
    expect(isEntryBadge("START")).toBe(true);
    expect(isEntryBadge("NEXT")).toBe(true);
    expect(isEntryBadge("DONE")).toBe(false);
    expect(isEntryBadge("OPEN")).toBe(false);
    expect(isEntryBadge("PREPARING")).toBe(false);
    expect(isEntryBadge(undefined)).toBe(false);
  });
});
