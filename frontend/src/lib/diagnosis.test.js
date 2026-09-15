import { describe, expect, it } from "vitest";
import {
  DONT_KNOW_CHOICE,
  MIN_STAGE_QUESTIONS,
  QUESTION_GROUP_ORDER,
  STAGE_SIZE,
  buildStageQuestions,
  countCorrect,
  groupOfQuestion,
  groupQuestions,
  isStagePassed,
  passThreshold,
  stagePlan,
} from "./diagnosis.js";
import { buildLibraryQuizSet, buildUnitQuizSet } from "./quiz.js";
import { hasHangul, hasJapanese, hasKanji, hasKatakana } from "./diagnosisScript.js";
import { coursesFixture } from "../test/apiFixtures.js";

/**
 * 실력 진단 — **측정 규칙** (설계/09 §3 — TDD Red, senior-dev 작성 2026-09-10 / 2026-09-14 개정)
 *
 * 기획 `진행사항/기획_2026-09_진단개편.md` / 인수 조건 **A9·A10·A11·A12·A18·A21·A27·A42~A46** + 예외 **E15·E17**.
 *
 * ★ 2026-09-10 개편으로 이 파일의 기대값이 통째로 바뀌었다(08 §F-13 뒤집힘):
 *   · 단계당 3문항(어휘1·한자1·문법1) → **6문항(단어 3·문법 2·문장 1 / N2·N1은 단어 3·빈칸 3)**
 *   · 한자 낱자 문항이 진단에서 빠지면서 **입문이 목록에 들어왔다**(6레벨)
 *   · 통과 = "3중 2" → **정답 ≥ ceil(문항 수 × 2/3)**
 *   · 모든 문항에 다섯 번째 보기 **[모르겠어요]** 가 붙는다(채점은 오답과 같다)
 *
 * ★ 2026-09-14 개편: **계단이 사라졌다.** `stagePlan`이 주는 것은 이제 "자동으로 훑을 순서"가 아니라
 *   **사용자가 고르는 레벨 선택지**다(A21·D9). 배열·순서는 그대로라 아래 단언은 유효하지만, 뜻이 바뀌었다.
 *   같은 개편으로 문항 구성에 **갈래 이름이 붙는다** — 문항 수·유형은 하나도 바뀌지 않는다(D18-2).
 *
 * 역할 분담(08 C-11): **표기 규칙은 `diagnosisScript.test.js` 하나**, **추천 판정은 `diagnosis.recommend.test.js` 하나**,
 * **판 기록·이어가기는 `diagnosis.rounds.test.js` 하나**다. 이 파일은 레벨 목록·문항 구성·갈래·채점만 맡는다.
 *
 * 이 테스트를 수정하지 말 것 — 계약 변경은 senior-dev 경유.
 */

const COURSES = coursesFixture();

function seededRng(seed = 1) {
  let state = seed;
  return () => {
    state = (state * 9301 + 49297) % 233280;
    return state / 233280;
  };
}

/** 자료실 어휘를 평탄화한 모양(설계/09 §1-5 어댑터의 출력) */
const vocab = (id, extra = {}) => ({
  id,
  word: `たんご${id}`,
  kana: `たんご${id}`,
  meaningKo: `뜻${id}`,
  partOfSpeech: "NOUN",
  ...extra,
});

/** GET /api/library/grammar 목록 항목 — 2026-09-10부터 examples가 함께 온다(설계/04 §3-5) */
const grammar = (id, extra = {}) => ({
  id,
  name: `〜ぶんぽう${id}`,
  nameKo: `문법뜻${id}`,
  level: "N5",
  hasRules: false,
  examples: [{ id: id * 10, jp: `これは ぶんぽう${id}です。`, kana: null, meaningKo: `예문뜻${id}` }],
  ...extra,
});

const MATERIAL = {
  vocabItems: Array.from({ length: 8 }, (_, i) => vocab(i + 1)),
  grammarItems: Array.from({ length: 8 }, (_, i) => grammar(i + 1)),
};

