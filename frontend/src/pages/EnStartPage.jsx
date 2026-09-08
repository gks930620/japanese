import { useNavigate } from "react-router-dom";
import { ApiErrorCard } from "../components/StateCards.jsx";
import { useApiQuery } from "../hooks/useApiQuery.js";
import { canDoChoices } from "../lib/enStart.js";

/**
 * 영어 자가진단 `/en/start` (설계/06 §11-12) — **진단이 아니라 자기 선택**이다.
 * 문제도 채점도 정답도 없다: 지금 상태에 가장 가까운 문장을 고르면 그 코스로 간다.
 * 결과는 저장하지 않는다(08 F-21 — 일본어 진단과 같은 판정).
 *
 * 화면에 레벨을 쓰지 않는다 — 코스명이 곧 단계 이름이다(설계/05 §16-2).
 */
export function EnStartPage() {
  const { data, loading, error, reload } = useApiQuery("/api/en/courses");
  const navigate = useNavigate();
  const choices = canDoChoices(data);

  return (
    <section>
      <div className="page-header">
        <div aria-hidden="true" className="page-avatar">
          EN
        </div>
        <div className="page-head-text">
          <h1>지금 영어로 어디까지 되나요?</h1>
          <p>가장 가까운 문장을 고르면 그 코스로 데려다 드려요</p>
        </div>
      </div>

      {loading && (
        <div aria-hidden="true">
          {Array.from({ length: 5 }, (_, i) => (
            <div key={i} className="skeleton sk-row" />
          ))}
        </div>
      )}
      {!loading && error && <ApiErrorCard onRetry={reload} />}

      {!loading && !error && (
        <div className="panel padded">
          <div className="en-choices">
            {choices.map((choice) => (
              <button
                key={choice.courseId}
                className="en-choice"
                type="button"
                onClick={() => navigate(`/en/courses/${choice.courseId}`)}
              >
                <span className="en-choice-course">{choice.title}</span>
                <span className="en-choice-line">{choice.sentence}</span>
              </button>
            ))}
          </div>
          <p className="en-start-note">채점하지 않아요 — 결과는 저장되지 않아요.</p>
        </div>
      )}
    </section>
  );
}
