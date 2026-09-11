import { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { callPublicApi } from "../lib/http.js";
import {
  STAGE_SIZE,
  buildStageQuestions,
  countCorrect,
  isStagePassed,
  recommend,
  recommendCandidates,
  stagePlan,
} from "../lib/diagnosis.js";
import { toQuizVocabularies } from "../lib/quizMaterial.js";
import { Button } from "../components/ui/Button.jsx";
import { Table, TableWrap } from "../components/ui/Table.jsx";
import { btnClass, cardClass } from "../components/ui/kitClass.js";
import { ApiErrorCard } from "../components/StateCards.jsx";

/** 자료실 한 번에 받는 양 — 04 §3-5의 size 상한. 문법은 레벨 전량이 한 페이지에 들어온다 */
const PAGE_SIZE = 100;

/**
 * 한 단계의 재료 — **어휘와 문법 둘만** 부른다(설계/09 §3-3).
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
 * 실력 진단 (설계/09 §3 · 05 §15-2) — 시작 → 단계(6문항 한 화면) → 결과가 한 주소의 상태 전환.
 *
 * 화면의 계약 두 가지가 특히 중요하다:
 *  · **제출 전에는 답을 몇 번이든 바꿀 수 있다** → 보기는 버튼이 아니라 라디오다(09 §3-7)
 *  · **정오를 어디에서도 보여주지 않는다** → 정답 표시·근거 박스·맞은 개수가 **DOM에 없다**(CSS 숨김이 아니다)
 */
export function DiagnosisPage() {
  const [courses, setCourses] = useState(null);
  const [coursesError, setCoursesError] = useState(false);
  const [phase, setPhase] = useState("start"); // start | loading | stage | error | result
  const [stageIndex, setStageIndex] = useState(0);
  const [questions, setQuestions] = useState([]);
  const [answers, setAnswers] = useState([]);
  const [stageResults, setStageResults] = useState([]);
  const [unavailableLevel, setUnavailableLevel] = useState(null); // 2단계 이후 재료 부족의 사유
  const submitting = useRef(false); // 연타 = 첫 클릭만(09 §3-6)

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

  const finish = (results, reason = null) => {
    setStageResults(results);
    setUnavailableLevel(reason);
    setPhase("result");
  };

  const startStage = async (index, resultsSoFar) => {
    setPhase("loading");
    setStageIndex(index);
    setStageResults(resultsSoFar);
    let materials = null;
    try {
      materials = await fetchStageMaterials(plan[index].levelCode, Math.random);
    } catch {
      // 호출 실패는 재료 부족과 다르다 — 같은 단계를 다시 시도할 수 있어야 한다(09 §3-6)
      setPhase("error");
      return;
    }

    const stageQuestions = buildStageQuestions({
      levelCode: plan[index].levelCode,
      ...materials,
      rng: Math.random,
    });

    if (stageQuestions.length === 0) {
      // 첫 단계가 비면 판단 근거가 하나도 없다 → 실패 카드.
      // 2단계 이후가 비면 이미 근거가 있다 → 지금까지의 결과로 결론을 내고 사유를 말한다(09 §3-6).
      if (index === 0) setPhase("error");
      else finish(resultsSoFar, plan[index].levelLabel);
      return;
    }

    setQuestions(stageQuestions);
    setAnswers(stageQuestions.map(() => null));
    setPhase("stage");
  };

  const choose = (questionIndex, choiceIndex) => {
    setAnswers((prev) => prev.map((value, index) => (index === questionIndex ? choiceIndex : value)));
  };

  const submitStage = async () => {
    if (submitting.current) return;
    submitting.current = true;
    try {
      const correct = countCorrect(questions, answers);
      const stage = plan[stageIndex];
      const results = [
        ...stageResults,
        { levelCode: stage.levelCode, levelLabel: stage.levelLabel, correct, total: questions.length },
      ];
      // 통과선은 만들어진 문항 수에서 나온다 — 5문항 단계에도 같은 비율이 걸린다(09 §3-6)
      if (isStagePassed(correct, questions.length) && stageIndex + 1 < plan.length) {
        await startStage(stageIndex + 1, results);
      } else {
        finish(results);
      }
    } finally {
      submitting.current = false;
    }
  };

  const reset = () => {
    setPhase("start");
    setStageResults([]);
    setAnswers([]);
    setQuestions([]);
    setStageIndex(0);
    setUnavailableLevel(null);
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

  /* ── 시작 (A1) — 무엇이 나오는지 먼저 말한다. "3분"은 거짓말이 된다(최대 36문항) ── */
  if (phase === "start") {
    return (
      <section className="diag-wrap">
        <div className={cardClass({ className: "quiz-card" })}>
          <div className="step-caption">실력 진단</div>
          <h2 className="step-title">어디서 시작할지 알아볼까요</h2>
          <p>
            한 레벨에 {STAGE_SIZE}문항씩, 한 화면에서 한 번에 제출해요. 낮은 레벨부터 최대 {plan.length}단계까지
            올라갑니다.
          </p>
          <p>모르는 문항은 [모르겠어요]를 고르면 돼요 — 넘어가도 괜찮습니다.</p>
          <p className="quiz-note">결과는 저장되지 않아요.</p>
          <div className="k-flex quiz-result-actions">
            <Button variant="primary" onClick={() => startStage(0, [])}>
              시작하기
            </Button>
          </div>
        </div>
      </section>
    );
  }

  /* ── 재료를 못 만들었을 때 — 학습으로 가는 길을 막지 않는다(09 §3-6) ── */
  if (phase === "error") {
    return (
      <section className="diag-wrap">
        <div className={cardClass({ className: "quiz-card" })}>
          <div className="step-caption">실력 진단</div>
          <p>문제를 준비하지 못했어요.</p>
          <div className="k-flex quiz-result-actions">
            {firstCourse && (
              <Link className={btnClass({ variant: "primary" })} to={`/courses/${firstCourse.id}`}>
                일단 {firstCourse.title}부터 시작하기
              </Link>
            )}
            <Button variant="secondary" onClick={() => startStage(stageIndex, stageResults)}>
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

  /* ── 결과 (A19) — 진행한 단계만 행이 된다. 가지 않은 단계로 빈 행을 만들지 않는다 ── */
  if (phase === "result") {
    const verdict = recommend({ courses, stageResults });
    const recommended = courses.find((course) => course.id === verdict?.recommendedCourseId) ?? firstCourse;
    const passed = stageResults.filter((stage) => isStagePassed(stage.correct, stage.total));
    const lastPassed = passed[passed.length - 1] ?? null;

    return (
      <section className="diag-wrap">
        <div className={cardClass({ className: "quiz-card" })}>
          <div className="step-caption">진단 결과</div>
          {/* 조용히 끝내지 않는다 — 왜 여기서 멈췄는지 한 줄로 말한다(09 §3-6) */}
          {unavailableLevel && (
            <p className="quiz-note">
              {unavailableLevel} 단계는 문제를 준비하지 못해 여기까지로 판단했어요.
            </p>
          )}
          <h1 className="diag-headline">
            {recommended.title}({recommended.levelLabel})부터 시작하세요
          </h1>
          <p>
            {lastPassed
              ? `${lastPassed.levelLabel} 내용까지는 익숙하고, 그 위부터 새로운 것이 많아요.`
              : "기초부터 차근차근 시작하는 게 좋아요."}
          </p>
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
                {stageResults.map((stage) => (
                  <tr key={stage.levelLabel}>
                    <th scope="row">{stage.levelLabel}</th>
                    <td>
                      {stage.correct} / {stage.total}
                    </td>
                    <td>{isStagePassed(stage.correct, stage.total) ? "통과" : "—"}</td>
                  </tr>
                ))}
              </tbody>
            </Table>
          </TableWrap>
          {/* 오지 않을 약속을 하지 않는다(08 C-12 ②) — 준비중 코스가 실제로 있을 때만 */}
          {verdict?.allPassed && hasPreparingCourse && (
            <p className="muted-text">그 위 코스는 지금 준비하고 있어요.</p>
          )}
          <div className="k-flex quiz-result-actions">
            <Link className={btnClass({ variant: "primary" })} to={`/courses/${recommended.id}`}>
              {recommended.title}({recommended.levelLabel}) 코스 시작하기 ›
            </Link>
            {verdict?.stepDownCourseId != null && (
              <Link className={btnClass({ variant: "secondary" })} to={`/courses/${verdict.stepDownCourseId}`}>
                한 단계 아래부터 보기
              </Link>
            )}
            <Button variant="ghost" onClick={reset}>
              다시 진단하기
            </Button>
          </div>
          <p className="quiz-note">이 결과는 저장되지 않아요. 새로고침하면 사라져요.</p>
        </div>
      </section>
    );
  }

  /* ── 단계 화면 (A3~A6) — 6문항이 한 화면에, 제출 버튼은 하나 ── */
  const stage = plan[stageIndex];
  const unanswered = answers.filter((value) => value == null).length;
  const isLastStage = stageIndex + 1 >= plan.length;

  return (
    <section className="diag-wrap">
      <div className={cardClass({ className: "quiz-card" })}>
        {/* 전체 분모를 쓰지 않는다 — 총 문항이 가변이라 "5 / 36"은 거짓 약속이 된다(09 §3-7) */}
        <p className="quiz-progress">
          {stage.levelLabel} 단계 · {questions.length}문항
        </p>

        {questions.map((question, index) => (
          <fieldset key={question.id} className="diag-question">
            <legend>
              {index + 1}. {question.prompt.sub}
            </legend>
            <p className="quiz-prompt jp">{question.prompt.main}</p>
            {/* 후리가나는 루비가 아니라 줄 병기다 — 데이터가 글자별 대응을 갖고 있지 않다(09 §3-4) */}
            {question.prompt.kana && <p className="quiz-prompt-sub jp">{question.prompt.kana}</p>}
            <div className="quiz-choices">
              {question.choices.map((choice, choiceIndex) => (
                <label key={choiceIndex} className="quiz-choice">
                  <input
                    checked={answers[index] === choiceIndex}
                    name={question.id}
                    type="radio"
                    value={choiceIndex}
                    onChange={() => choose(index, choiceIndex)}
                  />
                  <span>{choice}</span>
                </label>
              ))}
            </div>
          </fieldset>
        ))}

        {/* 미응답이 있어도 제출을 막지 않는다 — 사실만 한 줄로 말한다(09 §3-6). 확인 모달은 없다 */}
        {unanswered > 0 && (
          <p className="quiz-note">아직 {unanswered}문항을 고르지 않았어요 — 그대로 제출하면 모름으로 처리돼요.</p>
        )}
        <div className="k-flex quiz-result-actions">
          <Button variant="primary" onClick={submitStage}>
            {isLastStage ? "제출하고 결과 보기 ›" : "제출하고 다음 단계로 ›"}
          </Button>
        </div>
      </div>
    </section>
  );
}