const build = (levelCode, material = MATERIAL, seed = 1) =>
  buildStageQuestions({ levelCode, ...material, rng: seededRng(seed) });

const typeCount = (questions, type) => questions.filter((question) => question.type === type).length;

describe("레벨 목록 (A21 · 코스 비하드코딩 · 레벨 표기 이원화)", () => {
  /**
   * ★ 뒤집힌 규칙(08 F-13 절): 예전에는 "단계마다 한자 1문항이 필요한데 입문은 한자 0자"라 입문이 빠졌다.
   * 한자 낱자 문항이 사라진 지금, 입문을 뺄 근거가 없다 — 입문 문법 20 · 예문 43 · 어휘 150이 그대로 재료다.
   *
   * 2026-09-14: 이 목록은 **자동으로 훑는 계단이 아니라 사용자가 고르는 선택지**다(D9).
   * 순서가 그대로인 이유는 목록의 **기본 선택값이 가장 낮은 레벨**이기 때문이다(A22).
   */
  it("입장 가능한 코스 전부가 낮은 순으로 선택지가 된다 — 첫 줄이 입문이다", () => {
    expect(stagePlan(COURSES).map((stage) => stage.levelCode)).toEqual(["INTRO", "N5", "N4", "N3", "N2", "N1"]);
    expect(stagePlan(COURSES)).toHaveLength(6);
  });

  it("각 선택지는 조회용 코드와 표시용 문구를 함께 준다 (3단계 qa 치명 ①)", () => {
    const first = stagePlan(COURSES)[0];
    expect(first.levelCode).toBe("INTRO"); // 자료실 필터에 넘기는 값
    expect(first.levelLabel).toBe("문자"); // 선택지·결과 표에 적는 값 — 잘라서 코드를 만들 수 없다
    expect(first.title).toBe("입문"); // 선택지 문구는 `{title}({levelLabel})`다(A21)
    expect(first.courseId).toBe(1);
  });

  it("입문이 준비중이면 목록은 N5부터다 (E22 — 별도 분기가 없다)", () => {
    const introPreparing = COURSES.map((course) =>
      course.courseNo === 0 ? { ...course, status: "PREPARING" } : course,
    );
    expect(stagePlan(introPreparing).map((stage) => stage.levelCode)).toEqual(["N5", "N4", "N3", "N2", "N1"]);
  });

  it("공개 코스가 하나도 없으면 빈 목록이다 (E10·E12 — 배너 미노출의 근거)", () => {
    expect(stagePlan(COURSES.map((course) => ({ ...course, status: "PREPARING" })))).toEqual([]);
  });
});

describe("한 레벨의 구성 (A18 · D2-4)", () => {
  it("입문~N3은 6문항 = 단어 뜻 3 · 문법 뜻 2 · 문장 뜻 1", () => {
    ["INTRO", "N5", "N4", "N3"].forEach((code) => {
      const questions = build(code);
      expect(questions).toHaveLength(STAGE_SIZE);
      expect(typeCount(questions, "VOCAB_MEANING")).toBe(3);
      expect(typeCount(questions, "GRAMMAR_MEANING")).toBe(2);
      expect(typeCount(questions, "SENTENCE_MEANING")).toBe(1);
    });
  });

  it("N2·N1은 6문항 = 단어 읽기 3 · 문법 빈칸 3 (빈칸 지문이 문장을 겸한다)", () => {
    const material = {
      vocabItems: Array.from({ length: 8 }, (_, i) => vocab(i + 1, { word: `単語${i + 1}`, kana: `たんご${i + 1}` })),
      grammarItems: MATERIAL.grammarItems,
    };
    ["N2", "N1"].forEach((code) => {
      const questions = build(code, material);
      expect(questions).toHaveLength(STAGE_SIZE);
      expect(typeCount(questions, "VOCAB_READING")).toBe(3);
      expect(typeCount(questions, "GRAMMAR_CLOZE")).toBe(3);
      // 한자 낱자 문항은 어느 레벨에도 없다(D2-1)
      expect(questions.some((question) => question.type.startsWith("KANJI"))).toBe(false);
    });
  });

  it("화면 순서는 단어 → 문법 → 문장으로 고정이다 — 단계마다 배치가 바뀌지 않는다", () => {
    expect(build("N5").map((question) => question.type)).toEqual([
      "VOCAB_MEANING",
      "VOCAB_MEANING",
      "VOCAB_MEANING",
      "GRAMMAR_MEANING",
      "GRAMMAR_MEANING",
      "SENTENCE_MEANING",
    ]);
  });

  it("같은 대상이 한 단계에서 두 번 나오지 않는다 — 문장 문항의 문법도 문법 문항과 겹치지 않는다", () => {
    const questions = build("N5");
    expect(new Set(questions.map((question) => question.id)).size).toBe(questions.length);

    const grammarIds = questions
      .filter((question) => question.type !== "VOCAB_MEANING")
      .map((question) => question.id.replace(/^[a-z-]+-/, ""));
    expect(new Set(grammarIds).size).toBe(grammarIds.length);
  });
});

