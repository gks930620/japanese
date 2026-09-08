import { describe, expect, it } from "vitest";
import { stagePlan, isStagePassed, buildStageQuestions } from "./diagnosis.js";
import { coursesFixture } from "../test/apiFixtures.js";
/**
 * 실력 진단 규칙 (설계/09 §3-1 — TDD Red, senior-dev 작성)
 *
 * 계단식: 낮은 레벨부터 단계당 3문항(어휘1·한자1·문법1), 3중 2 통과 → 다음 단계, 미달 → 즉시 종료.
 * 이 파일은 **측정 규칙**만 고정한다 — 추천 판정은 `diagnosis.recommend.test.js`가 단일 기준이다(파일 끝 주석).
 * 코스명·레벨 하드코딩 금지(08 C-6)는 두 파일 공통이다.
 *
 * 이 테스트를 수정하지 말 것 — 계약 변경은 senior-dev 경유.
 */

// ★ 픽스처는 **실제 응답 shape**에서 온다(설계/08 C-9) — levelLabel은 "JLPT N5"이고 입문은 "문자"다.
// 손으로 "N5"라고 지어내면 lib은 초록인데 제품은 필터가 빈 결과를 준다(3단계 qa 치명 ①).
const COURSES = coursesFixture();

function seededRng(seed = 1) {
  let state = seed;
  return () => {
    state = (state * 9301 + 49297) % 233280;
    return state / 233280;
  };
}

const vocab = (id) => ({ id, word: `単語${id}`, kana: `たんご${id}`, meaningKo: `뜻${id}`, partOfSpeech: "NOUN" });
const kanji = (id) => ({ id, letter: `字${id}`, onyomi: `オン${id}`, kunyomi: null, meaningKo: `훈음${id}`, words: [] });
const grammar = (id) => ({ id, name: `〜文法${id}`, nameKo: `문법뜻${id}`, explanation: "설명", examples: [], rules: [] });

const MATERIAL = {
  vocabItems: [vocab(1), vocab(2), vocab(3), vocab(4), vocab(5)],
  kanjiItems: [kanji(11), kanji(12), kanji(13), kanji(14), kanji(15)],
  grammarItems: [grammar(21), grammar(22), grammar(23), grammar(24)],
};

describe("단계 계획 (P3 · 코스 비하드코딩 · 레벨 표기 이원화)", () => {
  it("입장 가능한 코스를 낮은 순으로 계단 삼는다 — 준비중 제외", () => {
    // 계단은 "한자가 있는 코스"다 — 입문은 한자 0자라 빠지고, 나머지 개통 코스가 전부 들어온다
    expect(stagePlan(COURSES).map((s) => s.title)).toEqual(["왕초보", "초급", "중급", "중상급", "고급"]);
  });

  /**
   * ★ 3단계 qa 치명 ①의 근본 — 레벨 표기는 두 가지다.
   * `levelLabel`("JLPT N5")은 **표시 문구**이고, 자료실 `level` 파라미터는 **코드**("N5")다.
   * 계단은 자료실을 조회할 것이므로 **코드를 함께 내려야** 한다 — 화면이 문구를 필터에 넘기면
   * 전 단계가 0문항이 된다(그때 lib 테스트는 초록이었다).
   */
  it("각 단계는 courseNo에서 파생한 자료실 레벨 코드를 함께 준다", () => {
    expect(stagePlan(COURSES).map((s) => s.levelCode)).toEqual(["N5", "N4", "N3", "N2", "N1"]);
    // 표시 문구는 문구대로 남는다(결과 화면의 근거 표가 쓴다)
    expect(stagePlan(COURSES)[0].levelLabel).toBe("JLPT N5");
  });

  it("자료실 레벨 코드가 없는 코스(입문)는 계단에서 빠진다", () => {
    // 입문의 levelLabel은 "문자"라 N 코드가 아예 없다 — 문자열을 잘라 만들 수 없다는 증거다
    const withIntro = COURSES.map((c) => (c.courseNo === 0 ? { ...c, status: "AVAILABLE" } : c));
    expect(stagePlan(withIntro).map((s) => s.levelCode)).toEqual(["N5", "N4", "N3", "N2", "N1"]);
  });

  it("공개 코스가 하나도 없으면 빈 계단이다 (배너 미노출의 근거)", () => {
    const allPreparing = COURSES.map((c) => ({ ...c, status: "PREPARING" }));
    expect(stagePlan(allPreparing)).toEqual([]);
  });
});

describe("단계 문항 (P3)", () => {
  it("단계당 3문항 = 어휘 1 · 한자 1 · 문법 1", () => {
    const questions = buildStageQuestions({ ...MATERIAL, rng: seededRng(1) });
    expect(questions).toHaveLength(3);
    const kinds = questions.map((q) => q.type.split("_")[0]).sort();
    expect(kinds).toEqual(["GRAMMAR", "KANJI", "VOCAB"]);
  });

  it("문항은 퀴즈와 같은 4지선다다", () => {
    const questions = buildStageQuestions({ ...MATERIAL, rng: seededRng(2) });
    questions.forEach((q) => {
      expect(q.choices).toHaveLength(4);
      expect(new Set(q.choices).size).toBe(4);
    });
  });
});

describe("통과 판정 (P4·P5)", () => {
  it("3문항 중 2문항 이상이면 통과다", () => {
    expect(isStagePassed(3)).toBe(true);
    expect(isStagePassed(2)).toBe(true);
    expect(isStagePassed(1)).toBe(false);
    expect(isStagePassed(0)).toBe(false);
  });
});

/**
 * ★ `recommend()`의 규칙은 이 파일에서 고정하지 않는다 — **단일 기준은 `diagnosis.recommend.test.js`** 다.
 *
 * 2026-08-25 감사(높음 1)로 "추천 후보 = 입장 가능한 코스 전체(courseNo 순)"가 확정되면서, 같은 시나리오
 * ("1단계 탈락이면 무엇을 추천하나")를 이 파일과 판정 파일이 **각각 고정하고 있었다** — 픽스처에서 입문이
 * AVAILABLE이 된 순간 두 기대값(N5 vs 입문)이 정면으로 갈렸다. 한 규칙을 두 파일이 고정하면 **또 갈라진다.**
 * 그래서 추천 판정은 전부 판정 파일로 옮겼고, 이 파일은 **측정 규칙**(계단 구성·문항 생성·통과 임계값)만 맡는다.
 */
