// 조사 자동 선택 (2026-08-25 판정 A-L5) — 이름(코스명·닉네임·유닛 제목)을 문장에 넣는 자리는 계속 늘어난다.
// 화면마다 손으로 "은"·"로"를 적으면 "일상 말하기은"이 나온다. 규칙은 여기 한 곳에만 둔다.

/** 숫자의 한국어 읽기 받침 — 1 일·7 칠·8 팔은 ㄹ 받침이라 로/으로 규칙이 갈린다 */
const DIGIT_CODA = { 0: "ㅇ", 1: "ㄹ", 2: "", 3: "ㅁ", 4: "", 5: "", 6: "ㄱ", 7: "ㄹ", 8: "ㄹ", 9: "" };

const PAIRS = {
  "은/는": ["은", "는"],
  "이/가": ["이", "가"],
  "을/를": ["을", "를"],
  "와/과": ["과", "와"],
  "로/으로": ["으로", "로"],
};

/** 판정에 쓸 마지막 글자 — 괄호·따옴표로 끝나면 그 안의 마지막 글자를 본다("초급(JLPT N4)" → "4") */
function lastMeaningfulChar(name) {
  const trimmed = String(name ?? "").trim();
  const stripped = trimmed.replace(/[)\]}>"'」』】〉»]+$/u, "");
  return stripped.slice(-1);
}

/**
 * 받침 정보 — { has: 받침 있음, rieul: ㄹ 받침 }.
 * 판정할 수 없는 글자(영문 등)로 끝나면 받침 없음으로 본다(더 흔하고 어색함이 덜하다).
 */
function coda(name) {
  const char = lastMeaningfulChar(name);
  if (!char) return { has: false, rieul: false };

  const code = char.charCodeAt(0);
  if (code >= 0xac00 && code <= 0xd7a3) {
    const index = (code - 0xac00) % 28;
    return { has: index !== 0, rieul: index === 8 }; // 8 = ㄹ
  }
  if (/[0-9]/.test(char)) {
    const value = DIGIT_CODA[char];
    return { has: value !== "", rieul: value === "ㄹ" };
  }
  return { has: false, rieul: false };
}

/**
 * 이름 뒤에 붙일 조사 하나를 고른다.
 * @param {string} name 코스명·닉네임 등
 * @param {"은/는"|"이/가"|"을/를"|"와/과"|"로/으로"} pair
 */
export function josa(name, pair) {
  const [withCoda, withoutCoda] = PAIRS[pair] ?? PAIRS["은/는"];
  const { has, rieul } = coda(name);
  // 로/으로만 규칙이 다르다 — ㄹ 받침은 받침 없음과 같이 취급한다
  if (pair === "로/으로") return has && !rieul ? withCoda : withoutCoda;
  return has ? withCoda : withoutCoda;
}

/** 이름 + 조사를 한 덩이로 — 문장에 그대로 끼운다 */
export function withJosa(name, pair) {
  return `${name ?? ""}${josa(name, pair)}`;
}
