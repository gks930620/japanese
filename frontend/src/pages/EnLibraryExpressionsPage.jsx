import { useLocation } from "react-router-dom";
import { Pagination } from "../components/Pagination.jsx";
import { ApiErrorCard, FilterErrorCard } from "../components/StateCards.jsx";
import {
  EmptyBlock,
  LibraryHeader,
  LibraryTabs,
  LibraryToolbar,
  LevelFilter,
  ResultBar,
} from "../components/library/LibraryShell.jsx";
import { ExpressionRow } from "../components/library/ListItems.jsx";
import { useLibraryList } from "../hooks/useLibraryList.js";
import { PAGE_SIZE, levelOptions } from "../lib/libraryQuery.js";
import { appliedChips } from "../lib/libraryChips.js";

const PLACEHOLDER = "표현·한국어 뜻으로 검색 (예: get up, 일어나다)";

/**
 * 영어 표현 자료실 (설계/05 §16-3) — 영어 자료실의 기본 탭.
 * 행 구조·툴바·페이지네이션은 일본어 문법 목록과 같은 컴포넌트다(§1-1 재사용 표).
 * 정렬 셀렉트는 렌더하지 않는다 — 선택지가 "학습 순서" 하나뿐이라 조작할 것이 없다.
 */
export function EnLibraryExpressionsPage() {
  const { params, page, loading, error, reload, setParams, reset } = useLibraryList(
    "/api/en/library/expressions",
    PAGE_SIZE.grammar,
  );
  const { search } = useLocation();
  const items = page?.content ?? [];
  const chips = appliedChips(params, setParams);
  // 조건이 하나도 없는데 0건이면 "못 찾은 것"이 아니라 "아직 없는 것"이다(§4-6)
  const nothingYet = page != null && (page.totalAll ?? 0) === 0 && chips.length === 0;

  return (
    <section>
      <LibraryHeader lang="en" />
      <LibraryTabs current="/en/library/expressions" lang="en" />

      <LibraryToolbar params={params} placeholder={PLACEHOLDER} onSearch={(q) => setParams({ q }, { replace: true })}>
        <LevelFilter
          label="코스"
          options={levelOptions({ lang: "en", type: "expressions" })}
          selected={params.levels}
          onChange={(levels) => setParams({ levels })}
        />
      </LibraryToolbar>

      <ResultBar chips={chips} page={page} sortLabel="학습 순서" unit="개" onReset={reset} />

      {loading && !page && (
        <div aria-hidden="true" className="panel ref-list">
          {Array.from({ length: 6 }, (_, i) => (
            <div key={i} className="skeleton sk-row" />
          ))}
        </div>
      )}

      {/* 400은 조건이 틀린 것이다 — 서버 문구 그대로 + [조건 초기화](A-L1 · 08 C-12 ④) */}
      {error &&
        (error.status === 400 ? (
          <FilterErrorCard message={error.message} onReset={reset} />
        ) : (
          <ApiErrorCard onRetry={reload} />
        ))}

      {!error && page && items.length === 0 && (
        <EmptyBlock
          conditionText={`${chips.map((chip) => chip.plain).join(" · ")} 조건에 해당하는 표현이 없어요`}
          hint="한국어 뜻으로도 찾을 수 있어요"
          notReady={
            nothingYet
              ? {
                  description: "영어 과정은 맛보기 유닛만 열려 있어요",
                  label: "영어 코스 보기",
                  to: "/en/courses",
                }
              : null
          }
          query={params.q}
          onReset={reset}
        />
      )}

      {!error && items.length > 0 && (
        <>
          <div className={`panel ref-list${loading ? " list-loading" : ""}`}>
            {items.map((expression) => (
              <ExpressionRow
                key={expression.id}
                expression={expression}
                to={`/en/library/expressions/${expression.id}${search}`}
              />
            ))}
          </div>
          <Pagination
            page={page.page}
            totalPages={page.totalPages}
            onChange={(next) => setParams({ page: next + 1 })}
          />
        </>
      )}
    </section>
  );
}