/**
 * 갈래 — 문항 유형에서 **기계적으로** 나온다(D18-1). 새 분류 체계가 아니라 **이미 있던 묶음에 이름을 붙인 것**이고,
 * 문항 수·유형·순서는 하나도 바뀌지 않는다(D18-2). 바뀌는 것은 화면에 그 묶음이 **보인다**는 것뿐이다.
 *
 * `문법`(규칙 자체를 아는가)과 `어법`(문장 안에서 쓸 수 있는가)을 가르는 이유: 다른 능력이고,
 * 진단이 실제로 두 유형을 다 내고 있다. N2·N1의 빈칸 문항은 지금 **질문 문구가 없어서**
 * (legend에 들어가는 값이 질문이 아니라 예문 뜻이다 — 기획 Q10) `어법` 머리글이 그 자리를 메운다.
 */
describe("갈래 (A42~A46 · D18)", () => {
  it("유형이 갈래를 정한다 — 문법(규칙)과 어법(쓰임)은 다른 갈래다", () => {
    expect(groupOfQuestion({ type: "VOCAB_MEANING" })).toBe("어휘");
    expect(groupOfQuestion({ type: "VOCAB_READING" })).toBe("어휘");
    expect(groupOfQuestion({ type: "GRAMMAR_MEANING" })).toBe("문법");
    expect(groupOfQuestion({ type: "GRAMMAR_CLOZE" })).toBe("어법");
    expect(groupOfQuestion({ type: "SENTENCE_MEANING" })).toBe("문장");
  });

  it("화면 순서는 어휘 → 문법 → 어법 → 문장 고정이다 — 레벨이 바뀌어도 같다 (A43)", () => {
    expect(QUESTION_GROUP_ORDER).toEqual(["어휘", "문법", "어법", "문장"]);
  });

  it("입문~N3은 어휘 3 · 문법 2 · 문장 1 — 어법 갈래가 서지 않는다 (A44)", () => {
    ["INTRO", "N5", "N4", "N3"].forEach((code) => {
      const groups = groupQuestions(build(code));
      expect(groups.map((group) => group.title)).toEqual(["어휘", "문법", "문장"]);
      expect(groups.map((group) => group.items.length)).toEqual([3, 2, 1]);
    });
  });

  it("N2·N1은 어휘 3 · 어법 3 — 문법·문장 갈래가 서지 않는다 (A44)", () => {
    ["N2", "N1"].forEach((code) => {
      const groups = groupQuestions(build(code));
      expect(groups.map((group) => group.title)).toEqual(["어휘", "어법"]);
      expect(groups.map((group) => group.items.length)).toEqual([3, 3]);
    });
  });

  /** 빈 갈래를 남기면 "여기 있어야 할 것이 없다"는 **결함 신호**로 읽힌다 — 목록에 아예 넣지 않는다 */
  it("문항이 0개인 갈래는 목록에 없다 — 문장을 못 만들면 어휘 4 · 문법 2다 (A45)", () => {
    const material = {
      ...MATERIAL,
      grammarItems: MATERIAL.grammarItems.map((item) => ({ ...item, examples: [] })),
    };
    const groups = groupQuestions(build("N5", material));

    expect(groups.map((group) => group.title)).toEqual(["어휘", "문법"]);
    expect(groups.map((group) => group.items.length)).toEqual([4, 2]);
  });

  it("문항 번호는 갈래와 무관하게 화면 전체에서 1부터 이어진다 (A46)", () => {
    const groups = groupQuestions(build("N5"));

    expect(groups.flatMap((group) => group.items.map((item) => item.number))).toEqual([1, 2, 3, 4, 5, 6]);
  });

  it("묶는다고 문항이 빠지거나 순서가 바뀌지 않는다", () => {
    const questions = build("N5");

    expect(groupQuestions(questions).flatMap((group) => group.items.map((item) => item.question))).toEqual(questions);
    expect(groupQuestions([])).toEqual([]);
  });
});

