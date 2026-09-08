// frontend-dev 작성 — QA 치명 2: 자료실 어휘 목록 DTO는 뜻이 senses[]에 있다.
// 그대로 출제 재료로 넘기면 prompt.main이 undefined가 되어 화면이 크래시한다.
import { describe, expect, it } from "vitest";
import { toQuizVocabulary } from "./quizMaterial.js";
import { realVocabEntry } from "../test/realShapes.js";

describe("toQuizVocabulary — 자료실 어휘 표제어 → 출제 재료", () => {
  it("senses[0].meaningKo를 최상위 뜻으로 끌어올린다", () => {
    const entry = realVocabEntry(812, "応援", "おうえん", "응원");

    expect(toQuizVocabulary(entry)).toMatchObject({
      id: 812,
      word: "応援",
      kana: "おうえん",
      meaningKo: "응원",
      partOfSpeech: "NOUN",
    });
  });

  it("뜻이 여러 개면 앞의 두 개를 이어 붙인다 (목록 표기와 같은 규칙)", () => {
    const entry = realVocabEntry(812, "応援", "おうえん", "응원");
    entry.senses.push({ meaningKo: "지원", vocabularyIds: [3024], learnedIn: [] });

    expect(toQuizVocabulary(entry).meaningKo).toBe("응원 · 지원");
  });

  it("이미 최상위 meaningKo가 있는 재료(유닛 응답)는 그대로 둔다", () => {
    const unitVocab = { id: 11, word: "学生", kana: "がくせい", meaningKo: "학생", partOfSpeech: "NOUN" };

    expect(toQuizVocabulary(unitVocab)).toEqual(unitVocab);
  });

  it("뜻을 만들 수 없는 항목은 null이다 (출제 재료에서 조용히 빠진다)", () => {
    expect(toQuizVocabulary({ id: 1, word: "x", kana: null, senses: [] })).toBeNull();
  });
});
