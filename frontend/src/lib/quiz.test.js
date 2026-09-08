import { describe, expect, it } from "vitest";
import { buildUnitQuizSet, buildLibraryQuizSet, buildRetrySet } from "./quiz.js";

/**
 * 퀴즈 생성 규칙 (설계/05 §15-1 — 스택 공용, TDD Red, senior-dev 작성)
 *
 * 전부 순수 함수 + RNG 주입이라 결정적이다(컨벤션 §6 "랜덤 의존 금지"의 해법).
 * 앱(Flutter)은 이 파일의 시나리오를 같은 규칙의 검증 벡터로 쓴다.
 *
 * 이 테스트를 수정하지 말 것 — 계약 변경은 senior-dev 경유.
 */

/** 결정적 RNG — 고정 수열을 순환한다 */
function seededRng(seed = 1) {
  let state = seed;
  return () => {
    state = (state * 9301 + 49297) % 233280;
    return state / 233280;
  };
}

const kanji = (id, letter, on, kun, meaning, words = []) => ({
  id, letter, onyomi: on, kunyomi: kun, meaningKo: meaning, words,
});
const word = (id, w, kana, meaning) => ({ id, word: w, kana, meaningKo: meaning });
const vocab = (id, w, kana, meaning, pos = "NOUN") => ({ id, word: w, kana, meaningKo: meaning, partOfSpeech: pos });
const grammar = (id, name, nameKo, examples = []) => ({
  id, name, nameKo, explanation: "설명", examples, rules: [],
});
const example = (id, jp, kana, meaning) => ({ id, jp, kana, meaningKo: meaning });

/** 넉넉한 유닛 재료 — 문법 3 · 한자 5 · 어휘 8 */
function richMaterial() {
  return {
    grammars: [
      grammar(1, "〜てから", "~하고 나서", [example(11, "食べてから行く。", "たべてからいく。", "먹고 나서 간다.")]),
      grammar(2, "〜ながら", "~하면서", [example(12, "歩きながら話す。", "あるきながらはなす。", "걸으면서 말한다.")]),
      grammar(3, "〜たい", "~하고 싶다", [example(13, "水が飲みたい。", "みずがのみたい。", "물을 마시고 싶다.")]),
    ],
    kanjis: [
      kanji(21, "人", "ジン", "ひと", "사람 인", [word(211, "人口", "じんこう", "인구")]),
      kanji(22, "山", "サン", "やま", "메 산", [word(221, "火山", "かざん", "화산")]),
      kanji(23, "川", "セン", "かわ", "내 천", [word(231, "河川", "かせん", "하천")]),
      kanji(24, "水", "スイ", "みず", "물 수", [word(241, "水道", "すいどう", "수도")]),
      kanji(25, "火", "カ", "ひ", "불 화", [word(251, "火事", "かじ", "화재")]),
    ],
    vocabularies: [
      vocab(31, "学生", "がくせい", "학생"),
      vocab(32, "先生", "せんせい", "선생님"),
      vocab(33, "会社", "かいしゃ", "회사"),
      vocab(34, "電車", "でんしゃ", "전철"),
      vocab(35, "トイレ", null, "화장실"),
      vocab(36, "食べる", "たべる", "먹다", "VERB"),
      vocab(37, "行く", "いく", "가다", "VERB"),
      vocab(38, "高い", "たかい", "비싸다", "I_ADJECTIVE"),
    ],
  };
}

describe("세트 구성 (Q3·Q4)", () => {
  it("유닛 세트는 최대 10문항이다", () => {
    const set = buildUnitQuizSet(richMaterial(), { rng: seededRng() });
    expect(set.questions.length).toBeLessThanOrEqual(10);
    expect(set.questions.length).toBeGreaterThan(0);
  });

  it("재료가 모자라면 만들 수 있는 만큼만 만든다 — 실제 문항 수가 세트의 사실이다", () => {
    const material = {
      grammars: [],
      kanjis: richMaterial().kanjis.slice(0, 4),
      vocabularies: [],
    };
    const set = buildUnitQuizSet(material, { rng: seededRng() });
    expect(set.questions.length).toBeGreaterThan(0);
    expect(set.questions.length).toBeLessThan(10);
    set.questions.forEach((q) => expect(q.type.startsWith("KANJI_")).toBe(true));
  });

  it("같은 대상이 한 세트에 두 번 나오지 않는다 (Q4)", () => {
    const set = buildUnitQuizSet(richMaterial(), { rng: seededRng(7) });
    const targets = set.questions.map((q) => q.id.replace(/^[a-z-]+-/, ""));
    expect(new Set(targets).size).toBe(targets.length);
  });
});

