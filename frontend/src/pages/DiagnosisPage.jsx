import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { callPublicApi } from "../lib/http.js";
import {
  stagePlan,
  buildStageQuestions,
  isStagePassed,
  recommend,
  recommendCandidates,
} from "../lib/diagnosis.js";
import { toQuizVocabularies } from "../lib/quizMaterial.js";
import { ApiErrorCard } from "../components/StateCards.jsx";

const STAGE_SIZE = 3;

/** 단계 재료 — GET /api/library/{type}?level={레벨}. totalPages>1이면 무작위 페이지에서 뽑는다(설계/09 §3-1) */
async function fetchStageMaterials(levelCode, rng) {
  // 자료실은 level_code 값만 받는다 — 서버가 준 levelCode를 가공 없이 넘긴다(설계/04 §3-1)
  const levelQuery = levelCode ? `level=${levelCode}&` : "";
  const one = async (type) => {
    const first = await callPublicApi(`/api/library/${type}?${levelQuery}size=50`);
    const page = first?.data;
    if (!page) return [];
    if (page.totalPages > 1) {
      const pick = Math.floor(rng() * page.totalPages);
      if (pick > 0) {
        const other = await callPublicApi(`/api/library/${type}?${levelQuery}size=50&page=${pick}`);
        return other?.data?.content ?? page.content ?? [];
      }
    }
    return page.content ?? [];
  };
  const [vocabItems, kanjiItems, grammarItems] = await Promise.all([
    one("vocabulary"),
    one("kanji"),
    one("grammar"),
  ]);
  // 자료실 어휘 표제어는 뜻이 senses[]에 있다 — 출제 재료 모양으로 바꾼다(QA 치명 2)
  return { vocabItems: toQuizVocabularies(vocabItems), kanjiItems, grammarItems };
}

/**
 * 실력 진단 (설계/09 §3) — 시작 → 문제 → 결과가 한 주소의 상태 전환.
 * 계단·추천 계산은 lib/diagnosis가 하고, 화면은 **정오를 보여주지 않는 것**(P6)이 계약이다:
 * 채점 표시 요소(정답/오답·근거·맞은 개수)가 DOM에 없다.
 */
