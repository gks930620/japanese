// API 응답 shape → 퀴즈 출제 재료 어댑터 (설계/09 §1-5 — QA 치명 2).
//
// 자료실 어휘 목록(GET /api/library/vocabulary)의 표제어 DTO는 뜻이 **senses[].meaningKo**에 있고
// 최상위 meaningKo가 없다. 유닛 학습 응답의 어휘는 최상위에 있다.
// 두 모양을 여기서 하나로 맞춘다 — lib/quiz.js는 "meaningKo가 있는 항목"만 다루면 된다.

/**
 * @param {object} entry 자료실 표제어 또는 유닛 어휘
 * @returns {object|null} 출제 재료. 뜻을 만들 수 없으면 null(재료에서 조용히 빠진다)
 */
export function toQuizVocabulary(entry) {
  if (!entry) return null;
  if (entry.meaningKo) return entry;

  const meanings = (entry.senses ?? []).map((sense) => sense.meaningKo).filter(Boolean);
  if (meanings.length === 0) return null;

  return {
    id: entry.id,
    word: entry.word,
    kana: entry.kana ?? null,
    partOfSpeech: entry.partOfSpeech,
    // 목록 줄과 같은 표기 규칙 — 뜻이 여러 개면 앞의 둘을 가운뎃점으로 잇는다
    meaningKo: meanings.slice(0, 2).join(" · "),
  };
}

/** 배열용 — 재료가 될 수 없는 항목은 빠진다 */
export function toQuizVocabularies(entries) {
  return (entries ?? []).map(toQuizVocabulary).filter(Boolean);
}
