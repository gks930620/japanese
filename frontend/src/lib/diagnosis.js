// 실력 진단 — **한 판의 구성·갈래·채점·판 기록·이어가기·추천** (설계/09 §3, 2026-09-14 개편: 한 레벨 = 한 판).
//
// 구현 경계(09 §3-3): 문항 한 개를 만드는 규칙은 lib/quiz.js, 레벨별 표기 규칙은 lib/diagnosisScript.js,
// 이 파일은 **어느 유형을 몇 개 만들지 · 재료를 표기 규칙으로 거르기 · [모르겠어요] 얹기 · 갈래 묶기 · 채점 ·
// 레벨 목록 · 판 기록 · 이어가기 · 추천**을 맡는다.
import { diagnosisGenerators } from "./quiz.js";
import { canUseAsNamePrompt, canUseAsPrompt, levelScript, renderPrompt } from "./diagnosisScript.js";

/** 한 판의 목표 문항 수 (09 §3-3) — 재료가 모자라면 만들어진 수가 그 판의 사실이다 */
export const STAGE_SIZE = 6;

/** 이 수보다 적으면 그 판은 측정하지 않는다 — 2문항짜리 통과·미달은 실력이 아니라 운이다 */
export const MIN_STAGE_QUESTIONS = 3;

/** 다섯 번째 보기 — **진단 전용**이다(09 §1-4). 유닛 확인 문제·자료실 퀴즈의 보기는 4개 그대로다 */
export const DONT_KNOW_CHOICE = "모르겠어요";

/**
 * 진단 레벨이 될 수 있는 코드 = **문법·어휘 자료실의 레벨 선택지**(설계/04 §3-1).
 * 2026-09-10 개편으로 한자 낱자 문항이 빠지면서 **입문이 목록에 들어왔다**(08 §F-13 뒤집힘) —
 * 입문에는 한자가 0자지만 문법 20·예문 43·어휘 150이 그대로 재료다.
 *
 * 2026-09-14: 이 배열은 더 이상 "자동으로 훑을 계단"이 아니라 **사용자가 고르는 레벨 선택지**다(09 §3-1).
 * 이름·구성·순서는 그대로다 — 순서가 남는 이유는 기본 선택값이 가장 낮은 레벨이기 때문이다.
 * 학습 순서 = 이 배열 순서. courseNo에서 레벨을 파생하지 않는다(설계/03 §1, 08 C-9).
 */
export const STAGE_LEVEL_CODES = ["INTRO", "N5", "N4", "N3", "N2", "N1"];

/** 코스의 자료실 레벨 코드 — 서버가 준 값 그대로. 진단에 못 쓰는 코드면 null */
export function libraryLevelOfCourse(course) {
  const code = course?.levelCode ?? null;
  return STAGE_LEVEL_CODES.includes(code) ? code : null;
}

/**
 * 레벨 목록(선택지) — 입장 가능한(AVAILABLE) 코스를 학습 순서(레벨 코드 순)로.
 * 공개 코스가 하나도 없으면 빈 배열(진단 배너 미노출의 근거 — 설계/09 §3-1).
 */
export function stagePlan(courses) {
  return (courses ?? [])
    .filter((course) => course.status === "AVAILABLE" && libraryLevelOfCourse(course) != null)
    .sort(
      (a, b) =>
        STAGE_LEVEL_CODES.indexOf(libraryLevelOfCourse(a)) -
        STAGE_LEVEL_CODES.indexOf(libraryLevelOfCourse(b)),
    )
    .map((course) => ({
      courseId: course.id,
      levelLabel: course.levelLabel, // 표시 문구 — 선택지·결과 표가 쓴다
      levelCode: libraryLevelOfCourse(course), // 자료실 조회용 코드
      title: course.title,
    }));
}

/* ── 한 판의 구성 ───────────────────────────────────────── */