describe("보기 규칙 (Q5·Q6·Q7)", () => {
  it("모든 문제의 보기는 4개이고 전부 서로 다르다 (Q5)", () => {
    const set = buildUnitQuizSet(richMaterial(), { rng: seededRng(3) });
    set.questions.forEach((q) => {
      expect(q.choices).toHaveLength(4);
      expect(new Set(q.choices).size).toBe(4);
      expect(q.choices[q.answerIndex]).toBeDefined();
    });
  });

  it("정답 자리는 rng에 따라 달라진다 (Q6)", () => {
    // 시드를 바꿔 가며 만들면 answerIndex가 한 자리에 고정되지 않는다
    const positions = new Set();
    for (let seed = 1; seed <= 12; seed++) {
      const set = buildUnitQuizSet(richMaterial(), { rng: seededRng(seed) });
      set.questions.forEach((q) => positions.add(q.answerIndex));
    }
    expect(positions.size).toBeGreaterThan(1);
  });

  it("보기 4개를 못 채우는 문제는 세트에 포함되지 않는다 (Q7)", () => {
    // 한자 2자뿐 — 오답 3개를 못 채우므로 한자 문제가 하나도 안 나온다
    const material = {
      grammars: [],
      kanjis: richMaterial().kanjis.slice(0, 2),
      vocabularies: [],
    };
    const set = buildUnitQuizSet(material, { rng: seededRng() });
    expect(set.questions).toHaveLength(0);
  });

  it("우연히 값이 같은 오답은 버리고 다른 후보로 채운다 (Q5 — 같은 뜻 중복)", () => {
    // 뜻이 같은 어휘 2개 — 보기에 "학생"이 두 번 나오면 안 된다
    const material = {
      grammars: [],
      kanjis: [],
      vocabularies: [
        vocab(41, "学生", "がくせい", "학생"),
        vocab(42, "生徒", "せいと", "학생"),
        vocab(43, "会社", "かいしゃ", "회사"),
        vocab(44, "電車", "でんしゃ", "전철"),
        vocab(45, "先生", "せんせい", "선생님"),
      ],
    };
    const set = buildUnitQuizSet(material, { rng: seededRng(5) });
    set.questions
      .filter((q) => q.type === "VOCAB_MEANING")
      .forEach((q) => expect(new Set(q.choices).size).toBe(4));
  });
});

describe("유형별 출제 가능 조건 (Q8 · kana 계약)", () => {
  it("kana가 없는 어휘는 읽기 문제로 나오지 않는다", () => {
    const set = buildUnitQuizSet(richMaterial(), { rng: seededRng(2) });
    set.questions
      .filter((q) => q.type === "VOCAB_READING")
      .forEach((q) => expect(q.id).not.toContain("-35")); // 35 = トイレ (kana 없음)
  });

  it("예문에 문법 표현이 실제로 들어 있을 때만 빈칸 문제가 나온다 (Q8)", () => {
    const material = {
      grammars: [
        // 예문에 てから 포함 → 빈칸 가능
        grammar(1, "〜てから", "~하고 나서", [example(11, "食べてから行く。", "たべてからいく。", "먹고 나서 간다.")]),
        // 예문에 표현이 없다 → 뜻 유형으로만
        grammar(2, "〜ながら", "~하면서", [example(12, "同時に話す。", "どうじにはなす。", "동시에 말한다.")]),
        grammar(3, "〜たい", "~하고 싶다", [example(13, "水が飲みたい。", "みずがのみたい。", "물을 마시고 싶다.")]),
        grammar(4, "〜すぎる", "너무 ~하다", [example(14, "食べすぎる。", "たべすぎる。", "과식한다.")]),
      ],
      kanjis: [],
      vocabularies: [],
    };
    // 시드를 바꿔 가며 전수 확인 — ながら(id 2)는 어떤 시드에서도 빈칸으로 나오지 않는다
    for (let seed = 1; seed <= 10; seed++) {
      const set = buildUnitQuizSet(material, { rng: seededRng(seed) });
      set.questions
        .filter((q) => q.type === "GRAMMAR_CLOZE")
        .forEach((q) => expect(q.id).not.toBe("grammar-cloze-2"));
    }
  });

  it("빈칸 문제의 지문에는 그 문법 표현이 가려져 있다 (엉뚱한 구멍 금지)", () => {
    const material = {
      grammars: [
        grammar(1, "〜てから", "~하고 나서", [example(11, "食べてから行く。", null, "먹고 나서 간다.")]),
        grammar(2, "〜ながら", "~하면서", [example(12, "歩きながら話す。", null, "걸으면서 말한다.")]),
        grammar(3, "〜たい", "~하고 싶다", [example(13, "水が飲みたい。", null, "물을 마시고 싶다.")]),
        grammar(4, "〜すぎる", "너무 ~하다", [example(14, "食べすぎる。", null, "과식한다.")]),
      ],
      kanjis: [],
      vocabularies: [],
    };
    for (let seed = 1; seed <= 6; seed++) {
      const set = buildUnitQuizSet(material, { rng: seededRng(seed) });
      set.questions
        .filter((q) => q.type === "GRAMMAR_CLOZE" && q.id === "grammar-cloze-1")
        .forEach((q) => {
          expect(q.prompt.main).not.toContain("てから");
          expect(q.prompt.main).toContain("＿"); // 빈칸 표시
        });
    }
  });
});

