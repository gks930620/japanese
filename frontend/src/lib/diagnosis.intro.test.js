import { describe, expect, it } from "vitest";
import { STAGE_SIZE, buildStageQuestions, stagePlan } from "./diagnosis.js";
import { coursesFixture } from "../test/apiFixtures.js";

/**
 * 입문이 진단 계단에 들어온다 — **판정 J-5 폐기 가드** (설계/08 §F-13 뒤집힘 절 — TDD Red, senior-dev 2026-09-10)
 *
 * 이 파일은 예전에 정반대를 고정하고 있었다: *"입문은 계단에서 빠진다 — 단계마다 한자 1문항이 필요한데
 * 입문은 한자가 0자다"*(2026-08 판정 J-5). 2026-09 개편으로 **한자 낱자 문항 자체가 진단에서 빠지면서**
 * 그 근거가 통째로 사라졌다(기획 D2-1). 근거가 사라진 규칙은 조용히 지우지 않고 **반대 사실을 고정해 둔다** —
 * 그래야 다음 사람이 "입문은 원래 빠지는 것 아니었나"로 되돌리지 못한다(08 C-18).
 *
 * ★ 계단 구성·통과 판정·표기 규칙은 여기서 고정하지 않는다(08 C-11):
 *   계단·문항·채점 = `diagnosis.test.js` / 표기 = `diagnosisScript.test.js` / 추천 = `diagnosis.recommend.test.js`.
 *   이 파일은 **"한자가 없어도 단계가 성립한다"** 하나만 본다.
 *
 * 이 테스트를 수정하지 말 것 — 계약 변경은 senior-dev 경유.
 */

function seededRng(seed = 1) {
  let state = seed;
  return () => {
    state = (state * 9301 + 49297) % 233280;
    return state / 233280;
  };
}

/** 입문 재료 — 한자는 **한 자도 없다**(전량 가나). 예전 규칙이 단계를 못 만든다고 했던 바로 그 재료다 */
const INTRO_MATERIAL = {
  vocabItems: Array.from({ length: 8 }, (_, i) => ({
    id: i + 1,
    word: `ことば${i + 1}`,
    kana: `ことば${i + 1}`,
    meaningKo: `뜻${i + 1}`,
    partOfSpeech: "NOUN",
  })),
  grammarItems: Array.from({ length: 8 }, (_, i) => ({
    id: 100 + i,
    name: `〜あいさつ${i + 1}`,
    nameKo: `인사말${i + 1}`,
    level: "INTRO",
    hasRules: false,
    examples: [{ id: 900 + i, jp: `これは あいさつ${i + 1}です。`, kana: null, meaningKo: `예문뜻${i + 1}` }],
  })),
};

describe("한자가 0자여도 단계가 만들어진다 (J-5 폐기)", () => {
  it("입문 재료만으로 6문항이 나온다 — 한자 재료를 요구하지 않는다", () => {
    const questions = buildStageQuestions({ levelCode: "INTRO", ...INTRO_MATERIAL, rng: seededRng(1) });
    expect(questions).toHaveLength(STAGE_SIZE);
  });

  it("진단 문항에 한자 낱자 유형(KANJI_*)이 존재하지 않는다 (D2-1)", () => {
    ["INTRO", "N5", "N2"].forEach((levelCode) => {
      const questions = buildStageQuestions({ levelCode, ...INTRO_MATERIAL, rng: seededRng(2) });
      questions.forEach((question) => expect(question.type.startsWith("KANJI")).toBe(false));
    });
  });

  /**
   * ★ 2026-09-14에 여기 있던 단언 하나를 **지웠다**: *"최대 문항 수는 계단에서 파생된다 — 6단계 × 6문항 = 36"*.
   * 근거였던 A1("시작 화면이 최대 단계 수를 말한다")이 무효가 됐다 — 한 번에 치는 것은 **한 레벨뿐**이라
   * 약속할 총량이 없다(A21). 규칙이 사라졌는데 단언만 남으면 화면에 "최대 36문항"을 되살리라는 압력이 된다.
   */
  it("입문이 목록에 들어와 있다 — 레벨 선택지의 첫 줄이다", () => {
    expect(stagePlan(coursesFixture())[0].levelCode).toBe("INTRO");
  });
});
