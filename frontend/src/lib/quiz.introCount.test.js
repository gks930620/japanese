import { describe, expect, it } from "vitest";
import { buildUnitQuizSet } from "./quiz.js";

/**
 * 입문 유닛의 확인 문제 수 — **문항 수는 목표가 아니라 배운 재료의 결과다** (2026-08-25 판정 M3)
 *
 * 입문 유닛은 문법 2 · 한자 0 · 어휘 15(kana 없음)라서 확인 문제가 6문제다(다른 코스는 10문제).
 * 감사가 "입문만 영구적으로 40% 짧다"고 지적했지만 **이것은 결함이 아니라 결과**다:
 *   - 한자 4문제 블록은 입문이 한자를 **배우지 않아서** 비는 것이다. 배우지 않은 것으로 문항 수를 채우면
 *     확인 문제가 "배운 것을 확인한다"를 그만두고 **숫자 채우기**가 된다(J-1과 같은 원칙).
 *   - 10문제는 목표가 아니라 **상한**이다(08 §F-14 — 재료가 모자라면 자동으로 줄어드는 구조).
 *   - 어휘를 4문제 넘게 내 빈자리를 메우면 입문 확인 문제가 어휘 편중(6중 4 → 6중 8)이 되어,
 *     유형 균형("한쪽에 몰리면 취향 검사가 된다" — P3의 근거)을 정면으로 깬다.
 *
 * 그래서 **고치지 않는다.** 대신 그 판단을 여기서 코드로 고정한다 — 다음 감사가 같은 지점을
 * 다시 결함으로 올리지 않도록, 그리고 누군가 "빈자리를 채우자"고 바꾸면 이 테스트가 먼저 말하도록.
 *
 * 이 테스트를 수정하지 말 것 — 계약 변경은 senior-dev 경유.
 */

const grammar = (id) => ({
  id,
  name: `〜ます${id}`,
  nameKo: `문법뜻${id}`,
  explanation: "설명",
  examples: [],
  rules: [],
});
// 입문 어휘의 정의 — kana가 없다(문자를 배우는 중이라 읽기 문제를 내지 않는다)
const vocab = (id) => ({ id, word: `ことば${id}`, kana: null, meaningKo: `뜻${id}`, partOfSpeech: "NOUN" });

const INTRO_UNIT = {
  grammars: [grammar(1), grammar(2)],
  kanjis: [], // ★ 입문의 정의
  vocabularies: Array.from({ length: 15 }, (_, i) => vocab(100 + i)),
};

// 오답 풀은 같은 레벨(INTRO)에서 온다 — 2026-08-25 H2 판정 이후의 실제 배선
const POOL = { grammars: Array.from({ length: 8 }, (_, i) => grammar(200 + i)) };

function typeCount(questions) {
  return questions.reduce((acc, q) => {
    const kind = q.type.split("_")[0];
    acc[kind] = (acc[kind] ?? 0) + 1;
    return acc;
  }, {});
}

describe("입문 유닛 확인 문제 (M3 — 고치지 않기로 한 것)", () => {
  it("한자 0자면 한자 문제가 0개다 — 다른 유형으로 대신 채우지 않는다", () => {
    const { questions } = buildUnitQuizSet(INTRO_UNIT, { rng: Math.random, distractorPool: POOL });
    const counts = typeCount(questions);

    expect(counts.KANJI ?? 0).toBe(0);
    expect(counts.GRAMMAR).toBe(2); // 유닛 문법 전부
    expect(counts.VOCAB).toBe(4); // 어휘 상한 그대로 — 빈 한자 자리를 메우지 않는다
    expect(questions).toHaveLength(6);
  });

  it("한자를 배우는 유닛은 10문제 상한까지 찬다 (같은 규칙, 다른 재료)", () => {
    const withKanji = {
      ...INTRO_UNIT,
      grammars: [grammar(1), grammar(2), grammar(3)],
      kanjis: Array.from({ length: 14 }, (_, i) => ({
        id: 300 + i,
        letter: `字${i}`,
        meaningKo: `훈음${i}`,
        onyomi: `オン${i}`,
        kunyomi: null,
        words: [],
      })),
    };

    const { questions } = buildUnitQuizSet(withKanji, { rng: Math.random, distractorPool: POOL });

    expect(questions).toHaveLength(10);
    expect(typeCount(questions).KANJI).toBe(4);
  });
});
