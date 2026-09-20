import { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { callPublicApi } from "../lib/http.js";
import {
  STAGE_SIZE,
  buildStageQuestions,
  countCorrect,
  groupQuestions,
  isStagePassed,
  nextLevelOffer,
  recommend,
  recommendCandidates,
  recordLevelResult,
  stagePlan,
} from "../lib/diagnosis.js";
import { toQuizVocabularies } from "../lib/quizMaterial.js";
import { Button } from "../components/ui/Button.jsx";
import { Table, TableWrap } from "../components/ui/Table.jsx";
import { btnClass, cardClass } from "../components/ui/kitClass.js";
import { ApiErrorCard } from "../components/StateCards.jsx";

/** 남은 수 줄의 id — 제출 버튼이 `aria-describedby`로 가리킨다(09 §3-7). 화면에 한 줄뿐이라 상수로 둔다 */
const REMAINING_ID = "diag-remaining";

/** 문항 안내 줄의 id — 미응답 문항이 `aria-describedby`로 가리킨다. 이 화면이 만드는 id는 위와 이것 둘뿐이다 */
const helpIdOf = (questionId) => `diag-q${questionId}-help`;

/**
 * 미응답인가 — **`== null`이어야 한다.** `!value`로 바꾸면 보기 0번(첫 보기)을 고른 문항이
 * 미응답이 되어 제출이 영영 막힌다. 판정이 세 곳(제출 검사·남은 수·안내 줄)에서 쓰이므로 여기 하나로 둔다.
 */
const isUnanswered = (value) => value == null;

/** 자료실 한 번에 받는 양 — 04 §3-5의 size 상한. 문법은 레벨 전량이 한 페이지에 들어온다 */
const PAGE_SIZE = 100;

/**
 * 한 판의 재료 — **어휘와 문법 둘만** 부른다(설계/09 §3-3).
 * 한자 낱자 문항이 빠졌으므로 한자 자료실을 부를 이유가 없다(입문에서는 0건을 기다리는 낭비다).
 * 문법 예문은 **목록이 함께 준다**(04 §3-5) — 문법 상세를 문법 수만큼 왕복하지 않는다.
 */
async function fetchStageMaterials(levelCode, rng) {
  // 자료실은 level_code 값만 받는다 — 서버가 준 levelCode를 가공 없이 넘긴다(04 §3-1)
  const levelQuery = levelCode ? `level=${levelCode}&` : "";
  const ask = (type, page = 0) =>
    callPublicApi(`/api/library/${type}?${levelQuery}size=${PAGE_SIZE}&page=${page}`);

  const [vocabPage, grammarPage] = await Promise.all([ask("vocabulary"), ask("grammar")]);

  let vocabContent = vocabPage?.data?.content ?? [];
  const vocabPages = vocabPage?.data?.totalPages ?? 1;
  // 한 창보다 많으면 무작위 창에서 뽑는다 — 늘 앞쪽만 쓰면 출제 범위가 모집단과 어긋난다
  if (vocabPages > 1) {
    const pick = Math.floor(rng() * vocabPages);
    if (pick > 0) {
      const other = await ask("vocabulary", pick);
      vocabContent = other?.data?.content?.length ? other.data.content : vocabContent;
    }
  }

  return {
    // 자료실 어휘 표제어는 뜻이 senses[]에 있다 — 출제 재료 모양으로 바꾼다(09 §1-5)
    vocabItems: toQuizVocabularies(vocabContent),
    grammarItems: grammarPage?.data?.content ?? [],
  };
}

/**
 * 결과 화면의 본문 한 줄 — 방금 친 판의 판정 × 이어가기 상태(09 §3-2-1 · 기획 §14-3 확정 문구).
 * 없는 버튼의 자리는 이 문구가 대신 말한다 — 비활성 버튼을 두지 않는다.
 */
const RESULT_BODY = {
  passed: {
    OFFER: "다음 레벨에 도전해 볼까요?",
    END_OF_LIST: "가장 높은 레벨까지 확인했어요 — 더 볼 위 레벨이 없어요.",
    ALREADY_PASSED: "더 확인할 레벨이 없어요.",
  },
  failed: {
    OFFER: "한 단계 아래 레벨을 확인해 볼까요?",
    END_OF_LIST: "여기가 가장 낮은 레벨이에요.",
    ALREADY_PASSED: "아래 레벨은 이미 충분했어요 — 여기부터 공부하면 돼요.",
  },
};

/**
 * 실력 진단 (설계/09 §3 · 05 §15-2) — **한 레벨 = 한 판.**
 * 레벨 고르기 → 문항(6문항 한 화면) → 결과 → (사용자가 누를 때만) 다음 판, 전부 한 주소의 상태 전환이다.
 *
 * 기억할 문장은 하나다: **"제출하면 항상 결과 화면이다."** 자동 진행은 어느 방향으로도 없다(09 §3-6).
 * 화면의 계약 두 가지가 특히 중요하다:
 *  · **제출 전에는 답을 몇 번이든 바꿀 수 있다** → 보기는 버튼이 아니라 라디오다(09 §3-7)
 *  · **정오를 어디에서도 보여주지 않는다** → 정답 표시·근거 박스·맞은 개수가 **DOM에 없다**(CSS 숨김이 아니다)
 *
 * 두 계산을 섞지 않는다(09 §3-2-1): 이어가기 버튼은 `nextLevelOffer`(방금 친 한 판), 추천은 `recommend`(지금까지 전부).
 */
export function DiagnosisPage() {
  const [courses, setCourses] = useState(null);
  const [coursesError, setCoursesError] = useState(false);
  const [phase, setPhase] = useState("start"); // start | loading | stage | error | result
  const [selectedLevelCode, setSelectedLevelCode] = useState(null); // null = 기본값(가장 낮은 레벨)
  const [activeLevel, setActiveLevel] = useState(null); // 지금 부르거나 치는 레벨(stagePlan 항목)
  const [questions, setQuestions] = useState([]);
  const [answers, setAnswers] = useState([]);
  const [attempted, setAttempted] = useState(false); // 제출을 한 번이라도 시도했나 — 미응답 안내 줄은 시도 뒤에만 붙는다(09 §3-6)
  const [results, setResults] = useState([]); // 판 기록 — 레벨당 한 행, 레벨 순(recordLevelResult)
  const [lastRound, setLastRound] = useState(null); // 방금 친 한 판 — 결과 캡션·이어가기의 근거
  const submitting = useRef(false); // 연타 = 첫 클릭만(09 §3-6). 화면 전환이 막고, 같은 틱의 두 번째 클릭은 이 가드가 막는다
  const questionRefs = useRef([]); // 문항 번호-1 → fieldset. 막힌 제출이 데려갈 곳을 찾는 데만 쓴다(09 §3-7)

  useEffect(() => {
    let cancelled = false;
    callPublicApi("/api/courses")
      .then((body) => {
        if (!cancelled) setCourses(body?.data ?? []);
      })
      .catch(() => {
        if (!cancelled) setCoursesError(true);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const plan = useMemo(() => stagePlan(courses ?? []), [courses]);
  // 재료를 못 만들었을 때의 대체 동선 — **추천과 같은 첫 코스**를 가리킨다(09 §3-2).
  // 학습으로 가는 길을 막지 않는다: 진단은 목적이 아니라 수단이다.
  const firstCourse = recommendCandidates(courses ?? [])[0] ?? null;
  // N1은 마지막 코스다 — 그 위에 준비중인 것이 없으면 "준비 중" 안내 자체를 하지 않는다(08 C-12 ②)
  const hasPreparingCourse = (courses ?? []).some((course) => course.status === "PREPARING");
  // 기본 선택값은 언제나 목록의 가장 낮은 레벨이다 — 되돌아온 사용자에게도 같다(09 §3-1)
  const selectedLevel = plan.find((level) => level.levelCode === selectedLevelCode) ?? plan[0] ?? null;

  /** 한 판을 시작한다 — [시작하기]·[도전하기]·[확인하기]·[다시 시도] 전부 이 하나로 온다 */
  const loadLevel = async (level) => {
    setActiveLevel(level);
    setPhase("loading");
    let materials = null;
    try {
      materials = await fetchStageMaterials(level.levelCode, Math.random);
    } catch {
      // 호출 실패도 재료 부족과 같은 실패 카드다 — 사용자가 할 수 있는 일이 같다(09 §3-6)
      setPhase("error");
      return;
    }

    const stageQuestions = buildStageQuestions({
      levelCode: level.levelCode,
      ...materials,
      rng: Math.random,
    });

    // 3문항 미만이면 lib이 빈 배열을 준다 — 이 판은 측정하지 않고, 말없이 결과 화면으로 되돌리지 않는다(09 §3-6)
    if (stageQuestions.length === 0) {
      setPhase("error");
      return;
    }

    setQuestions(stageQuestions);
    setAnswers(stageQuestions.map(() => null));
    setAttempted(false);
    submitting.current = false;
    setPhase("stage");
  };

  const choose = (questionIndex, choiceIndex) => {
    setAnswers((prev) => prev.map((value, index) => (index === questionIndex ? choiceIndex : value)));
  };

  /**
   * 막힌 제출이 데려가는 곳 — 스크롤은 **fieldset**에, 초점은 **그 문항의 첫 라디오**에(09 §3-7).
   * `behavior`를 넘기지 않는다: 넘기면 킷 base.css의 `prefers-reduced-motion` 처리를 우회한다(화면정의 §4-3 함정 5).
   * `preventScroll`이 없으면 초점 호출이 라디오 기준으로 다시 스크롤해 안내 줄이 위로 밀린다.
   */
  const goToQuestion = (index) => {
    const card = questionRefs.current[index];
    if (!card) return;
    card.scrollIntoView({ block: "start" });
    // fieldset이 아니라 라디오에 두는 이유: 화살표 한 번이 곧 답이어야 한다 — Tab으로 거슬러 오르지 않는다
    card.querySelector('input[type="radio"]')?.focus({ preventScroll: true });
  };

  /** 제출 — 채점은 여기서 끝난다. 부를 재료가 없으므로 결과 화면까지 로딩이 없다(09 §3-6) */
  const submitLevel = () => {
    // ★ 미응답 검사가 가드보다 **먼저**다(09 §3-6). 가드를 먼저 켜면 막힌 첫 클릭이 그 다음 정상 제출까지 영영 막는다
    const firstUnanswered = answers.findIndex(isUnanswered);
    if (firstUnanswered >= 0) {
      // 막힌 시도는 흔적을 남기지 않는다 — 판 기록·채점·추천 어느 것도 일어나지 않고 submitting도 건드리지 않는다
      setAttempted(true);
      goToQuestion(firstUnanswered);
      return;
    }
    if (submitting.current) return;
    submitting.current = true;
    const correct = countCorrect(questions, answers);
    const total = questions.length;
    setResults((prev) =>
      recordLevelResult(prev, {
        levelCode: activeLevel.levelCode,
        levelLabel: activeLevel.levelLabel,
        correct,
        total,
      }),
    );
    // 통과선은 만들어진 문항 수에서 나온다 — 5문항짜리 판에도 같은 비율이 걸린다(09 §3-6)
    setLastRound({ ...activeLevel, correct, total, passed: isStagePassed(correct, total) });
    setPhase("result");
  };

  /** [다른 레벨 고르기] — 기록은 유지된다. 지우는 길은 새로고침뿐이다(09 §3-2-1) */
  const chooseAnotherLevel = () => {
    setSelectedLevelCode(null);
    setPhase("start");
  };

  if (coursesError) return <ApiErrorCard onRetry={() => window.location.reload()} />;
  if (!courses) {
    return (
      <section aria-hidden="true" className="diag-wrap">
        <div className={cardClass()}>
          <div className="k-skeleton sk-line w40" />
          <div className="k-skeleton sk-line w70" />
        </div>
      </section>
    );
  }

  /* ── 레벨 고르기 (A21~A24) — 총량을 약속하지 않는다. 한 번에 치는 것은 한 레벨뿐이다 ── */
  if (phase === "start") {
    return (
      <section className="diag-wrap">
        <div className={cardClass({ className: "quiz-card" })}>
          <div className="step-caption">실력 진단</div>
          {plan.length === 0 ? (
            // 고를 레벨이 없다 — 문제가 아니라 코스가 없는 것이라 실패 카드가 아니다. 다시 불러도 같으니 [다시 시도]도 없다(09 §3-6)
            <p>지금은 확인할 수 있는 레벨이 없어요.</p>
          ) : (
            <>
              <h2 className="step-title">어느 레벨을 확인해 볼까요</h2>
              <p>레벨을 하나 골라 {STAGE_SIZE}문항을 풀면, 그 레벨이 충분한지 알려드려요.</p>
              <p>잘 모르겠으면 그대로 [시작하기]를 누르세요 — 가장 낮은 레벨부터 확인해요.</p>
              <p>모르는 문항은 [모르겠어요]를 고르면 돼요.</p>
              {/* 레벨마다 시작 버튼을 두지 않는다 — 주 버튼은 화면에 하나이고, 오조작을 되돌릴 곳이 있어야 한다(09 §3-7) */}
              <fieldset className="diag-levels">
                <legend>어느 레벨부터 볼까요</legend>
                <div className="quiz-choices">
                  {plan.map((level) => {
                    const record = results.find((row) => row.levelCode === level.levelCode);
                    return (
                      <label key={level.levelCode} className="quiz-choice">
                        <input
                          checked={selectedLevel?.levelCode === level.levelCode}
                          name="diag-level"
                          type="radio"
                          value={level.levelCode}
                          onChange={() => setSelectedLevelCode(level.levelCode)}
                        />
                        <span>{`${level.title}(${level.levelLabel})`}</span>
                        {/* 이미 친 레벨만 지난 결과가 붙는다 — 판정 낱말은 결과 표가 말한다(A24) */}
                        {record && (
                          <span className="diag-level-mark">
                            {record.correct} / {record.total}
                          </span>
                        )}
                      </label>
                    );
                  })}
                </div>
              </fieldset>
              <p className="quiz-note">결과는 저장되지 않아요.</p>
              <div className="k-flex quiz-result-actions">
                <Button variant="primary" onClick={() => loadLevel(selectedLevel)}>
                  시작하기
                </Button>
              </div>
            </>
          )}
        </div>
      </section>
    );
  }

  /* ── 실패 카드 (A39~A41) — 재료 부족·호출 실패 공용 한 벌. 주 버튼만 "지금까지 친 판이 있나"로 갈린다 ── */
  if (phase === "error") {
    return (
      <section className="diag-wrap">
        <div className={cardClass({ className: "quiz-card" })}>
          <div className="step-caption">실력 진단</div>
          {/* 어느 레벨에서 막혔는지 말한다 — 그 정보가 다음 선택(다른 레벨 고르기)에 직접 쓰인다 */}
          <p>{`${activeLevel.title}(${activeLevel.levelLabel}) 레벨은 문제를 준비하지 못했어요.`}</p>
          <div className="k-flex quiz-result-actions">
            {results.length > 0 ? (
              <Button variant="primary" onClick={() => setPhase("result")}>
                지금까지 결과 보기
              </Button>
            ) : (
              firstCourse && (
                <Link className={btnClass({ variant: "primary" })} to={`/courses/${firstCourse.id}`}>
                  {`일단 ${firstCourse.title}부터 시작하기`}
                </Link>
              )
            )}
            <Button variant="secondary" onClick={chooseAnotherLevel}>
              다른 레벨 고르기
            </Button>
            {/* 같은 레벨을 다시 부른다 — 처음으로 되돌아가지 않는다 */}
            <Button variant="ghost" onClick={() => loadLevel(activeLevel)}>
              다시 시도
            </Button>
          </div>
        </div>
      </section>
    );
  }

  if (phase === "loading") {
    return (
      <section aria-hidden="true" className="diag-wrap">
        <div className={cardClass({ className: "quiz-card" })}>
          <div className="k-skeleton sk-line w40" />
          <div className="k-skeleton sk-line w70" />
          <div className="k-skeleton sk-row" />
        </div>
      </section>
    );
  }

  /* ── 결과 (A29~A38) — 끝나는 자리가 아니라 다음을 고르는 자리. 아무것도 안 누르는 것이 곧 끝내기다 ── */
  if (phase === "result") {
    const verdict = recommend({ courses, results });
    const recommended = courses.find((course) => course.id === verdict?.recommendedCourseId) ?? firstCourse;
    // 이어가기는 **방금 친 한 판** 기준이다 — 추천(지금까지 전부)과 다른 계산이다(09 §3-2-1)
    const offer = nextLevelOffer({ plan, results, levelCode: lastRound.levelCode, passed: lastRound.passed });
    const courseLabel = `${recommended.title} 코스 시작하기`;

    return (
      <section className="diag-wrap">
        <div className={cardClass({ className: "quiz-card" })}>
          {/* 캡션이 "어느 레벨의 결과인가"를 말해야 헤드라인이 "이 레벨은…"이라고 짧게 말할 수 있다 */}
          <div className="step-caption">{`진단 결과 · ${lastRound.title}(${lastRound.levelLabel})`}</div>
          <h1 className="diag-headline">{lastRound.passed ? "이 레벨은 충분해요" : "이 레벨은 아직 조금 어려워요"}</h1>
          <p>{RESULT_BODY[lastRound.passed ? "passed" : "failed"][offer.status]}</p>
          {/* 지금까지 친 레벨만 행, 레벨 순, 레벨당 한 행 — 행이 하나여도 그린다(A30~A32) */}
          <TableWrap>
            <Table>
              <thead>
                <tr>
                  <th scope="col">레벨</th>
                  <th scope="col">정답 수 / 문항 수</th>
                  <th scope="col">판정</th>
                </tr>
              </thead>
              <tbody>
                {results.map((row) => (
                  <tr key={row.levelCode}>
                    <th scope="row">{row.levelLabel}</th>
                    <td>
                      {row.correct} / {row.total}
                    </td>
                    {/* "미달"·"불합격"을 화면에 쓰지 않는다 — 진단이지 시험이 아니다 */}
                    <td>{isStagePassed(row.correct, row.total) ? "통과" : "—"}</td>
                  </tr>
                ))}
              </tbody>
            </Table>
          </TableWrap>
          <p>{`지금 시작한다면 ${recommended.title}(${recommended.levelLabel}) 코스가 좋아요.`}</p>
          {/* 오지 않을 약속을 하지 않는다(08 C-12 ②) — 준비중 코스가 실제로 있을 때만 */}
          {verdict?.allPassed && hasPreparingCourse && (
            <p className="muted-text">그 위 코스는 지금 준비하고 있어요.</p>
          )}
          {/* primary는 하나: 이어가기 → (없으면) 코스 시작하기. 없는 버튼은 자리도 만들지 않는다(D11) */}
          <div className="k-flex quiz-result-actions">
            {offer.status === "OFFER" ? (
              <>
                <Button variant="primary" onClick={() => loadLevel(offer.level)}>
                  {`${offer.level.levelLabel} ${lastRound.passed ? "도전하기" : "확인하기"} ›`}
                </Button>
                <Link className={btnClass({ variant: "secondary" })} to={`/courses/${recommended.id}`}>
                  {courseLabel}
                </Link>
              </>
            ) : (
              <Link className={btnClass({ variant: "primary" })} to={`/courses/${recommended.id}`}>
                {`${courseLabel} ›`}
              </Link>
            )}
            <Button variant="ghost" onClick={chooseAnotherLevel}>
              다른 레벨 고르기
            </Button>
          </div>
          <p className="quiz-note">지금까지 친 레벨 기록은 저장되지 않아요. 새로고침하면 사라져요.</p>
        </div>
      </section>
    );
  }

  /* ── 문항 화면 (A3~A6 · A25 · A28 · A42~A46) — 6문항이 갈래로 묶여 한 화면에, 제출 버튼은 하나 ── */
  const unanswered = answers.filter(isUnanswered).length;

  return (
    <section className="diag-wrap">
      <div className={cardClass({ className: "quiz-card" })}>
        {/* 전체 분모를 쓰지 않는다 — 한 번에 치는 것은 한 레벨뿐이라 총량이 없다(09 §3-7). "단계"라는 말도 없다 */}
        <p className="quiz-progress">
          {activeLevel.levelLabel} 레벨 · {questions.length}문항
        </p>

        {/* 갈래 묶음은 section이다 — fieldset으로 감싸면 낭독기가 그룹을 두 겹으로 읽는다(09 §3-7). 빈 갈래는 lib이 뺀다 */}
        {groupQuestions(questions).map((group) => (
          <section key={group.title} className="diag-group">
            <h2 className="diag-group-title">{group.title}</h2>
            {group.items.map(({ question, number }) => {
              // 안내 줄은 **제출을 시도한 뒤, 그 문항이 미응답인 동안만** 있다. 답하면 줄과 두 속성을 함께 뗀다(09 §3-7)
              const needsPick = attempted && isUnanswered(answers[number - 1]);
              const helpId = helpIdOf(question.id);
              return (
                <fieldset
                  key={question.id}
                  ref={(node) => {
                    questionRefs.current[number - 1] = node;
                  }}
                  aria-describedby={needsPick ? helpId : undefined}
                  aria-invalid={needsPick ? "true" : undefined}
                  className="diag-question"
                  // ARIA 1.2에서 aria-invalid가 허용되는 역할이다(fieldset 기본 역할 group에는 허용되지 않는다). 이름은 여전히 legend가 준다
                  role="radiogroup"
                >
                  <legend>
                    {number}. {question.prompt.sub}
                  </legend>
                  {/* legend 바로 다음 자식, 지문 위. role="status"·aria-live를 쓰지 않는다 — 초점 이동이 이미 알린다 */}
                  {needsPick && (
                    <p className="diag-question-help" id={helpId}>
                      답을 골라 주세요 — 모르면 [모르겠어요]를 고르면 돼요.
                    </p>
                  )}
                  <p className="quiz-prompt jp">{question.prompt.main}</p>
                  {/* 후리가나는 루비가 아니라 줄 병기다 — 데이터가 글자별 대응을 갖고 있지 않다(09 §3-4) */}
                  {question.prompt.kana && <p className="quiz-prompt-sub jp">{question.prompt.kana}</p>}
                  <div className="quiz-choices">
                    {question.choices.map((choice, choiceIndex) => (
                      <label key={choiceIndex} className="quiz-choice">
                        <input
                          checked={answers[number - 1] === choiceIndex}
                          name={question.id}
                          type="radio"
                          value={choiceIndex}
                          onChange={() => choose(number - 1, choiceIndex)}
                        />
                        <span>{choice}</span>
                      </label>
                    ))}
                  </div>
                </fieldset>
              );
            })}
          </section>
        ))}

        {/* 남은 수는 시도 전에도 말한다. 0이면 줄이 통째로 없고, 그때는 버튼의 aria-describedby도 함께 뗀다(09 §3-7) */}
        {unanswered > 0 && (
          <p className="quiz-note" id={REMAINING_ID}>
            아직 {unanswered}문항을 고르지 않았어요 — 모두 고르면 제출할 수 있어요.
          </p>
        )}
        {/* disabled는 어느 순간에도 없다 — 막는 방법은 비활성이 아니라 첫 미응답 문항으로 데려가는 것이다(09 §3-6) */}
        <div className="k-flex quiz-result-actions">
          <Button
            aria-describedby={unanswered > 0 ? REMAINING_ID : undefined}
            variant="primary"
            onClick={submitLevel}
          >
            제출하고 결과 보기 ›
          </Button>
        </div>
      </div>
    </section>
  );
}
