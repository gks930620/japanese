// 진단의 **레벨별 표기 규칙** (설계/09 §3-4) — 순수 함수만 둔다.
// 이 파일은 **문항을 만들지 않는다**: 문자 판별 · 지문으로 쓸 수 있나(생성 조건) · 어떻게 적나(표시 방식)뿐이다.
// 문항 구성은 lib/diagnosis.js, 문항 한 개를 만드는 규칙은 lib/quiz.js가 맡는다(09 §3-3 구현 경계표).

const KANJI = /[\u3400-\u4DBF\u4E00-\u9FFF\uF900-\uFAFF]/;
/** 가타카나는 [ァ-ヺ]다 — 「」·〜·。·ー 같은 기호를 가타카나로 세면 N5 문법이 통째로 사라진다 */
const KATAKANA = /[\u30A1-\u30FA]/;
const HIRAGANA = /[\u3041-\u309F]/;
const HANGUL = /[\uAC00-\uD7A3\u3131-\u318E]/;

const test = (pattern, value) => (typeof value === "string" && value.length > 0 ? pattern.test(value) : false);

export function hasKanji(value) {
  return test(KANJI, value);
}

export function hasKatakana(value) {
  return test(KATAKANA, value);
}

export function hasJapanese(value) {
  return hasKanji(value) || hasKatakana(value) || test(HIRAGANA, value);
}

export function hasHangul(value) {
  return test(HANGUL, value);
}

/** 레벨별 규칙표 (09 §3-4). 표는 여기 한 벌뿐이다 */
const SCRIPT_BY_LEVEL = {
  INTRO: { katakanaAllowed: false, kanaMode: "REPLACE", choiceLang: "KO" },
  N5: { katakanaAllowed: false, kanaMode: "REPLACE", choiceLang: "KO" },
  N4: { katakanaAllowed: false, kanaMode: "BOTH", choiceLang: "KO" },
  N3: { katakanaAllowed: true, kanaMode: "BOTH", choiceLang: "KO" },
  N2: { katakanaAllowed: true, kanaMode: "NONE", choiceLang: "JA" },
  N1: { katakanaAllowed: true, kanaMode: "NONE", choiceLang: "JA" },
};

/**
 * 그 레벨의 표기 규칙.
 * 모르는 코드(영어 과정 코드·오타)에는 **가장 엄격한 규칙**을 준다 —
 * 규칙 밖 문자가 화면에 새는 것보다 문항이 몇 개 줄어드는 편이 싸다.
 */
export function levelScript(levelCode) {
  return SCRIPT_BY_LEVEL[levelCode] ?? SCRIPT_BY_LEVEL.N5;
}

/**
 * 단어·문장을 **지문으로 쓸 수 있나**(생성 조건).
 * 못 쓰면 다른 항목을 뽑는다 — 쓸 수 없는 항목을 고쳐 쓰지 않는다.
 */
export function canUseAsPrompt(levelCode, { text, kana } = {}) {
  if (typeof text !== "string" || text.length === 0) return false;
  const { katakanaAllowed, kanaMode } = levelScript(levelCode);

  // kana 줄도 화면에 나오므로 양쪽을 본다
  if (!katakanaAllowed && (hasKatakana(text) || hasKatakana(kana))) return false;
  // REPLACE는 치환할 재료가, BOTH는 병기할 줄이 필요하다. NONE은 kana 줄을 안 그리니 상관없다
  if (kanaMode !== "NONE" && hasKanji(text) && !kana) return false;
  return true;
}

/**
 * 문법 이름을 **지문으로 쓸 수 있나**.
 * `grammar_point.name`에는 읽는 법 데이터가 없다(09 §3-4 제약 2) —
 * 그래서 치환이 필요한 레벨(입문·N5)에서는 한자 이름을 빼는 것이 유일한 해법이고,
 * 병기 레벨(N4·N3)에서는 kana 줄 없이 그대로 쓴다.
 */
export function canUseAsNamePrompt(levelCode, { name } = {}) {
  if (typeof name !== "string" || name.length === 0) return false;
  const { katakanaAllowed, kanaMode } = levelScript(levelCode);

  if (!katakanaAllowed && hasKatakana(name)) return false;
  if (kanaMode === "REPLACE" && hasKanji(name)) return false;
  return true;
}

/**
 * 뽑은 항목을 **어떻게 적나**(표시 방식) — `{ main, kana }`. kana는 병기 줄이고 없으면 null이다.
 * 한자가 없으면 kana 줄을 얹지 않는다 — 같은 글자를 두 줄 적으면 줄만 늘고 읽히는 것은 없다(05 §19-6).
 */
export function renderPrompt(levelCode, { text, kana } = {}) {
  const { kanaMode } = levelScript(levelCode);
  const main = typeof text === "string" ? text : "";

  if (kanaMode === "REPLACE") {
    return { main: hasKanji(main) && kana ? kana : main, kana: null };
  }
  if (kanaMode === "BOTH") {
    return { main, kana: hasKanji(main) && kana ? kana : null };
  }
  return { main, kana: null };
}
