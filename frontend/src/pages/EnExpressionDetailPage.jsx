import { useLocation, useParams } from "react-router-dom";
import { ApiErrorCard, NotFoundCard } from "../components/StateCards.jsx";
import { LevelBadge, RefTopbar, WhereLearn } from "../components/library/LibraryShell.jsx";
import { ExpressionCard } from "../components/library/ExpressionCard.jsx";
import { useApiQuery } from "../hooks/useApiQuery.js";
import { cardClass } from "../components/ui/kitClass.js";

function LoadingSkeleton() {
  return (
    <div aria-hidden="true" className={cardClass()}>
      <div className="k-skeleton sk-line w40" />
      <div className="k-skeleton sk-line w70" />
      <div className="k-skeleton sk-row" />
    </div>
  );
}

/**
 * 영어 표현 상세 (설계/05 §16-4) — 문법 상세와 같은 골격이다:
 * 표제 + 설명 + 예문 + WhereLearn. 카드 안은 유닛 표현 스텝과 **같은 컴포넌트**를 쓴다.
 * ★·[고치기]·재생 버튼은 없다(§0-2).
 */
export function EnExpressionDetailPage() {
  const { expressionId } = useParams();
  const { search } = useLocation();
  const { data, loading, error, reload } = useApiQuery(`/api/en/library/expressions/${expressionId}`);

  return (
    <section>
      <RefTopbar backTo={`/en/library/expressions${search}`} caption="영어 자료실 · 표현" />

      {loading && <LoadingSkeleton />}

      {error && (error.status === 404 || error.status === 400) && (
        <NotFoundCard
          description="주소가 바뀌었거나 없는 표현이에요"
          label="자료실로"
          title="찾을 수 없는 항목이에요"
          to="/en/library/expressions"
        />
      )}
      {error && error.status !== 404 && error.status !== 400 && <ApiErrorCard onRetry={reload} />}

      {data && (
        <>
          <div className={cardClass()}>
            <ExpressionCard bare expression={data} titleRight={<LevelBadge level={data.level} />} />
          </div>
          <WhereLearn entries={[data.learnedIn]} lang="en" />
        </>
      )}
    </section>
  );
}
