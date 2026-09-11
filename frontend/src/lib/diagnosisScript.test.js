import { describe, expect, it } from "vitest";
import {
  canUseAsNamePrompt,
  canUseAsPrompt,
  hasHangul,
  hasJapanese,
  hasKanji,
  hasKatakana,
  levelScript,
  renderPrompt,
} from "./diagnosisScript.js";

/**
 * 진단의 **레벨별 표기 규칙** (설계/09 §3-4 — TDD Red, senior-dev 작성 2026-09-10)
 *
 * 기획 `진행사항/기획_2026-09_진단개편.md` D3 / 인수 조건 **A13·A14·A15·A16·A17**.
 *
 * ★ **표기 규칙은 이 파일 하나가 기준이다**(08 C-11). 문항 구성·통과 판정은 `diagnosis.test.js`,
 * 화면 조판은 `설계/05 §15-2`다 — 같은 규칙을 두 곳에서 고정하면 반드시 갈린다.
 *
 * 규칙이 둘로 나뉘어 있다는 것이 이 절의 핵심이다:
 *  · **생성 조건**(`canUseAsPrompt` / `canUseAsNamePrompt`) = "이 항목을 지문으로 쓸 수 있나" → 못 쓰면 다른 항목을 뽑는다
 *  · **표시 방식**(`renderPrompt`) = "뽑은 항목을 화면에 어떻게 적나" → 한 줄로 치환할지, kana 줄을 병기할지
 *
 * 이 테스트를 수정하지 말 것 — 계약 변경은 senior-dev 경유.
 */

// 실제 시드에서 그대로 가져온 값들 — 손으로 지어낸 문자열로 문자 규칙을 고정하지 않는다(08 C-9)
const KANJI_WORD = { text: "学生", kana: "がくせい" };
const KANA_WORD = { text: "みず", kana: "みず" };
const KATAKANA_WORD = { text: "テレビ", kana: null };
const KANJI_SENTENCE = { text: "わたしは 学生です。", kana: "わたしは がくせいです。" };
const KATAKANA_SENTENCE = { text: "わたしは キムです。", kana: null }; // キム가 가타카나다
const KANJI_NAME = "助詞「は」"; // 문법 이름 — 읽는 법 데이터가 없다(09 §3-4 제약 2)
const KANA_NAME = "〜ですか";

describe("문자 판별 — 규칙의 바닥", () => {
  it("한자를 가려낸다", () => {
    expect(hasKanji("学生")).toBe(true);
    expect(hasKanji("わたしは 学生です。")).toBe(true);
    expect(hasKanji("がくせい")).toBe(false);
    expect(hasKanji("テレビ")).toBe(false);
    expect(hasKanji("학생")).toBe(false);
  });

  it("가타카나를 가려낸다 — 「」·〜·。는 가타카나가 아니다", () => {
    expect(hasKatakana("テレビ")).toBe(true);
    expect(hasKatakana("わたしは キムです。")).toBe(true);
    expect(hasKatakana("がくせい")).toBe(false);
    // 문법 이름의 괄호·물결은 기호다 — 이걸 가타카나로 세면 N5 문법이 통째로 사라진다
    expect(hasKatakana(KANJI_NAME)).toBe(false);
    expect(hasKatakana(KANA_NAME)).toBe(false);
  });

  it("일본어/한국어를 가려낸다 — 보기 언어 검사(A17)의 바닥이다", () => {
    expect(hasJapanese("がくせい")).toBe(true);
    expect(hasJapanese("学生")).toBe(true);
    expect(hasJapanese("テレビ")).toBe(true);
    expect(hasJapanese("학생")).toBe(false);
    expect(hasHangul("학생")).toBe(true);
    expect(hasHangul("がくせい")).toBe(false);
  });

  it("빈 값에도 답한다 — 재료에 null이 섞여도 규칙이 터지지 않는다", () => {
    [null, undefined, ""].forEach((value) => {
      expect(hasKanji(value)).toBe(false);
      expect(hasKatakana(value)).toBe(false);
      expect(hasJapanese(value)).toBe(false);
      expect(hasHangul(value)).toBe(false);
    });
  });
});