describe("오답 풀 확장 (설계/05 §15-1)", () => {
  it("유닛 안에서 오답이 모자라면 오답 풀에서 가져온다 — 정답 대상은 제외", () => {
    const material = {
      grammars: [],
      kanjis: [kanji(21, "人", "ジン", "ひと", "사람 인", [])],
      vocabularies: [],
    };
    const pool = {
      kanjis: richMaterial().kanjis, // 21 포함 — 그래도 정답과 같은 항목은 보기에서 제외돼야 한다
      vocabularies: [],
      grammars: [],
    };
    const set = buildUnitQuizSet(material, { distractorPool: pool, rng: seededRng(4) });
    expect(set.questions.length).toBeGreaterThan(0);
    set.questions.forEach((q) => {
      expect(q.choices).toHaveLength(4);
      // 정답 이외의 보기에 정답 값이 다시 나오지 않는다
      const answer = q.choices[q.answerIndex];
      expect(q.choices.filter((c) => c === answer)).toHaveLength(1);
    });
  });
});

describe("세트 갱신 (Q15·Q16)", () => {
  it("다른 rng로 만들면 다른 세트가 나온다 (Q16 — 새 문제로 다시 풀기)", () => {
    const a = buildUnitQuizSet(richMaterial(), { rng: seededRng(1) });
    const b = buildUnitQuizSet(richMaterial(), { rng: seededRng(99) });
    const signature = (set) => JSON.stringify(set.questions.map((q) => [q.id, q.choices]));
    expect(signature(a)).not.toBe(signature(b));
  });

  it("[틀린 문제만 다시 풀기]는 생성이 아니라 기존 세트의 부분집합이다 (Q15)", () => {
    const set = buildUnitQuizSet(richMaterial(), { rng: seededRng(1) });
    const wrongIds = [set.questions[0].id, set.questions[2].id];
    const retry = buildRetrySet(set, wrongIds);
    expect(retry.questions).toHaveLength(2);
    // 같은 문제·같은 보기 그대로다
    expect(retry.questions[0]).toEqual(set.questions[0]);
    expect(retry.questions[1]).toEqual(set.questions[2]);
  });
});

describe("자료실 세트 (Q19~Q21)", () => {
  it("들어온 탭의 유형만 낸다 — 한자 탭이면 KANJI_*뿐", () => {
    const set = buildLibraryQuizSet({
      type: "kanji",
      items: richMaterial().kanjis,
      count: 10,
      rng: seededRng(1),
    });
    expect(set.questions.length).toBeGreaterThan(0);
    set.questions.forEach((q) => expect(q.type.startsWith("KANJI_")).toBe(true));
  });

  it("범위가 4개 미만이면 세트를 만들지 않는다 (Q21의 근거)", () => {
    const set = buildLibraryQuizSet({
      type: "vocabulary",
      items: richMaterial().vocabularies.slice(0, 3),
      count: 10,
      rng: seededRng(1),
    });
    expect(set.questions).toHaveLength(0);
  });

  it("재료가 충분하면 요청한 문항 수를 채운다 (Q20 — 10/20)", () => {
    const many = Array.from({ length: 30 }, (_, i) =>
      vocab(100 + i, `単語${i}`, `たんご${i}`, `뜻${i}`),
    );
    const set = buildLibraryQuizSet({ type: "vocabulary", items: many, count: 20, rng: seededRng(1) });
    expect(set.questions).toHaveLength(20);
  });
});
