// 어휘 품사 라벨 — 단일 출처 (설계/06 §8).
// 설계/04 §3-7은 enum 코드 7종만 내려준다. 한국어 라벨은 서버에 없으므로 여기서만 정의한다.
// 필터 칩과 목록 셀이 같은 상수를 참조한다(두 곳에 문자열을 적으면 어긋난다).
export const PART_OF_SPEECH = [
  { code: "NOUN", label: "명사" },
  { code: "VERB", label: "동사" },
  { code: "I_ADJECTIVE", label: "い형용사" },
  { code: "NA_ADJECTIVE", label: "な형용사" },
  { code: "ADVERB", label: "부사" },
  { code: "CONJUNCTION", label: "접속사" },
  { code: "EXPRESSION", label: "표현" },
];

/**
 * 영어 품사 7종 (설계/06 §11-6) — 일본어의 い·な형용사는 영어에 존재하지 않는다.
 * 라벨 한국어화는 설계/06 §11-6.
 */
export const EN_PART_OF_SPEECH = [
  { code: "NOUN", label: "명사" },
  { code: "VERB", label: "동사" },
  { code: "ADJECTIVE", label: "형용사" },
  { code: "ADVERB", label: "부사" },
  { code: "PREPOSITION", label: "전치사" },
  { code: "CONJUNCTION", label: "접속사" },
  { code: "PHRASE", label: "표현" },
];

/** 언어별 품사 선택지 — 섞으면 서버가 400이다(설계/06 §11-6) */
export function partOfSpeechOptions(lang = "ja") {
  return lang === "en" ? EN_PART_OF_SPEECH : PART_OF_SPEECH;
}

/** 주소 판정용 — 두 언어의 코드 합집합(탭 선택지와 다르다) */
export const PART_OF_SPEECH_CODES = [
  ...new Set([...PART_OF_SPEECH, ...EN_PART_OF_SPEECH].map((item) => item.code)),
];

export function partOfSpeechLabel(code) {
  return [...PART_OF_SPEECH, ...EN_PART_OF_SPEECH].find((item) => item.code === code)?.label ?? code;
}