describe("레벨별 규칙표 (D3 — A13·A14·A16·A17)", () => {
  it("입문·N5 — 가타카나 금지 · 한자는 kana로 치환 · 보기는 한국어", () => {
    ["INTRO", "N5"].forEach((code) => {
      expect(levelScript(code)).toEqual({ katakanaAllowed: false, kanaMode: "REPLACE", choiceLang: "KO" });
    });
  });

  it("N4 — 가타카나 금지 · 한자 + kana 줄 병기 · 보기는 한국어", () => {
    expect(levelScript("N4")).toEqual({ katakanaAllowed: false, kanaMode: "BOTH", choiceLang: "KO" });
  });

  it("N3 — 가타카나 허용 · 한자 + kana 줄 병기 · 보기는 한국어", () => {
    expect(levelScript("N3")).toEqual({ katakanaAllowed: true, kanaMode: "BOTH", choiceLang: "KO" });
  });

  it("N2·N1 — 가타카나 허용 · kana 줄 없음 · 보기도 일본어", () => {
    ["N2", "N1"].forEach((code) => {
      expect(levelScript(code)).toEqual({ katakanaAllowed: true, kanaMode: "NONE", choiceLang: "JA" });
    });
  });

  /**
   * 모르는 코드(영어 과정 코드·오타)에는 **가장 엄격한 규칙**을 준다.
   * 규칙 밖 문자가 화면에 새는 것보다 문항이 몇 개 줄어드는 편이 싸다 —
   * 사용자는 "N5인데 한자가 보인다"는 즉시 발견하지만 "문항이 5개다"는 알아채지 못한다.
   */
  it("알 수 없는 레벨 코드는 가장 엄격한 규칙을 받는다", () => {
    expect(levelScript("E1")).toEqual(levelScript("N5"));
    expect(levelScript(null)).toEqual(levelScript("N5"));
  });
});

describe("생성 조건 — 단어·문장 지문 (A13·A14·A15)", () => {
  it("입문·N5: 가나 단어는 쓰고, 한자 단어는 kana가 있을 때만 쓴다", () => {
    ["INTRO", "N5"].forEach((code) => {
      expect(canUseAsPrompt(code, KANA_WORD)).toBe(true);
      expect(canUseAsPrompt(code, KANJI_WORD)).toBe(true); // kana가 있어 치환할 수 있다
      expect(canUseAsPrompt(code, { text: "学生", kana: null })).toBe(false); // 치환할 재료가 없다
    });
  });

  it("입문·N5·N4: 가타카나가 한 자라도 있으면 지문에서 뺀다 (A14)", () => {
    ["INTRO", "N5", "N4"].forEach((code) => {
      expect(canUseAsPrompt(code, KATAKANA_WORD)).toBe(false);
      expect(canUseAsPrompt(code, KATAKANA_SENTENCE)).toBe(false);
      // kana 줄에만 가타카나가 있어도 화면에 나오므로 똑같이 뺀다
      expect(canUseAsPrompt(code, { text: "こおり", kana: "コーヒー" })).toBe(false);
    });
  });

  it("N3: 가타카나는 허용하지만 한자에는 kana가 있어야 한다 (A15)", () => {
    expect(canUseAsPrompt("N3", KATAKANA_WORD)).toBe(true);
    expect(canUseAsPrompt("N3", KANJI_SENTENCE)).toBe(true);
    expect(canUseAsPrompt("N3", { text: "会社員", kana: null })).toBe(false);
  });

  it("N2·N1: kana 줄을 안 그리므로 kana가 없어도 쓴다 (A16)", () => {
    ["N2", "N1"].forEach((code) => {
      expect(canUseAsPrompt(code, { text: "会社員", kana: null })).toBe(true);
      expect(canUseAsPrompt(code, KATAKANA_WORD)).toBe(true);
    });
  });
});