describe("[모르겠어요] — 다섯 번째 보기 (A9·A10·D1)", () => {
  it("모름 보기의 문구는 [모르겠어요]다 — 화면·qa가 같은 글자를 본다", () => {
    expect(DONT_KNOW_CHOICE).toBe("모르겠어요");
  });

  it("보기는 5개 = 정답 1 + 오답 3 + 모름 1, 전부 서로 다른 문자열이다", () => {
    ["INTRO", "N5", "N4", "N3", "N2", "N1"].forEach((code) => {
      build(code).forEach((question) => {
        expect(question.choices).toHaveLength(5);
        expect(new Set(question.choices).size).toBe(5);
      });
    });
  });

  it("모름은 언제나 맨 아래이고 정답은 앞 4자리 안에 있다 — 셔플 대상이 아니다", () => {
    [1, 2, 3, 7, 11].forEach((seed) => {
      build("N5", MATERIAL, seed).forEach((question) => {
        expect(question.choices[4]).toBe(DONT_KNOW_CHOICE);
        expect(question.answerIndex).toBeGreaterThanOrEqual(0);
        expect(question.answerIndex).toBeLessThan(4);
        expect(question.choices[question.answerIndex]).not.toBe(DONT_KNOW_CHOICE);
      });
    });
  });

  it("모름 라벨과 같은 값을 가진 오답 후보는 쓰지 않는다 (보기 5개가 서로 달라야 한다)", () => {
    const material = {
      ...MATERIAL,
      vocabItems: MATERIAL.vocabItems.map((item, index) =>
        index === 0 ? { ...item, meaningKo: DONT_KNOW_CHOICE } : item,
      ),
    };
    build("N5", material).forEach((question) => {
      expect(question.choices.filter((choice) => choice === DONT_KNOW_CHOICE)).toHaveLength(1);
    });
  });
});

