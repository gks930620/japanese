// frontend-dev 작성 — 영어 유닛 확인 문제의 재료 구성.
// 설계/05 §15-1의 규칙(보기 4개 못 채우면 미출제 · 빈칸은 표현이 예문에 실재할 때만 · RNG 주입)은 그대로 두고,
// **한자 자리에 표현이 들어간다**는 것만 다르다. 일본어 세트는 무회귀여야 한다.
import { describe, expect, it } from "vitest";
import { buildUnitQuizSet } from "./quiz.js";
import { enUnitStudyPayload } from "../test/apiFixtures.js";
import { unitStudyPayload } from "../test/helpers.jsx";

/** 고정 RNG — 순수 함수라 결정적이다 */
const rng = (() => {
  let i = 0;
  const values = [0.1, 0.42, 0.77, 0.35, 0.9, 0.05, 0.6, 0.25];
  return () => values[i++ % values.length];
})();

function enMaterial(overrides = {}) {
  const payload = enUnitStudyPayload(overrides);
  return {
    grammars: payload.grammars,
    expressions: payload.expressions,
    vocabularies: payload.vocabularies,
  };
}

/** 보기 4개를 채울 만큼의 재료 — 맛보기 유닛보다 넉넉한 경우 */
function richMaterial() {
  return {
    grammars: Array.from({ length: 4 }, (_, i) => ({
      id: 8000 + i,
      name: `grammar ${i}`,
      nameKo: `문법뜻 ${i}`,
      explanation: "설명",
      examples: [{ id: i, jp: `This is grammar ${i} in a sentence.`, kana: null, meaningKo: `예문 ${i}` }],
      rules: [],
    })),
    expressions: Array.from({ length: 5 }, (_, i) => ({
      id: 8100 + i,
      text: `phrase ${i}`,
      meaningKo: `표현뜻 ${i}`,
      usageNote: null,
      ipa: null,
      koApprox: null,
      examples: [{ id: i, en: `I use phrase ${i} every day.`, meaningKo: `표현 예문 ${i}` }],
    })),
    vocabularies: Array.from({ length: 5 }, (_, i) => ({
      id: 8200 + i,
      word: `word${i}`,
      kana: null,
      ipa: null,
      koApprox: null,
      meaningKo: `단어뜻 ${i}`,
      partOfSpeech: "NOUN",
    })),
  };
}

describe("영어 유닛 세트 — 한자 자리에 표현", () => {
  it("표현 문항이 나온다", () => {
    const set = buildUnitQuizSet(richMaterial(), { rng });

    expect(set.questions.some((q) => q.type.startsWith("EXPRESSION_"))).toBe(true);
  });

  it("한자 문항은 하나도 없다 — 영어에 한자가 없다", () => {
    const set = buildUnitQuizSet(richMaterial(), { rng });

    expect(set.questions.every((q) => !q.type.startsWith("KANJI_"))).toBe(true);
  });

  it("모든 문항의 보기는 4개이고 정답이 그 안에 있다", () => {
    const set = buildUnitQuizSet(richMaterial(), { rng });

    expect(set.questions.length).toBeGreaterThan(0);
    set.questions.forEach((question) => {
      expect(question.choices).toHaveLength(4);
      expect(question.choices[question.answerIndex]).toBeTruthy();
    });
  });

  it("빈칸 문항은 표현이 예문에 실재할 때만 만든다", () => {
    const set = buildUnitQuizSet(richMaterial(), { rng });

    set.questions
      .filter((q) => q.type === "EXPRESSION_CLOZE")
      .forEach((question) => {
        expect(question.prompt.main).toContain("＿＿");
        expect(question.prompt.main).not.toContain(question.evidence.text);
      });
  });

  it("표현이 예문 없이 오면 빈칸 대신 뜻 유형으로 낸다", () => {
    const material = richMaterial();
    material.expressions = material.expressions.map((expression) => ({ ...expression, examples: [] }));

    const set = buildUnitQuizSet(material, { rng });
    const exprQuestions = set.questions.filter((q) => q.type.startsWith("EXPRESSION_"));

    expect(exprQuestions.length).toBeGreaterThan(0);
    expect(exprQuestions.every((q) => q.type !== "EXPRESSION_CLOZE")).toBe(true);
  });

  it("재료가 모자란 맛보기 유닛에서는 만들 수 있는 것만 낸다 — 보기를 못 채우면 미출제", () => {
    const set = buildUnitQuizSet(enMaterial(), { rng });

    // 표현 2개·어휘 2개·문법 1개로는 보기 4개를 채울 수 없다
    set.questions.forEach((question) => expect(question.choices).toHaveLength(4));
    expect(set.questions.length).toBeLessThanOrEqual(10);
  });

  it("오답 풀을 주면 맛보기 유닛에서도 문항이 생긴다", () => {
    const rich = richMaterial();
    const set = buildUnitQuizSet(enMaterial(), {
      rng,
      distractorPool: { expressions: rich.expressions, vocabularies: rich.vocabularies, grammars: rich.grammars },
    });

    expect(set.questions.length).toBeGreaterThan(0);
    set.questions.forEach((question) => expect(question.choices).toHaveLength(4));
  });

  it("일본어 세트는 그대로다 — expressions가 없으면 표현 문항도 없다", () => {
    const payload = unitStudyPayload();
    const set = buildUnitQuizSet(
      { grammars: payload.grammars, kanjis: payload.kanjis, vocabularies: payload.vocabularies },
      { rng },
    );

    expect(set.questions.every((q) => !q.type.startsWith("EXPRESSION_"))).toBe(true);
  });
});
