// 실력 진단 — **단계의 구성·채점·계단·추천** (설계/09 §3, 2026-09-10 개편).
//
// 구현 경계(09 §3-3): 문항 한 개를 만드는 규칙은 lib/quiz.js, 레벨별 표기 규칙은 lib/diagnosisScript.js,
// 이 파일은 **어느 유형을 몇 개 만들지 · 재료를 표기 규칙으로 거르기 · [모르겠어요] 얹기 · 채점**을 맡는다.
import { diagnosisGenerators } from "./quiz.js";
import { canUseAsNamePrompt, canUseAsPrompt, levelScript, renderPrompt } from "./diagnosisScript.js";

/** 한 단계의 목표 문항 수 (09 §3-3) — 재료가 모자라면 만들어진 수가 그 단계의 사실이다 */
export const STAGE_SIZE = 6;

/** 이 수보다 적으면 그 단계는 측정하지 않는다 — 2문항짜리 통과·미달은 실력이 아니라 운이다 */
export const MIN_STAGE_QUESTIONS = 3;

/** 다섯 번째 보기 — **진단 전용**이다(09 §1-4). 유닛 확인 문제·자료실 퀴즈의 보기는 4개 그대로다 */
export const DONT_KNOW_CHOICE = "모르겠어요";

/**
 * 진단 계단이 될 수 있는 레벨 코드 = **문법·어휘 자료실의 레벨 선택지**(설계/04 §3-1).
 * 2026-09-10 개편으로 한자 낱자 문항이 빠지면서 **입문이 계단에 들어왔다**(08 §F-13 뒤집힘) —
 * 입문에는 한자가 0자지만 문법 20·예문 43·어휘 150이 그대로 재료다.
 *
 * 학습 순서 = 이 배열 순서. courseNo에서 레벨을 파생하지 않는다(설계/03 §1, 08 C-9).
 */
export const STAGE_LEVEL_CODES = ["INTRO", "N5", "N4", "N3", "N2", "N1"];

/** 코스의 자료실 레벨 코드 — 서버가 준 값 그대로. 계단에 못 쓰는 코드면 null */
export function libraryLevelOfCourse(course) {
  const code = course?.levelCode ?? null;
  return STAGE_LEVEL_CODES.includes(code) ? code : null;
}

/**
 * 진단 계단 — 입장 가능한(AVAILABLE) 코스를 학습 순서(레벨 코드 순)로.
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
      levelLabel: course.levelLabel, // 표시 문구 — 결과 화면의 근거 표가 쓴다
      levelCode: libraryLevelOfCourse(course), // 자료실 조회용 코드
      title: course.title,
    }));
}

/* ── 단계 구성 ─────────────────────────────────────────── */

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
 * 한 단계의 문항 (09 §3-3) — 입문~N3은 단어 3·문법 2·문장 1, N2·N1은 단어 3(읽기)·빈칸 3.
 * 화면 순서는 **단어 → 문법 → 문장 고정**이다(단계마다 배치가 바뀌면 눈이 매번 새로 적응한다).
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

  // 문법 — 문장 문항이 쓴 문법은 다시 쓰지 않는다(같은 대상은 한 단계에 한 번)
  const grammar = take(grammarTargets, japaneseChoices ? 3 : 2, (target) =>
    grammarQuestion(target, others(target, grammarPool, null), rng, {
      only: japaneseChoices ? "GRAMMAR_CLOZE" : "GRAMMAR_MEANING",
    }),
  );

  const questions = [...vocab, ...grammar, ...sentence];
  // 3문항 미만이면 측정하지 않는다 — 통과·미달이 실력이 아니라 운이 된다(09 §3-6)
  return questions.length >= MIN_STAGE_QUESTIONS ? questions : [];
}

/* ── 채점 ──────────────────────────────────────────────── */

/** 통과선은 비율이다 — 정답 >= ceil(문항 수 x 2/3). 5문항 단계에도 같은 비율이 걸린다(09 §3-6) */
export function passThreshold(total) {
  return Math.ceil((total ?? 0) * (2 / 3));
}

/** 통과 판정 — 기록의 total을 그대로 쓴다(상수로 비교하면 5문항 단계가 조용히 어긋난다) */
export function isStagePassed(correct, total = STAGE_SIZE) {
  return correct >= passThreshold(total);
}

/**
 * 채점 — answers[i]가 미응답(null)이거나 모름(4)이면 오답이다(09 §3-5).
 * 제출 뒤에도 문항별 정오는 보여주지 않는다 — 이 수는 단계 판정에만 쓴다(09 §3-6).
 */
export function countCorrect(questions, answers) {
  return (questions ?? []).reduce(
    (sum, question, index) => sum + ((answers ?? [])[index] === question.answerIndex ? 1 : 0),
    0,
  );
}

/* ── 추천 ──────────────────────────────────────────────── */

/**
 * 추천 후보 — **입장 가능한 코스 전체**를 학습 순서(courseNo)로. 계단과 다른 목록이다(09 §3-2).
 * 준비중은 애초에 후보가 아니라, 입문이 준비중이면 자동으로 그다음 코스가 첫 코스가 된다.
 */
export function recommendCandidates(courses) {
  return (courses ?? [])
    .filter((course) => course.status === "AVAILABLE")
    .sort((a, b) => a.courseNo - b.courseNo);
}

/**
 * 추천 판정 (09 §3-2).
 *
 *   통과한 단계 없음               → 입장 가능한 **첫 코스**
 *   레벨 L까지 통과, 다음 단계 있음 → 다음 단계 레벨의 코스
 *   전부 통과                     → 가장 높은 공개 코스 + allPassed
 */
export function recommend({ courses, stageResults }) {
  const plan = stagePlan(courses);
  const candidates = recommendCandidates(courses);
  if (plan.length === 0 || candidates.length === 0) return null;

  // 계단은 실패에서 즉시 끝나므로 앞에서부터 연속 통과 수를 센다
  let passedCount = 0;
  for (const stage of stageResults ?? []) {
    if (!isStagePassed(stage.correct, stage.total)) break;
    passedCount += 1;
  }

  const allPassed = passedCount >= plan.length;
  const courseOfStage = (index) => plan[index]?.courseId ?? null;
  const recommendedCourseId = allPassed
    ? candidates[candidates.length - 1].id
    : passedCount === 0
      ? candidates[0].id
      : courseOfStage(passedCount);
  const stepDownCourseId = allPassed
    ? courseOfStage(plan.length - 2)
    : passedCount === 0
      ? null // 첫 코스 아래로는 더 내려갈 곳이 없다
      : courseOfStage(passedCount - 1);

  return {
    recommendedCourseId,
    stepDownCourseId,
    allPassed,
    stages: stageResults ?? [],
  };
}