export function DiagnosisPage() {
  const [courses, setCourses] = useState(null);
  const [coursesError, setCoursesError] = useState(false);
  const [phase, setPhase] = useState("start"); // start | loading | question | error | result
  const [stageIndex, setStageIndex] = useState(0);
  const [questions, setQuestions] = useState([]);
  const [questionIndex, setQuestionIndex] = useState(0);
  const [stageCorrect, setStageCorrect] = useState(0);
  const [stageResults, setStageResults] = useState([]);

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
  // 재료 로딩 실패 시의 대체 동선 — **추천과 같은 첫 코스**를 가리킨다(감사 높음 1).
  // 계단 첫 코스(N5)를 쓰면 "일단 여기부터"가 추천 결과와 다른 코스를 말하게 된다.
  const firstCourse = recommendCandidates(courses ?? [])[0] ?? null;
  // N1은 마지막 코스다 — 그 위에 준비중인 것이 없으면 "준비 중" 안내 자체를 하지 않는다(08 C-12 ②)
  const hasPreparingCourse = (courses ?? []).some((course) => course.status === "PREPARING");

  const startStage = async (index, resultsSoFar) => {
    setPhase("loading");
    try {
      const materials = await fetchStageMaterials(plan[index].levelCode, Math.random);
      const stageQuestions = buildStageQuestions({ ...materials, rng: Math.random });
      if (stageQuestions.length === 0) throw new Error("no questions");
      setStageIndex(index);
      setQuestions(stageQuestions);
      setQuestionIndex(0);
      setStageCorrect(0);
      setStageResults(resultsSoFar);
      setPhase("question");
    } catch {
      setPhase("error");
    }
  };

  const finish = (results) => {
    setStageResults(results);
    setPhase("result");
  };

  const answer = (choiceIndex) => {
    const question = questions[questionIndex];
    const correct = choiceIndex === question.answerIndex ? stageCorrect + 1 : stageCorrect;

    if (questionIndex + 1 < questions.length) {
      setStageCorrect(correct);
      setQuestionIndex(questionIndex + 1);
      return;
    }

    // 단계 종료 — 3중 2 통과면 다음 단계, 미달이면 즉시 종료(P4·P5)
    const results = [...stageResults, { levelLabel: plan[stageIndex].levelLabel, correct, total: STAGE_SIZE }];
    if (isStagePassed(correct) && stageIndex + 1 < plan.length) startStage(stageIndex + 1, results);
    else finish(results);
  };

  const reset = () => {
    setPhase("start");
    setStageResults([]);
  };

  if (coursesError) return <ApiErrorCard onRetry={() => window.location.reload()} />;
  if (!courses) {
    return (
      <section aria-hidden="true" className="diag-wrap">
        <div className="panel padded">
          <div className="skeleton sk-line w40" />
          <div className="skeleton sk-line w70" />
        </div>
      </section>
    );
  }

  /* ── 시작 (P2) ── */
  if (phase === "start") {
    return (
      <section className="diag-wrap">
        <div className="panel padded quiz-card">
          <div className="step-caption">실력 진단</div>
          <h2 className="step-title">어디서 시작할지, 3분이면 알 수 있어요</h2>
          {/* 최대 문항 수는 상수가 아니라 계단에서 파생된다 — N1이 열리면 15문제가 된다(설계/09 §3-1) */}
          <p>
            낮은 레벨부터 세 문제씩 — 최대 {plan.length * STAGE_SIZE}문제.
          </p>
          <p className="quiz-note">결과는 저장되지 않아요.</p>
          <div className="quiz-result-actions">
            <button className="btn primary" type="button" onClick={() => startStage(0, [])}>
              시작하기
            </button>
          </div>
        </div>
      </section>
    );
  }

  /* ── 재료 실패 — 학습으로 가는 길을 막지 않는다(설계/09 §3-2) ── */
  if (phase === "error") {
    return (
      <section className="diag-wrap">
        <div className="panel padded quiz-card">
          <div className="step-caption">실력 진단</div>
          <p>문제를 준비하지 못했어요.</p>
          <div className="quiz-result-actions">
            <button className="btn" type="button" onClick={() => startStage(stageIndex, stageResults)}>
              다시 시도
            </button>
            {firstCourse && (
              <Link className="btn primary" to={`/courses/${firstCourse.id}`}>
                일단 {firstCourse.title}부터 시작하기
              </Link>
            )}
          </div>
        </div>
      </section>
    );
  }

  if (phase === "loading") {
    return (
      <section aria-hidden="true" className="diag-wrap">
        <div className="panel padded quiz-card">
          <div className="skeleton sk-line w40" />
          <div className="skeleton sk-line w70" />
          <div className="skeleton sk-row" />
        </div>
      </section>
    );
  }

  /* ── 결과 (P8·P9·P11~P14) ── */
  if (phase === "result") {
    const verdict = recommend({ courses, stageResults });
    const recommended = courses.find((c) => c.id === verdict.recommendedCourseId);
    const passedLevels = stageResults.filter((s) => isStagePassed(s.correct));
    const lastPassed = passedLevels[passedLevels.length - 1] ?? null;
    const nextAfterPassed = !verdict.allPassed && lastPassed ? recommended?.levelLabel : null;

    return (
      <section className="diag-wrap">
        <div className="panel padded quiz-card">
          <div className="step-caption">진단 결과</div>
          <h1 className="diag-headline">
            {recommended.title}({recommended.levelLabel})부터 시작하세요
          </h1>
          <p>
            {lastPassed
              ? `${lastPassed.levelLabel} 내용까지는 익숙하고, ${nextAfterPassed ?? "그 위"}부터 새로운 것이 많아요.`
              : "기초부터 차근차근 시작하는 게 좋아요."}
          </p>
          <div className="table-wrap">
            <table className="data-table">
              <tbody>
                {stageResults.map((stage) => (
                  <tr key={stage.levelLabel}>
                    <td>{stage.levelLabel}</td>
                    <td>
                      {stage.correct} / {stage.total}
                    </td>
                    <td>{isStagePassed(stage.correct) ? "통과" : "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {/* 오지 않을 약속을 하지 않는다(08 C-12 ②) — 준비중 코스가 실제로 있을 때만 */}
          {verdict.allPassed && hasPreparingCourse && (
            <p className="muted-text">그 위 코스는 지금 준비하고 있어요.</p>
          )}
          <div className="quiz-result-actions">
            <Link className="btn primary" to={`/courses/${verdict.recommendedCourseId}`}>
              {recommended.title}({recommended.levelLabel}) 코스 시작하기 ›
            </Link>
            {verdict.stepDownCourseId != null && (
              <Link className="btn" to={`/courses/${verdict.stepDownCourseId}`}>
                한 단계 아래부터 보기
              </Link>
            )}
            <button className="btn ghost" type="button" onClick={reset}>
              다시 진단하기
            </button>
          </div>
          <p className="quiz-note">이 결과는 저장되지 않아요. 새로고침하면 사라져요.</p>
        </div>
      </section>
    );
  }

  /* ── 문제 (P6·P7) — 정오 표시 없이 바로 다음 문제 ── */
  const question = questions[questionIndex];
  return (
    <section className="diag-wrap">
      <div className="panel padded quiz-card">
        <p className="quiz-progress">
          {plan[stageIndex].levelLabel} 단계 · {questionIndex + 1}번째 문제
        </p>
        <p className="quiz-prompt jp">{question.prompt.main}</p>
        <p className="quiz-prompt-sub">{question.prompt.sub}</p>
        <div className="quiz-choices">
          {question.choices.map((choice, i) => (
            <button
              key={i}
              aria-label={`보기 ${i + 1} — ${choice}`}
              className="quiz-choice jp"
              type="button"
              onClick={() => answer(i)}
            >
              {choice}
            </button>
          ))}
        </div>
      </div>
    </section>
  );
}
