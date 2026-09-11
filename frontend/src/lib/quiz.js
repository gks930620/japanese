// 퀴즈 생성 규칙 (설계/09 §1 — 스택 공용) — 전부 순수 함수, RNG 주입(rng: () => number, 0≤x<1).
// 앱(Flutter)은 이 규칙·같은 테스트 벡터로 구현한다. 캐시하지 않는다 — 매 세트 새로 생성(Q16).

/** rng 주입 셔플 (Fisher–Yates) — 원본을 바꾸지 않는다 */
function shuffle(list, rng) {
  const out = [...list];
  for (let i = out.length - 1; i > 0; i -= 1) {
    const j = Math.floor(rng() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

function slugOf(type) {
  return type.toLowerCase().replace(/_/g, "-");
}

/**
 * 보기 4개 조립 — 오답 후보에서 정답과 다른 값 3개를 채우고 정답 자리를 rng로 정한다(Q5·Q6).
 * 값이 같은 후보는 버리고 다음 후보로. **3개를 못 채우면 null**(문제 단위로 조용히 버린다 — Q7).
 *
 * `candidateGroups`는 **우선순위 그룹**이다(예: 같은 품사 → 그 밖). 앞 그룹부터 채우고
 * **셔플은 그룹 안에서만** 한다 — 전체를 한 번에 섞으면 우선순위가 사라진다(설계/09 §1-2).
 */
function assembleChoices(answer, candidateGroups, rng) {
  const groups = Array.isArray(candidateGroups[0]) ? candidateGroups : [candidateGroups];
  const distractors = [];
  const seen = new Set([answer]);

  for (const group of groups) {
    for (const value of shuffle(group ?? [], rng)) {
      if (distractors.length === 3) break;
      if (value == null || value === "" || seen.has(value)) continue;
      seen.add(value);
      distractors.push(value);
    }
    if (distractors.length === 3) break;
  }
  if (distractors.length < 3) return null;

  const answerIndex = Math.floor(rng() * 4);
  const choices = [...distractors];
  choices.splice(answerIndex, 0, answer);
  return { choices, answerIndex };
}

function makeQuestion({ type, targetId, prompt, answer, candidates, evidence, rng }) {
  const assembled = assembleChoices(answer, candidates, rng);
  if (!assembled) return null;
  return { id: `${slugOf(type)}-${targetId}`, type, prompt, ...assembled, evidence };
}

/** 문법 표현 = name에서 선행 〜 제거 (설계/09 §1-2) */
function grammarExpression(grammarItem) {
  return grammarItem.name.replace(/^〜/, "");
}

/* ── 대상별 문제 생성 — 각 함수는 "만들 수 있으면 문제, 아니면 null" ── */

function kanjiQuestion(target, others, rng) {
  const types = [];
  if (target.onyomi || target.kunyomi) types.push("KANJI_READING");
  types.push("KANJI_MEANING");
  if ((target.words ?? []).some((w) => w.kana)) types.push("KANJI_WORD_READING");

  for (const type of shuffle(types, rng)) {
    let question = null;
    if (type === "KANJI_READING") {
      // 음/훈은 있는 쪽에서 rng로 고르고, 오답은 다른 한자의 **같은 종류** 읽기
      const sides = [target.onyomi && "onyomi", target.kunyomi && "kunyomi"].filter(Boolean);
      const side = sides[Math.floor(rng() * sides.length)];
      question = makeQuestion({
        type,
        targetId: target.id,
        prompt: { main: target.letter, sub: side === "onyomi" ? "이 글자의 음독은?" : "이 글자의 훈독은?" },
        answer: target[side],
        candidates: others.map((k) => k[side]),
        evidence: target,
        rng,
      });
    } else if (type === "KANJI_MEANING") {
      question = makeQuestion({
        type,
        targetId: target.id,
        prompt: { main: target.letter, sub: "이 글자의 훈음은?" },
        answer: target.meaningKo,
        candidates: others.map((k) => k.meaningKo),
        evidence: target,
        rng,
      });
    } else {
      const words = (target.words ?? []).filter((w) => w.kana);
      const word = words[Math.floor(rng() * words.length)];
      const otherWords = others.flatMap((k) => (k.words ?? []).filter((w) => w.kana).map((w) => w.kana));
      question = makeQuestion({
        type,
        targetId: target.id,
        prompt: { main: word.word, sub: "이 단어의 읽는 법은?" },
        answer: word.kana,
        candidates: otherWords,
        evidence: target,
        rng,
      });
    }
    if (question) return question;
  }
  return null;
}

function vocabQuestion(target, others, rng, { only = null, render = null } = {}) {
  const shown = render ? render(target) : { main: target.word, kana: null };
  const types = ["VOCAB_MEANING", "VOCAB_WORD"];
  if (target.kana) types.push("VOCAB_READING"); // kana 계약 = 출제 가능 여부(설계/09 §1-2)

  // 진단은 레벨이 유형을 정한다(09 §3-3) — only가 오면 대체 유형을 찾지 않는다
  for (const type of only ? [only] : shuffle(types, rng)) {
    let question = null;
    if (type === "VOCAB_MEANING") {
      // 같은 품사 우선, 3개 못 채우면 범위 전체에서 보충
      const samePos = others.filter((v) => v.partOfSpeech === target.partOfSpeech).map((v) => v.meaningKo);
      const rest = others.filter((v) => v.partOfSpeech !== target.partOfSpeech).map((v) => v.meaningKo);
      question = makeQuestion({
        type,
        targetId: target.id,
        prompt: { main: shown.main, kana: shown.kana ?? null, sub: "이 단어의 뜻은?" },
        answer: target.meaningKo,
        candidates: [samePos, rest],
        evidence: target,
        rng,
      });
    } else if (type === "VOCAB_WORD") {
      question = makeQuestion({
        type,
        targetId: target.id,
        prompt: { main: target.meaningKo, kana: null, sub: "이 뜻에 맞는 단어는?" },
        answer: target.word,
        candidates: others.map((v) => v.word),
        evidence: target,
        rng,
      });
    } else {
      question = makeQuestion({
        type,
        targetId: target.id,
        prompt: { main: shown.main, kana: null, sub: "이 단어의 읽는 법은?" },
        answer: target.kana,
        candidates: others.map((v) => v.kana).filter(Boolean),
        evidence: target,
        rng,
      });
    }
    if (question) return question;
  }
  return null;
}

function grammarQuestion(target, others, rng, { only = null } = {}) {
  // 예문 jp에 표현이 실제로 포함된 것이 있을 때만 빈칸, 못 찾으면 뜻 유형(Q8)
  const expression = grammarExpression(target);
  const clozeSource = (target.examples ?? []).filter((ex) => expression && ex.jp.includes(expression));

  const types = clozeSource.length > 0 ? ["GRAMMAR_CLOZE", "GRAMMAR_MEANING"] : ["GRAMMAR_MEANING"];
  if (only && !types.includes(only)) return null; // 진단은 유형이 고정이라 다른 유형으로 대체하지 않는다
  for (const type of only ? [only] : shuffle(types, rng)) {
    let question = null;
    if (type === "GRAMMAR_CLOZE") {
      const example = clozeSource[Math.floor(rng() * clozeSource.length)];
      question = makeQuestion({
        type,
        targetId: target.id,
        // 표현을 가린 지문 + 뜻 문장(sub)이 힌트다
        prompt: { main: example.jp.split(expression).join("＿＿"), kana: null, sub: example.meaningKo },
        answer: target.name,
        candidates: others.map((g) => g.name),
        evidence: target,
        rng,
      });
    } else {
      question = makeQuestion({
        type,
        targetId: target.id,
        prompt: { main: target.name, kana: null, sub: "이 문법의 뜻은?" },
        answer: target.nameKo,
        candidates: others.map((g) => g.nameKo),
        evidence: target,
        rng,
      });
    }
    if (question) return question;
  }
  return null;
}

/**
 * 표현 문항 (영어 유닛 — 한자 자리) — 규칙은 문법·어휘와 같다.
 *  · 예문(en)에 표현이 실제로 들어 있을 때만 빈칸, 없으면 뜻 유형으로 물러선다(Q8과 같은 판단)
 *  · 보기 3개를 못 채우면 그 문제는 내지 않는다(Q7)
 * 한자 유형은 영어에 존재하지 않는다 — 글자 단위 학습이 없다.
 */
function expressionQuestion(target, others, rng) {
  const clozeSource = (target.examples ?? []).filter((example) => example.en?.includes(target.text));
  const types = clozeSource.length > 0
    ? ["EXPRESSION_CLOZE", "EXPRESSION_MEANING", "EXPRESSION_TEXT"]
    : ["EXPRESSION_MEANING", "EXPRESSION_TEXT"];

  for (const type of shuffle(types, rng)) {
    let question = null;
    if (type === "EXPRESSION_CLOZE") {
      const example = clozeSource[Math.floor(rng() * clozeSource.length)];
      question = makeQuestion({
        type,
        targetId: target.id,
        // 표현을 가린 지문 + 한국어 뜻(sub)이 힌트다
        prompt: { main: example.en.split(target.text).join("＿＿"), sub: example.meaningKo },
        answer: target.text,
        candidates: others.map((expression) => expression.text),
        evidence: target,
        rng,
      });
    } else if (type === "EXPRESSION_MEANING") {
      question = makeQuestion({
        type,
        targetId: target.id,
        prompt: { main: target.text, sub: "이 표현의 뜻은?" },
        answer: target.meaningKo,
        candidates: others.map((expression) => expression.meaningKo),
        evidence: target,
        rng,
      });
    } else {
      question = makeQuestion({
        type,
        targetId: target.id,
        prompt: { main: target.meaningKo, sub: "이 뜻에 맞는 표현은?" },
        answer: target.text,
        candidates: others.map((expression) => expression.text),
        evidence: target,
        rng,
      });
    }
    if (question) return question;
  }
  return null;
}

/**
 * 문장 뜻 문항 SENTENCE_MEANING (설계/09 §1-2 · §3-3) — **진단에서 쓰는 유형**이다.
 * 지문은 문법의 예문이고 정답은 그 예문의 뜻, 오답은 **같은 레벨 다른 문법**의 예문 뜻이다.
 * 보기는 여기서도 4개다 — 다섯 번째 [모르겠어요]는 진단이 따로 얹는다(09 §1-4).
 *
 * @param {(example) => boolean} [canUseExample] 표기 규칙상 지문으로 쓸 수 있는 예문인가(09 §3-4)
 * @param {(example) => {main: string, kana: string|null}} [render] 레벨별 표기(치환·병기)
 */
function sentenceQuestion(target, others, rng, { canUseExample = () => true, render = null } = {}) {
  const example = (target.examples ?? []).find(
    (item) => item?.jp && item?.meaningKo && canUseExample(item),
  );
  if (!example) return null;

  const shown = render ? render(example) : { main: example.jp, kana: null };
  const candidates = others
    .flatMap((item) => item.examples ?? [])
    .map((item) => item?.meaningKo)
    .filter(Boolean);

  return makeQuestion({
    type: "SENTENCE_MEANING",
    targetId: target.id,
    prompt: { main: shown.main, kana: shown.kana ?? null, sub: "이 문장의 뜻은?" },
    answer: example.meaningKo,
    candidates,
    evidence: target,
    rng,
  });
}

/** 오답 후보 = 출제 범위 + 오답 풀(호출자가 준다) − 정답 대상 자신 (설계/09 §1-3) */
function otherItems(target, rangeItems, poolItems) {
  const merged = [...rangeItems, ...(poolItems ?? [])];
  const seen = new Set();
  return merged.filter((item) => {
    if (item.id === target.id || seen.has(item.id)) return false;
    seen.add(item.id);
    return true;
  });
}

/**
 * 유닛 확인 문제 세트 (설계/09 §2-1) — 최대 10문항: 문법 2~3 · 한자 3~4 · 어휘 4 목표.
 * 재료가 모자라면 만들 수 있는 것부터 — **실제 문항 수가 세트의 사실**이다(Q3).
 *
 * 영어 유닛은 **한자 자리에 표현**이 온다: 재료에 kanjis가 없고 expressions가 있을 뿐이라
 * 세트 함수를 두 벌로 두지 않는다(없는 재료의 계획은 대상 0개라 자연히 건너뛴다).
 */
export function buildUnitQuizSet(material, { rng, distractorPool } = {}) {
  const pool = distractorPool ?? {};
  const plans = [
    { items: material.grammars ?? [], poolItems: pool.grammars, make: grammarQuestion, want: 3 },
    { items: material.kanjis ?? [], poolItems: pool.kanjis, make: kanjiQuestion, want: 4 },
    { items: material.expressions ?? [], poolItems: pool.expressions, make: expressionQuestion, want: 4 },
    { items: material.vocabularies ?? [], poolItems: pool.vocabularies, make: vocabQuestion, want: 4 },
  ];

  const questions = [];
  for (const plan of plans) {
    const remaining = 10 - questions.length;
    if (remaining <= 0) break;
    const targets = shuffle(plan.items, rng).slice(0, Math.min(plan.want, remaining));
    for (const target of targets) {
      const question = plan.make(target, otherItems(target, plan.items, plan.poolItems), rng);
      if (question) questions.push(question); // 못 만든 문제는 조용히 건너뛴다(Q7)
    }
  }
  return { questions };
}

/**
 * 자료실 퀴즈 세트 (설계/09 §2-2) — 들어온 탭의 유형만.
 * **범위 크기 < 4면 세트를 만들지 않는다**(Q21 — 진입 버튼 비활성의 근거).
 */
export function buildLibraryQuizSet({ type, items, count, rng }) {
  if ((items ?? []).length < 4) return { questions: [] };

  const make = type === "kanji" ? kanjiQuestion : type === "grammar" ? grammarQuestion : vocabQuestion;
  const questions = [];
  for (const target of shuffle(items, rng)) {
    if (questions.length >= count) break;
    const question = make(target, otherItems(target, items, null), rng);
    if (question) questions.push(question);
  }
  return { questions };
}

/**
 * [틀린 문제만 다시 풀기] — 생성이 아니라 **기존 세트의 부분집합**이다(설계/09 §2-4 · Q15).
 * 같은 문제·같은 보기 그대로, 순서도 원래 세트의 순서를 따른다.
 */
export function buildRetrySet(set, wrongIds) {
  return { questions: set.questions.filter((question) => wrongIds.includes(question.id)) };
}

/**
 * 진단 전용 진입점 (설계/09 §3-3 구현 경계표) — **문항 한 개를 만드는 규칙은 이 파일 하나**다.
 * 단계 구성·표기 규칙 적용·[모르겠어요] 얹기는 lib/diagnosis.js가 한다.
 */
export const diagnosisGenerators = {
  vocab: vocabQuestion,
  grammar: grammarQuestion,
  sentence: sentenceQuestion,
  others: otherItems,
};
