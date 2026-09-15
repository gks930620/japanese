import { describe, expect, it } from "vitest";
import { nextLevelOffer, recordLevelResult, stagePlan } from "./diagnosis.js";
import { coursesFixture } from "../test/apiFixtures.js";

/**
 * 진단 — **한 판의 기록과 이어가기** (설계/09 §3-2-1 · §3-8 — TDD Red, senior-dev 2026-09-14 개편)
 *
 * 기획 `진행사항/기획_2026-09_진단개편.md` D11·D12·D13 / 인수 조건 **A30·A31·A33·A34·A34-1** + 예외 **E23·E24·E25**.
 *
 * ★ 이 파일이 고정하는 것은 **추천이 아니다**(08 C-11). 두 계산은 입력이 다르다:
 *   · 추천(`recommend`) = **지금까지 친 전부** → `diagnosis.recommend.test.js`
 *   · 이어가기(`nextLevelOffer`) = **방금 친 한 판**의 한 칸 위/아래
 *   한 판만 쳤을 때는 둘이 같은 곳을 가리키지만 여러 판을 치면 갈린다 — 합치지 말 것(D14 마지막 항).
 *
 * 이 테스트를 수정하지 말 것 — 계약 변경은 senior-dev 경유.
 */

const COURSES = coursesFixture();
const PLAN = stagePlan(COURSES);

/** 한 판의 기록 한 줄 — 레벨당 하나뿐이다(D13) */
const round = (levelCode, levelLabel, correct, total = 6) => ({ levelCode, levelLabel, correct, total });

const INTRO = round("INTRO", "문자", 6);
const N3_PASS = round("N3", "JLPT N3", 5);
const N2_PASS = round("N2", "JLPT N2", 4);
const N2_FAIL = round("N2", "JLPT N2", 2);
const N1_FAIL = round("N1", "JLPT N1", 0);

const levelsOf = (results) => results.map((result) => result.levelCode);

describe("판 기록 — 레벨당 한 행, 레벨 순 (A30·A31·D12·D13)", () => {
  it("첫 판도 행이 된다 — 한 행짜리 표를 그리기 위한 재료다 (A32)", () => {
    expect(recordLevelResult([], N2_PASS)).toEqual([N2_PASS]);
  });

  /** 친 순서로 두면 `N2 미달 → N3 통과 → N2 통과` 이력이 지그재그로 선다 — 사용자가 순서를 해석해야 한다 */
  it("친 순서가 아니라 레벨 순(낮은 것부터)으로 선다", () => {
    const afterN2 = recordLevelResult([], N2_FAIL);
    const afterN3 = recordLevelResult(afterN2, N3_PASS);

    expect(levelsOf(afterN3)).toEqual(["N3", "N2"]);
    expect(levelsOf(recordLevelResult(afterN3, INTRO))).toEqual(["INTRO", "N3", "N2"]);
  });

  it("같은 레벨을 다시 치면 행이 하나이고 나중 결과로 바뀐다 (E23·E24)", () => {
    const first = recordLevelResult([], N2_FAIL);
    const again = recordLevelResult(first, N2_PASS);

    expect(again).toHaveLength(1);
    expect(again[0]).toEqual(N2_PASS);
  });

  it("앞의 기록을 건드리지 않는다 — 새 배열을 돌려준다", () => {
    const before = recordLevelResult([], N3_PASS);
    const after = recordLevelResult(before, N2_FAIL);

    expect(after).not.toBe(before);
    expect(before).toEqual([N3_PASS]);
  });
});

describe("이어가기 — 방금 친 한 판에서만 나온다 (D11·A33)", () => {
  it("통과하면 한 칸 위를 제안한다", () => {
    const offer = nextLevelOffer({ plan: PLAN, results: [N2_PASS], levelCode: "N2", passed: true });

    expect(offer.status).toBe("OFFER");
    expect(offer.level.levelCode).toBe("N1");
    expect(offer.level.levelLabel).toBe("JLPT N1"); // 버튼 문구는 API 값 그대로다
  });

  it("미달하면 한 칸 아래를 제안한다", () => {
    const offer = nextLevelOffer({ plan: PLAN, results: [N2_FAIL], levelCode: "N2", passed: false });

    expect(offer.status).toBe("OFFER");
    expect(offer.level.levelCode).toBe("N3");
  });

  it("미달했던 레벨은 다시 제안한다 — 다시 도전하는 것은 의미가 있다 (E24)", () => {
    const results = recordLevelResult(recordLevelResult([], N2_FAIL), N3_PASS);
    const offer = nextLevelOffer({ plan: PLAN, results, levelCode: "N3", passed: true });

    expect(offer.status).toBe("OFFER");
    expect(offer.level.levelCode).toBe("N2");
  });

  it("가장 높은 레벨을 통과하면 위가 없다 (E20)", () => {
    const offer = nextLevelOffer({ plan: PLAN, results: [round("N1", "JLPT N1", 6)], levelCode: "N1", passed: true });

    expect(offer.status).toBe("END_OF_LIST");
    expect(offer.level).toBeNull();
  });

  it("가장 낮은 레벨에서 미달하면 아래가 없다 (E21)", () => {
    const offer = nextLevelOffer({
      plan: PLAN,
      results: [round("INTRO", "문자", 1)],
      levelCode: "INTRO",
      passed: false,
    });

    expect(offer.status).toBe("END_OF_LIST");
    expect(offer.level).toBeNull();
  });

  /**
   * ★ `N2 통과 → N1 도전 → N1 미달` 인 사람에게 아래 레벨은 **방금 통과한 N2**다.
   * 이미 증명한 것을 다시 확인하라고 권하는 것이 이 개편이 없애려던 귀찮음 그 자체다(A34-1·E25).
   */
  it("이미 통과한 레벨은 제안하지 않는다 — 끝에 닿은 것과 이유가 다르다", () => {
    const results = recordLevelResult(recordLevelResult([], N2_PASS), N1_FAIL);
    const offer = nextLevelOffer({ plan: PLAN, results, levelCode: "N1", passed: false });

    expect(offer.status).toBe("ALREADY_PASSED");
    expect(offer.level).toBeNull();
  });

  /** 한 칸은 **레벨 목록의 한 칸**이다 — 코스 번호에서 파생하지 않는다(08 C-9) */
  it("준비중 레벨은 목록에 없으므로 한 칸에서 건너뛴다 (E22)", () => {
    const withoutN4 = COURSES.map((course) => (course.levelCode === "N4" ? { ...course, status: "PREPARING" } : course));
    const plan = stagePlan(withoutN4);
    const offer = nextLevelOffer({ plan, results: [round("N5", "JLPT N5", 6)], levelCode: "N5", passed: true });

    expect(offer.status).toBe("OFFER");
    expect(offer.level.levelCode).toBe("N3");
  });

  it("목록에 없는 레벨을 물어도 터지지 않는다 — 제안이 없을 뿐이다", () => {
    const offer = nextLevelOffer({ plan: PLAN, results: [], levelCode: "E1", passed: true });

    expect(offer.level).toBeNull();
  });
});
