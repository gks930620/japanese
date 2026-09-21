import { Link } from "react-router-dom";
import { buildLibrarySearch } from "../../lib/libraryQuery.js";
import { Button } from "../ui/Button.jsx";
import { btnClass } from "../ui/kitClass.js";

/**
 * [이 조건으로 문제 풀기] (설계/05 §15-1) — result-bar 오른쪽 끝.
 * 결과 개수·적용 칩과 같은 줄에 붙어 "이 개수·이 조건이 곧 출제 범위"가 배치로 읽힌다(Q19).
 * primary가 아니다 — 목록 화면의 주인공은 목록이다.
 */
export function QuizEntry({ type, params, totalElements }) {
  // 0건은 버튼째 미렌더 — EmptyBlock이 이미 조건 수정을 안내한다(같은 말을 두 번 하지 않는다)
  if (totalElements === 0) return null;

  // 출제 범위를 좁히는 조건은 전부 넘긴다 — page·sort만 뺀다(09 §2-2).
  // page·sort는 같은 모집단을 보는 순서·자리지만, q·level·pos·hasRules는 모집단 자체를 바꾼다.
  // 하나라도 떨어뜨리면 목록이 보여준 개수와 출제 범위가 어긋나 "N개 중에서 출제합니다"가 거짓이 된다.
  const search = buildLibrarySearch({ ...params, page: 1, sort: "LEARNING" });

  if (totalElements < 4) {
    return (
      <span className="quiz-entry">
        <Button disabled variant="secondary">
          이 조건으로 문제 풀기
        </Button>
        <span className="quiz-entry-hint">문제를 내려면 4개 이상 필요해요. 조건을 넓혀 보세요</span>
      </span>
    );
  }

  return (
    <span className="quiz-entry">
      <Link className={btnClass({ variant: "secondary" })} to={`/library/${type}/quiz${search}`}>
        이 조건으로 문제 풀기
      </Link>
    </span>
  );
}
