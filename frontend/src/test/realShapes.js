// 실제 API 응답 shape 픽스처 (QA 판정 반영).
// 이전 테스트가 통과하고도 배선이 깨진 이유는 픽스처가 실제 응답과 달랐기 때문이다.
// 여기 값은 실제 응답에서 그대로 옮긴 형태다 — 새 테스트는 이 파일을 쓴다.
import { coursesFixture } from "./apiFixtures.js";

/**
 * GET /api/courses — 픽스처 원본은 apiFixtures 하나다(08 C-9). 여기선 앞 3개(입문·N5·N4)만 쓴다.
 * 서버가 levelCode를 주기 시작했으므로(설계/04 §2-3) 그 값도 원본에서 그대로 따라온다.
 */
export const REAL_COURSES = coursesFixture().slice(0, 3);

/** GET /api/library/vocabulary — 뜻은 senses[].meaningKo에 있고 **최상위 meaningKo가 없다** */
export function realVocabEntry(id, word, kana, meaning, partOfSpeech = "NOUN") {
  return {
    id,
    word,
    kana,
    partOfSpeech,
    levels: ["N5"],
    senses: [
      {
        meaningKo: meaning,
        vocabularyIds: [id],
        learnedIn: [{ courseId: 2, courseTitle: "왕초보", level: "N5", unitNo: 3, unitTitle: "유닛" }],
      },
    ],
  };
}

/** GET /api/library/kanji — 목록 항목(상세와 달리 words가 없다) */
export function realKanjiItem(id, letter, meaning, onyomi = "オン", kunyomi = null) {
  return { id, letter, meaningKo: meaning, onyomi, kunyomi, level: "N5" };
}

/** GET /api/library/grammar — 목록 항목(examples·rules가 없다) */
export function realGrammarItem(id, name, nameKo, hasRules = false) {
  return { id, name, nameKo, level: "N5", hasRules };
}

/** LibraryPageResponse */
export function realLibraryPage(content, totalElements = content.length) {
  return {
    content,
    page: 0,
    size: content.length,
    totalElements,
    totalAll: totalElements,
    totalPages: Math.max(1, Math.ceil(totalElements / Math.max(1, content.length))),
    first: true,
    last: true,
  };
}
