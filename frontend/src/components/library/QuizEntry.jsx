import { Link } from "react-router-dom";
import { buildLibrarySearch } from "../../lib/libraryQuery.js";

/**
 * [이 조건으로 문제 풀기] (설계/05 §15-1) — result-bar 오른쪽 끝.
 * 결과 개수·적용 칩과 같은 줄에 붙어 "이 개수·이 조건이 곧 출제 범위"가 배치로 읽힌다(Q19).
 * primary가 아니다 — 목록 화면의 주인공은 목록이다.
 */
export function QuizEntry({ type, params, totalElements }) {
  // 0건은 버튼째 미렌더 — EmptyBlock이 이미 조건 수정을 안내한다(같은 말을 두 번 하지 않는다)
  if (totalElements === 0) return null;

  // 출제 조건만 넘긴다 — page·sort는 출제 범위와 무관하다
  const search = buildLibrarySearch({ ...params, page: 1, sort: "LEARNING", hasRules: false });

  if (totalElements < 4) {
    return (
      <span className="quiz-entry">
        <button className="btn" disabled type="button">
          이 조건으로 문제 풀기
        </button>
        <span className="quiz-entry-hint">문제를 내려면 4개 이상 필요해요. 조건을 넓혀 보세요</span>
      </span>
    );
  }

  return (
    <span className="quiz-entry">
      <Link className="btn" to={`/library/${type}/quiz${search}`}>
        이 조건으로 문제 풀기
      </Link>
    </span>
  );
}