describe("표기 규칙이 문항 생성에 실제로 걸린다 (A13·A14·A17)", () => {
  const KATAKANA = { word: "テレビ", kana: null, meaningKo: "텔레비전" };

  it("입문·N5 문항에는 한자도 가타카나도 남지 않는다 — 지문이 kana로 치환된다", () => {
    const material = {
      vocabItems: Array.from({ length: 8 }, (_, i) =>
        vocab(i + 1, { word: `漢字${i + 1}`, kana: `かんじ${i + 1}` }),
      ),
      grammarItems: MATERIAL.grammarItems,
    };
    ["INTRO", "N5"].forEach((code) => {
      build(code, material).forEach((question) => {
        expect(hasKanji(question.prompt.main)).toBe(false);
        expect(hasKatakana(question.prompt.main)).toBe(false);
        expect(question.prompt.kana).toBeNull(); // 치환했으므로 병기 줄이 없다
      });
    });
  });

  it("N4는 한자 지문에 kana 줄을 얹는다 (A15)", () => {
    const material = {
      vocabItems: Array.from({ length: 8 }, (_, i) =>
        vocab(i + 1, { word: `漢字${i + 1}`, kana: `かんじ${i + 1}` }),
      ),
      grammarItems: MATERIAL.grammarItems,
    };
    const vocabQuestions = build("N4", material).filter((question) => question.type === "VOCAB_MEANING");
    expect(vocabQuestions).toHaveLength(3);
    vocabQuestions.forEach((question) => {
      expect(hasKanji(question.prompt.main)).toBe(true);
      expect(question.prompt.kana).not.toBeNull();
    });
  });

  /**
   * ★ 규칙은 **화면에 일본어로 나오는 자리에만** 적용한다(D3).
   * 입문~N3의 보기는 전부 한국어라 오답 풀은 거르지 않는다 —
   * 여기를 같이 거르면 N5 어휘 후보가 20% 줄어드는 것이 **오답 풀까지 20% 줄어드는 일**이 되어
   * "보기 4개를 못 채워 버려지는 문항"이 늘어난다.
   */
  it("N5: 가타카나 어휘는 지문이 되지 못하지만 오답 풀에서는 빠지지 않는다", () => {
    const material = {
      vocabItems: [
        vocab(1, { word: "みず", kana: "みず", meaningKo: "물" }),
        vocab(2, KATAKANA),
        vocab(3, { ...KATAKANA, word: "コーヒー", meaningKo: "커피" }),
        vocab(4, { ...KATAKANA, word: "パン", meaningKo: "빵" }),
      ],
      grammarItems: MATERIAL.grammarItems,
    };
    const vocabQuestions = build("N5", material).filter((question) => question.type === "VOCAB_MEANING");

    // 지문이 될 수 있는 어휘는 "みず" 하나뿐 → 단어 문항은 1개만 만들어진다
    expect(vocabQuestions).toHaveLength(1);
    expect(vocabQuestions[0].prompt.main).toBe("みず");
    // 그런데 보기 4개는 채워졌다 — 오답(한국어 뜻)은 가타카나 어휘에서 그대로 가져왔다
    expect(vocabQuestions[0].choices).toHaveLength(5);
  });

  it("입문~N3의 보기는 전부 한국어, N2·N1의 보기는 전부 일본어다 (A17)", () => {
    ["INTRO", "N5", "N4", "N3"].forEach((code) => {
      build(code).forEach((question) => {
        question.choices.slice(0, 4).forEach((choice) => expect(hasJapanese(choice)).toBe(false));
      });
    });

    const material = {
      vocabItems: Array.from({ length: 8 }, (_, i) => vocab(i + 1, { word: `単語${i + 1}`, kana: `たんご${i + 1}` })),
      grammarItems: MATERIAL.grammarItems,
    };
    ["N2", "N1"].forEach((code) => {
      build(code, material).forEach((question) => {
        question.choices.slice(0, 4).forEach((choice) => expect(hasHangul(choice)).toBe(false));
      });
      // 모름 보기만은 언제나 한국어다 — 보기가 아니라 포기 버튼이기 때문이다(D1)
      build(code, material).forEach((question) => expect(question.choices[4]).toBe(DONT_KNOW_CHOICE));
    });
  });
});

describe("재료가 모자랄 때 (E15 · 09 §1-4)", () => {
  it("문장 문항을 못 만들면 단어로 한 개를 채운다 (D2-4)", () => {
    const material = {
      ...MATERIAL,
      grammarItems: MATERIAL.grammarItems.map((item) => ({ ...item, examples: [] })),
    };
    const questions = build("N5", material);

    expect(questions).toHaveLength(STAGE_SIZE);
    expect(typeCount(questions, "SENTENCE_MEANING")).toBe(0);
    expect(typeCount(questions, "VOCAB_MEANING")).toBe(4);
    expect(typeCount(questions, "GRAMMAR_MEANING")).toBe(2);
  });

  /** 오답 3개를 못 채우면 그 문항을 조용히 버린다(09 §1-4) — 세트 실패가 아니다 */
  it("보기 4개를 못 채우면 그 문항이 빠지고, 만들어진 수가 그 단계의 사실이다", () => {
    const material = {
      vocabItems: [vocab(1), vocab(2)], // 오답 후보가 1개뿐 → 단어 문항을 만들 수 없다
      grammarItems: MATERIAL.grammarItems,
    };
    const questions = build("N5", material);

    // 빈자리를 다른 유형으로 메우지 않는다 — 문법 2 + 문장 1 = 3문항이 그 단계의 사실이다
    expect(questions).toHaveLength(3);
    expect(typeCount(questions, "VOCAB_MEANING")).toBe(0);
    expect(questions.length).toBeLessThan(STAGE_SIZE);
    questions.forEach((question) => expect(question.choices).toHaveLength(5));
  });

  it("재료가 아예 없으면 빈 단계다 — 3문항 미만이면 그 단계는 측정하지 않는다", () => {
    expect(build("N5", { vocabItems: [], grammarItems: [] })).toEqual([]);
    expect(MIN_STAGE_QUESTIONS).toBe(3);
  });
});

