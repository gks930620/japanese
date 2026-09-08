import { useState } from "react";
import { JpSentence } from "./JpSentence.jsx";
import { buildRetrySet } from "../lib/quiz.js";
import { TtsButton, TtsRateChip } from "./TtsControls.jsx";
import { speechTextOf } from "../lib/tts.js";

/**
 * 공용 문제·결과 카드 (설계/05 §15-1) — 유닛 확인 문제·자료실 퀴즈가 공유한다.
 * 문제 세트는 밖(lib/quiz.js)에서 만들어 props로 받는다 — 생성 규칙은 lib 테스트가,
 * 이 컴포넌트는 "푸는 동작"(즉시 채점·답 변경 불가·부분집합 재도전)만 책임진다.
 *
 * props: { questions, newTabLinks?, onRestart, footerActions?, labelChoices? }
 *  - onRestart: [새 문제로 다시 풀기] — **재생성은 부모의 몫**이다(Q16)
 *  - footerActions: 결과 화면의 진행 방향 버튼(진입별 프리셋 — §2-5)
 *  - labelChoices: 보기 접근 이름에 "보기 n" 접두(유닛·진단 진입이 쓴다)
 */
export function QuizRunner({ questions, newTabLinks = false, onRestart, footerActions, labelChoices = false }) {
  const [active, setActive] = useState({ questions, retry: false });
  const [index, setIndex] = useState(0);
  const [answers, setAnswers] = useState([]); // {questionId, choiceIndex, correct}
  const [phase, setPhase] = useState("question");

  const list = active.questions;
  const question = list[index];
  const answered = answers.find((a) => a.questionId === question?.id);
  const correctCount = answers.filter((a) => a.correct).length;

  const choose = (choiceIndex) => {
    if (answered) return; // 채점 후 답 변경 불가(Q10)
    setAnswers((prev) => [
      ...prev,
      { questionId: question.id, choiceIndex, correct: choiceIndex === question.answerIndex },
    ]);
  };

  const next = () => {
    if (index + 1 < list.length) setIndex(index + 1);
    else setPhase("result");
  };

  const retryWrong = () => {
    const wrongIds = answers.filter((a) => !a.correct).map((a) => a.questionId);
    setActive({ questions: buildRetrySet(active, wrongIds).questions, retry: true }); // 부분집합 — 재생성 아님(Q15)
    setIndex(0);
    setAnswers([]);
    setPhase("question");
  };

  if (phase === "result") {
    const wrongCount = answers.filter((a) => !a.correct).length;
    return (
      <div className="panel padded quiz-card">
        <div className="step-caption row-caption">
          결과
          <TtsRateChip />
        </div>
        <div className="count-big">
          <span className="v">
            {correctCount} / {list.length}
          </span>
          <span className="l">맞은 개수</span>
        </div>
        <ul className="quiz-result-list">
          {list.map((q) => {
            const a = answers.find((item) => item.questionId === q.id);
            return (
              <li key={q.id} className="quiz-result-row">
                <span aria-hidden="true" className={a?.correct ? "mark ok" : "mark err"}>
                  {a?.correct ? "○" : "✕"}
                </span>
                <span className="quiz-result-summary jp">
                  {q.prompt.main} — {q.choices[q.answerIndex]}
                </span>
                <TtsButton label={q.prompt.main} text={speechTextOf(q.evidence ?? {})} />
                {q.libraryHref && (
                  <a
                    className="ref-link"
                    href={q.libraryHref}
                    {...(newTabLinks ? { target: "_blank", rel: "noopener noreferrer" } : {})}
                  >
                    자료실
                    {newTabLinks && (
                      <span aria-hidden="true" className="ext-mark">
                        ↗
                      </span>
                    )}
                  </a>
                )}
              </li>
            );
          })}
        </ul>
        <div className="quiz-result-actions">
          {wrongCount > 0 && (
            <button className="btn" type="button" onClick={retryWrong}>
              틀린 문제만 다시 풀기
            </button>
          )}
          <button className="btn ghost" type="button" onClick={onRestart}>
            새 문제로 다시 풀기
          </button>
          {footerActions}
        </div>
        <p className="quiz-note">결과는 저장되지 않아요. 새로고침하면 사라져요.</p>
      </div>
    );
  }

  return (
    <div className="panel padded quiz-card">
      {/* 진행·맞은 개수 상시 (Q12) */}
      <p className="quiz-progress">
        {index + 1} / {list.length} · 맞은 개수 {correctCount}개
      </p>

      <p className={`quiz-prompt jp${question.prompt.main.length <= 2 ? " glyph" : ""}`}>{question.prompt.main}</p>
      <p className="quiz-prompt-sub">{question.prompt.sub}</p>

      <div className="quiz-choices">
        {question.choices.map((choice, i) => {
          const isCorrect = i === question.answerIndex;
          const isChosen = answered?.choiceIndex === i;
          const stateClass = answered ? (isCorrect ? " correct" : isChosen ? " wrong" : "") : "";
          return (
            <button
              key={i}
              aria-label={labelChoices ? `보기 ${i + 1} — ${choice}` : undefined}
              className={`quiz-choice jp${stateClass}`}
              data-correct={answered && isCorrect ? "true" : undefined}
              disabled={Boolean(answered)}
              type="button"
              onClick={() => choose(i)}
            >
              {answered && isCorrect && <span aria-hidden="true">✓ </span>}
              {answered && isChosen && !isCorrect && <span aria-hidden="true">✕ </span>}
              {choice}
            </button>
          );
        })}
      </div>

      {answered && (
        <>
          <p className={`quiz-verdict ${answered.correct ? "ok" : "err"}`} role="status">
            {answered.correct ? "정답" : "오답"}
          </p>
          <Evidence question={question} />
          <div className="quiz-result-actions">
            <button className="btn primary" type="button" onClick={next}>
              다음 문제
            </button>
          </div>
        </>
      )}
    </div>
  );
}

/** 근거 블록 (Q11 · §2-3) — 전부 기존 데이터·기존 표기 규격 */
function Evidence({ question }) {
  const e = question.evidence ?? {};
  return (
    <div className="quiz-evidence">
      {question.type.startsWith("KANJI_") && (
        <>
          <div className="kanji-word">
            <div className="w">{e.letter}</div>
            <div className="m">{e.meaningKo}</div>
          </div>
          {e.onyomi != null && (
            <div className="kv-row">
              <span className="kv-label">음독</span>
              <span className="kv-value jp">{e.onyomi}</span>
            </div>
          )}
          {e.kunyomi != null && (
            <div className="kv-row">
              <span className="kv-label">훈독</span>
              <span className="kv-value jp">{e.kunyomi}</span>
            </div>
          )}
        </>
      )}
      {question.type.startsWith("VOCAB_") && (
        <div className="kanji-word">
          <div className="w">{e.word}</div>
          {/* 지문이 이미 읽기를 담고 있으면(学生（がくせい）) 같은 정보를 반복하지 않는다 */}
          {e.kana && !question.prompt.main.includes(e.kana) && <div className="r">{e.kana}</div>}
          <div className="m">{e.meaningKo}</div>
        </div>
      )}
      {question.type.startsWith("GRAMMAR_") && (
        <>
          <div className="kanji-word">
            <div className="w">{e.name}</div>
            <div className="m">{e.nameKo}</div>
          </div>
          {question.type === "GRAMMAR_CLOZE" && e.examples?.[0] && (
            <JpSentence jp={e.examples[0].jp} kana={e.examples[0].kana} meaningKo={e.examples[0].meaningKo} />
          )}
        </>
      )}
    </div>
  );
}