describe("생성 조건 — 문법 이름 (09 §3-4 제약 2)", () => {
  /**
   * 문법 이름에는 **읽는 법 데이터가 없다**(`grammar_point.name`만 있다).
   * 그래서 kana 줄을 병기할 수 없고, 치환도 못 한다 →
   * 치환이 필요한 레벨(입문·N5)에서는 **한자 이름을 빼는 것**이 유일한 해법이고,
   * 병기 레벨(N4·N3)에서는 **kana 줄 없이 그대로** 보여준다(A15는 단어·문장 지문에 대한 조건이다).
   */
  it("입문·N5: 한자가 든 문법 이름은 지문에서 빠진다 (N5 44개 중 18개만 남는다)", () => {
    ["INTRO", "N5"].forEach((code) => {
      expect(canUseAsNamePrompt(code, { name: KANA_NAME })).toBe(true);
      expect(canUseAsNamePrompt(code, { name: KANJI_NAME })).toBe(false);
      expect(canUseAsNamePrompt(code, { name: "名詞+です" })).toBe(false);
    });
  });

  it("N4·N3: 한자 이름을 그대로 쓴다 — kana 줄이 없다는 이유로 빼지 않는다", () => {
    ["N4", "N3"].forEach((code) => {
      expect(canUseAsNamePrompt(code, { name: KANJI_NAME })).toBe(true);
    });
  });

  it("가타카나 규칙은 문법 이름에도 그대로 적용된다 (A14)", () => {
    expect(canUseAsNamePrompt("N4", { name: "〜チャンス" })).toBe(false);
    expect(canUseAsNamePrompt("N3", { name: "〜チャンス" })).toBe(true);
  });
});

describe("표시 방식 (A13·A15·A16)", () => {
  it("입문·N5: 한자를 kana로 갈아 끼우고 kana 줄은 만들지 않는다", () => {
    expect(renderPrompt("N5", KANJI_WORD)).toEqual({ main: "がくせい", kana: null });
    expect(renderPrompt("N5", KANJI_SENTENCE)).toEqual({ main: "わたしは がくせいです。", kana: null });
    // 한자가 없으면 원문 그대로 — kana가 같은 값이라고 두 줄이 되지 않는다
    expect(renderPrompt("N5", KANA_WORD)).toEqual({ main: "みず", kana: null });
    expect(renderPrompt("INTRO", { text: "おはよう", kana: null })).toEqual({ main: "おはよう", kana: null });
  });

  it("N4·N3: 원문을 두고 kana 줄을 얹는다 — 한자가 없으면 줄을 얹지 않는다", () => {
    ["N4", "N3"].forEach((code) => {
      expect(renderPrompt(code, KANJI_WORD)).toEqual({ main: "学生", kana: "がくせい" });
      expect(renderPrompt(code, KANJI_SENTENCE)).toEqual({
        main: "わたしは 学生です。",
        kana: "わたしは がくせいです。",
      });
      // 같은 글자를 두 줄 적지 않는다 — 줄만 늘고 읽히는 것은 없다(05 §19-6)
      expect(renderPrompt(code, KANA_WORD)).toEqual({ main: "みず", kana: null });
    });
  });

  it("N2·N1: kana 줄이 아예 없다 — 읽기 문항의 정답을 지문에 적어 주지 않는다", () => {
    ["N2", "N1"].forEach((code) => {
      expect(renderPrompt(code, KANJI_WORD)).toEqual({ main: "学生", kana: null });
    });
  });

  it("표시 결과에는 그 레벨이 금지한 문자가 남지 않는다 (A13의 불변 조건)", () => {
    const shown = renderPrompt("N5", KANJI_SENTENCE);
    expect(hasKanji(shown.main)).toBe(false);
    expect(shown.kana).toBeNull();
  });
});