describe("채점과 통과 판정 (A27·A11·D5)", () => {
  it("통과 기준은 비율이다 — 정답 ≥ ceil(문항 수 × 2/3)", () => {
    expect(passThreshold(6)).toBe(4);
    expect(passThreshold(5)).toBe(4);
    expect(passThreshold(4)).toBe(3);
    expect(passThreshold(3)).toBe(2);
  });

  it("6문항 중 4문항이면 통과, 3문항이면 미달이다", () => {
    expect(isStagePassed(4, 6)).toBe(true);
    expect(isStagePassed(6, 6)).toBe(true);
    expect(isStagePassed(3, 6)).toBe(false);
    expect(isStagePassed(0, 6)).toBe(false);
    // 5문항짜리 단계에서도 같은 비율이 적용된다(E5)
    expect(isStagePassed(4, 5)).toBe(true);
    expect(isStagePassed(3, 5)).toBe(false);
  });

  it("모름과 미응답은 오답과 똑같이 센다 (A11·E6)", () => {
    const questions = build("N5");
    const answers = questions.map((question) => question.answerIndex);

    expect(countCorrect(questions, answers)).toBe(6);
    // 4번째만 모름으로 바꾸면 5점
    const withDontKnow = answers.map((value, index) => (index === 3 ? 4 : value));
    expect(countCorrect(questions, withDontKnow)).toBe(5);
    // 한 문항도 고르지 않으면 0점 → 미달 → 결과 화면(E6)
    expect(countCorrect(questions, questions.map(() => null))).toBe(0);
    expect(countCorrect(questions, [])).toBe(0);
  });
});

/**
 * ★ **[모르겠어요]는 진단 전용이다**(A12·D1 — 미결 Q1의 기본값).
 * 유닛 확인 문제·자료실 퀴즈는 **즉시 채점**이라 "모름"을 고르면 그 자리에서 오답 연출이 뜬다 —
 * 학습 흐름을 끊는다. 그쪽 보기는 4개 그대로다.
 */
describe("적용 범위는 진단뿐 (A12)", () => {
  const unitMaterial = {
    grammars: MATERIAL.grammarItems,
    kanjis: [],
    vocabularies: MATERIAL.vocabItems,
  };

  it("유닛 확인 문제의 보기는 4개이고 모름이 없다", () => {
    const { questions } = buildUnitQuizSet(unitMaterial, { rng: seededRng(3) });
    expect(questions.length).toBeGreaterThan(0);
    questions.forEach((question) => {
      expect(question.choices).toHaveLength(4);
      expect(question.choices).not.toContain(DONT_KNOW_CHOICE);
    });
  });

  it("자료실 퀴즈의 보기도 4개이고 모름이 없다", () => {
    const { questions } = buildLibraryQuizSet({
      type: "vocabulary",
      items: MATERIAL.vocabItems,
      count: 5,
      rng: seededRng(4),
    });
    expect(questions.length).toBeGreaterThan(0);
    questions.forEach((question) => {
      expect(question.choices).toHaveLength(4);
      expect(question.choices).not.toContain(DONT_KNOW_CHOICE);
    });
  });
});
