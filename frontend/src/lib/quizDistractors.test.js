// frontend-dev 작성 — 코드리뷰 Medium 3: VOCAB_MEANING 오답은 **같은 품사 우선**이다(설계/09 §1-3).
// 전체 셔플로 우선순위가 사라지면 동사 문제 보기에 명사·형용사가 섞여 정답이 티 난다.
import { describe, expect, it } from "vitest";
import { buildLibraryQuizSet } from "./quiz.js";

function seededRng(seed = 1) {
  let state = seed;
  return () => {
    state = (state * 9301 + 49297) % 233280;
    return state / 233280;
  };
}

const vocab = (id, word, meaning, pos) => ({ id, word, kana: `かな${id}`, meaningKo: meaning, partOfSpeech: pos });

/** 동사 4개 + 명사 6개 — 동사 문제의 오답은 동사에서만 채울 수 있어야 한다 */
const ITEMS = [
  vocab(1, "行く", "가다", "VERB"),
  vocab(2, "食べる", "먹다", "VERB"),
  vocab(3, "見る", "보다", "VERB"),
  vocab(4, "飲む", "마시다", "VERB"),
  ...Array.from({ length: 6 }, (_, i) => vocab(10 + i, `名詞${i}`, `명사뜻${i}`, "NOUN")),
];

const MEANING_TO_POS = new Map(ITEMS.map((item) => [item.meaningKo, item.partOfSpeech]));

describe("VOCAB_MEANING 오답 풀 (설계/09 §1-3-1)", () => {
  it("같은 품사로 3개를 채울 수 있으면 보기가 전부 같은 품사다", () => {
    for (let seed = 1; seed <= 8; seed += 1) {
      const set = buildLibraryQuizSet({ type: "vocabulary", items: ITEMS, count: 20, rng: seededRng(seed) });
      set.questions
        .filter((q) => q.type === "VOCAB_MEANING")
        .forEach((q) => {
          const answerPos = MEANING_TO_POS.get(q.choices[q.answerIndex]);
          const positions = q.choices.map((c) => MEANING_TO_POS.get(c));
          expect(positions.every((pos) => pos === answerPos)).toBe(true);
        });
    }
  });

  it("같은 품사가 모자라면 다른 품사로 보충한다 (문제를 버리지 않는다)", () => {
    const scarce = [
      vocab(1, "高い", "비싸다", "I_ADJECTIVE"), // 형용사 1개뿐 — 같은 품사 오답이 0개다
      ...Array.from({ length: 5 }, (_, i) => vocab(20 + i, `名詞${i}`, `명사뜻${i}`, "NOUN")),
    ];

    // 유형은 rng가 고르므로 여러 시드에서 형용사의 '뜻' 문제를 모은다
    const found = [];
    for (let seed = 1; seed <= 12; seed += 1) {
      const set = buildLibraryQuizSet({ type: "vocabulary", items: scarce, count: 20, rng: seededRng(seed) });
      set.questions
        .filter((q) => q.type === "VOCAB_MEANING" && q.id === "vocab-meaning-1")
        .forEach((q) => found.push(q));
    }

    expect(found.length).toBeGreaterThan(0);
    found.forEach((q) => {
      expect(q.choices).toHaveLength(4);
      expect(new Set(q.choices).size).toBe(4);
      expect(q.choices).toContain("비싸다");
    });
  });
});