/** rng 주입 셔플 — 선택(어느 재료를 쓸지)은 이 파일 몫이고, 문항 조립은 quiz.js 몫이다 */
function shuffle(list, rng) {
  const out = [...list];
  for (let i = out.length - 1; i > 0; i -= 1) {
    const j = Math.floor(rng() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

/** [모르겠어요]와 같은 값은 재료에서 뺀다 — 보기 5개가 서로 달라야 한다(09 §3-5) */
function withoutDontKnow(items, fields) {
  return (items ?? []).filter((item) => fields.every((field) => item?.[field] !== DONT_KNOW_CHOICE));
}

/** 다섯 번째 보기를 얹는다 — 모름은 셔플 대상이 아니라 **언제나 맨 아래**다(09 §3-5) */
function withDontKnow(question) {
  return { ...question, choices: [...question.choices, DONT_KNOW_CHOICE] };
}

/**
 * 한 판의 문항 (09 §3-3) — 입문~N3은 단어 3·문법 2·문장 1, N2·N1은 단어 3(읽기)·빈칸 3.
 * 화면 순서는 **단어 → 문법 → 문장 고정**이다(판마다 배치가 바뀌면 눈이 매번 새로 적응한다).
 *
 * 표기 규칙은 **화면에 일본어로 나오는 자리에만** 적용한다(09 §3-4):
 * 입문~N3은 보기가 한국어라 지문만 거르고, N2·N1은 보기도 일본어라 양쪽에 적용한다.
 */
export function buildStageQuestions({ levelCode, vocabItems, grammarItems, rng }) {
  const { choiceLang } = levelScript(levelCode);
  const japaneseChoices = choiceLang === "JA";
  const { vocab: vocabQuestion, grammar: grammarQuestion, sentence: sentenceQuestion, others } =
    diagnosisGenerators;

  const vocabPool = withoutDontKnow(vocabItems, ["meaningKo", "word", "kana"]);
  const grammarPool = withoutDontKnow(grammarItems, ["name", "nameKo"]);

  // 지문이 될 수 있는 재료만 대상이 된다 — 못 쓰는 항목은 고쳐 쓰지 않고 다른 항목을 뽑는다
  const vocabTargets = shuffle(
    vocabPool.filter((item) => {
      if (!canUseAsPrompt(levelCode, { text: item.word, kana: item.kana })) return false;
      return japaneseChoices ? Boolean(item.kana) : true; // 읽기 문항은 정답이 kana다
    }),
    rng,
  );
  const grammarTargets = shuffle(
    grammarPool.filter((item) =>
      japaneseChoices
        ? (item.examples ?? []).some((example) =>
            canUseAsPrompt(levelCode, { text: example?.jp, kana: example?.kana }),
          )
        : canUseAsNamePrompt(levelCode, { name: item.name }),
    ),
    rng,
  );

  const render = (item) => renderPrompt(levelCode, { text: item.word ?? item.jp, kana: item.kana });
  const used = new Set();

  /** 대상 후보를 앞에서부터 시도해 원하는 수만큼 만든다. 못 만든 문항은 조용히 건너뛴다(09 §1-4) */
  const take = (targets, want, make) => {
    const made = [];
    for (const target of targets) {
      if (made.length >= want) break;
      if (used.has(target.id)) continue;
      const question = make(target);
      if (question) {
        made.push(withDontKnow(question));
        used.add(target.id);
      }
    }
    return made;
  };

  // 문장 문항을 먼저 정한다 — 못 만들면 그 한 자리를 단어로 채우기 때문이다(09 §3-3)
  const sentence = japaneseChoices
    ? []
    : take(grammarTargets, 1, (target) =>
        sentenceQuestion(target, others(target, grammarPool, null), rng, {
          canUseExample: (example) =>
            canUseAsPrompt(levelCode, { text: example.jp, kana: example.kana }),
          render,
        }),
      );

  // 단어 — 문장을 못 만들었으면 한 개를 더 만든다(단어는 어느 레벨에서도 재료가 가장 많다)
  const wantVocab = 3 + (japaneseChoices || sentence.length > 0 ? 0 : 1);
  const vocab = take(vocabTargets, wantVocab, (target) =>
    vocabQuestion(target, others(target, vocabPool, null), rng, {
      only: japaneseChoices ? "VOCAB_READING" : "VOCAB_MEANING",
      render,
    }),
  );

  // 문법 — 문장 문항이 쓴 문법은 다시 쓰지 않는다(같은 대상은 한 판에 한 번)
  const grammar = take(grammarTargets, japaneseChoices ? 3 : 2, (target) =>
    grammarQuestion(target, others(target, grammarPool, null), rng, {
      only: japaneseChoices ? "GRAMMAR_CLOZE" : "GRAMMAR_MEANING",
    }),
  );

  const questions = [...vocab, ...grammar, ...sentence];
  // 3문항 미만이면 측정하지 않는다 — 통과·미달이 실력이 아니라 운이 된다(09 §3-6)
  return questions.length >= MIN_STAGE_QUESTIONS ? questions : [];
}

/* ── 갈래 ──────────────────────────────────────────────── */

/**
 * 갈래의 화면 순서 — 레벨이 바뀌어도 같다(09 §3-3). 넷은 "제품이 가진 갈래의 전체 목록"이고,
 * 한 판에 동시에 서는 갈래는 언제나 셋 이하다(빈 갈래는 `groupQuestions`가 뺀다).
 */
export const QUESTION_GROUP_ORDER = ["어휘", "문법", "어법", "문장"];

/**
 * 유형 → 갈래. 이미 있던 묶음(단어 → 문법 → 문장)에 이름을 붙인 것이라 문항 수·유형·순서는 바뀌지 않는다.
 * `문법`(규칙 자체를 아는가)과 `어법`(문장 안에서 쓸 수 있는가)은 다른 능력이라 다른 갈래다(09 §3-3).
 */
const GROUP_OF_TYPE = {
  VOCAB_MEANING: "어휘",
  VOCAB_READING: "어휘",
  GRAMMAR_MEANING: "문법",
  GRAMMAR_CLOZE: "어법",
  SENTENCE_MEANING: "문장",
};

export function groupOfQuestion(question) {
  return GROUP_OF_TYPE[question?.type] ?? null;
}

/**
 * 갈래 묶기 → `[{ title, items: [{ question, number }] }]`.
 * **빈 갈래는 배열에 없다**(머리글째 미렌더의 근거 — 재료 부족으로 0이 된 갈래도 같은 규칙이다).
 * `number`는 화면 전체 통번호다 — 번호를 화면에서 따로 세지 않는다(묶음과 번호가 두 곳에서 계산되면 어긋난다).
 */
export function groupQuestions(questions) {
  const numbered = (questions ?? []).map((question, index) => ({ question, number: index + 1 }));
  return QUESTION_GROUP_ORDER.map((title) => ({
    title,
    items: numbered.filter(({ question }) => groupOfQuestion(question) === title),
  })).filter((group) => group.items.length > 0);
}

/* ── 채점 ──────────────────────────────────────────────── */

/** 통과선은 비율이다 — 정답 >= ceil(문항 수 x 2/3). 5문항짜리 판에도 같은 비율이 걸린다(09 §3-6) */
export function passThreshold(total) {
  return Math.ceil((total ?? 0) * (2 / 3));
}

/** 통과 판정 — 기록의 total을 그대로 쓴다(상수로 비교하면 5문항짜리 판이 조용히 어긋난다) */
export function isStagePassed(correct, total = STAGE_SIZE) {
  return correct >= passThreshold(total);
}

/**
 * 채점 — answers[i]가 미응답(null)이거나 모름(4)이면 오답이다(09 §3-5).
 * 제출 뒤에도 문항별 정오는 보여주지 않는다 — 이 수는 레벨 판정에만 쓴다(09 §3-6).
 */
export function countCorrect(questions, answers) {
  return (questions ?? []).reduce(
    (sum, question, index) => sum + ((answers ?? [])[index] === question.answerIndex ? 1 : 0),
    0,
  );
}

/* ── 판 기록 · 이어가기 (09 §3-2-1) ────────────────────── */

/**
 * 판 기록 — 결과 표의 재료. **레벨당 한 행**이고 같은 레벨을 다시 치면 나중 결과로 덮어쓴다(행이 늘지 않는다).
 * **레벨 순(낮은 것부터)** 이지 친 순서가 아니다 — 진단이 대답하는 질문은 "나는 사다리 어디쯤인가"다.
 * 새 배열을 돌려준다(앞의 기록을 건드리지 않는다).
 */
export function recordLevelResult(results, result) {
  const order = (levelCode) => STAGE_LEVEL_CODES.indexOf(levelCode);
  return [...(results ?? []).filter((row) => row.levelCode !== result.levelCode), result].sort(
    (a, b) => order(a.levelCode) - order(b.levelCode),
  );
}

/**
 * 이어가기 — **방금 친 한 판**의 한 칸 위(통과)/아래(미달)를 제안한다. 추천(`recommend`)은 "지금까지 친 전부"에서
 * 나오는 **다른 계산**이다 — 한 판만 쳤을 때는 같은 곳을 가리키지만 여러 판을 치면 갈린다. 합치지 말 것.
 *
 *   END_OF_LIST     목록의 끝 — 위/아래가 없다(버튼 없음)
 *   ALREADY_PASSED  있지만 **이미 통과한** 레벨 — 증명한 것을 다시 확인하라고 권하지 않는다(버튼 없음)
 *   OFFER           있고, 아직 안 쳤거나 미달했다 — 미달했던 레벨은 다시 제안한다
 *
 * "한 칸"은 레벨 목록(`stagePlan`)의 한 칸이다 — 준비중 레벨은 목록에 없으므로 건너뛴다(08 C-9).
 */
export function nextLevelOffer({ plan, results, levelCode, passed }) {
  const list = plan ?? [];
  const index = list.findIndex((level) => level.levelCode === levelCode);
  const target = index < 0 ? null : (list[index + (passed ? 1 : -1)] ?? null);
  if (!target) return { level: null, status: "END_OF_LIST" };

  const record = (results ?? []).find((row) => row.levelCode === target.levelCode);
  if (record && isStagePassed(record.correct, record.total)) return { level: null, status: "ALREADY_PASSED" };
  return { level: target, status: "OFFER" };
}

/* ── 추천 ──────────────────────────────────────────────── */

/**
 * 추천 후보 — **입장 가능한 코스 전체**를 학습 순서(courseNo)로. 레벨 목록과 다른 목록이다(09 §3-2).
 * 준비중은 애초에 후보가 아니라, 입문이 준비중이면 자동으로 그다음 코스가 첫 코스가 된다.
 */
export function recommendCandidates(courses) {
  return (courses ?? [])
    .filter((course) => course.status === "AVAILABLE")
    .sort((a, b) => a.courseNo - b.courseNo);
}

/**
 * 추천 판정 (09 §3-2) — **통과한 레벨**로 정한다. 판은 서로 독립이고 순서·횟수는 판정에 쓰지 않는다.
 *
 *   통과한 레벨이 있으면  → 그중 **가장 높은** 레벨의 **바로 위** 레벨 코스 (위가 없으면 allPassed + 가장 높은 공개 코스)
 *   통과한 레벨이 없으면  → 미달한 레벨 중 **가장 낮은** 것의 **바로 아래** 레벨 코스 (더 없으면 입장 가능한 첫 코스)
 *
 * "바로 위/아래"는 레벨 목록의 한 칸이다(준비중 레벨은 건너뛴다). 추천 후보는 그와 다른 목록(AVAILABLE 코스 전체)이다.
 * 옛 계산("맨 아래부터 연속으로 몇 개 통과했나")은 레벨을 고르는 순간 조용히 틀렸다 — N2만 통과한 사람에게 N5를 추천했다.
 * 반환은 `{ recommendedCourseId, allPassed }`뿐이다. 아래 레벨 코스 링크(`stepDownCourseId`)는 없앴다 —
 * 결과 화면의 보조 동선이 코스 링크가 아니라 레벨 검사 시작 버튼(`nextLevelOffer`)이 됐다.
 */
export function recommend({ courses, results }) {
  const plan = stagePlan(courses);
  const candidates = recommendCandidates(courses);
  if (plan.length === 0 || candidates.length === 0) return null;

  const indexOf = (levelCode) => plan.findIndex((level) => level.levelCode === levelCode);
  const rows = (results ?? []).filter((row) => indexOf(row.levelCode) >= 0);
  const passedIndexes = rows
    .filter((row) => isStagePassed(row.correct, row.total))
    .map((row) => indexOf(row.levelCode));
  const failedIndexes = rows
    .filter((row) => !isStagePassed(row.correct, row.total))
    .map((row) => indexOf(row.levelCode));

  if (passedIndexes.length > 0) {
    // 모순 기록(N2 통과 + N3 미달)에서는 통과가 이긴다 — 추천은 "할 수 있는 것"에서 출발한다
    const above = plan[Math.max(...passedIndexes) + 1];
    return above
      ? { recommendedCourseId: above.courseId, allPassed: false }
      : { recommendedCourseId: candidates[candidates.length - 1].id, allPassed: true };
  }

  const below = failedIndexes.length > 0 ? plan[Math.min(...failedIndexes) - 1] : null;
  return { recommendedCourseId: below?.courseId ?? candidates[0].id, allPassed: false };
}
