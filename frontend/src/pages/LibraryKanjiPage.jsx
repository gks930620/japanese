import { useLocation } from "react-router-dom";
import { Pagination } from "../components/Pagination.jsx";
import { ApiErrorCard, FilterErrorCard } from "../components/StateCards.jsx";
import { InlineAlert } from "../components/InlineAlert.jsx";
import { QuizEntry } from "../components/library/QuizEntry.jsx";
import {
  EmptyBlock,
  LevelFilter,
  LibraryHeader,
  LibraryTabs,
  LibraryToolbar,
  ResultBar,
} from "../components/library/LibraryShell.jsx";
import { KanjiTile } from "../components/library/ListItems.jsx";
import { useLibraryList } from "../hooks/useLibraryList.js";
import { PAGE_SIZE } from "../lib/libraryQuery.js";
import { appliedChips } from "../lib/libraryChips.js";

const PLACEHOLDER = "글자·훈음·음독·훈독으로 검색 (예: 사람, ひと, ジン, 人)";

// 한자 자료실 목록 (설계/05 §7) — 타일 그리드, 60자/쪽
export function LibraryKanjiPage() {
  const { params, page, loading, error, reload, setParams, reset } = useLibraryList(
    "/api/library/kanji",
    PAGE_SIZE.kanji,
  );
  const { search } = useLocation();
  const items = page?.content ?? [];
  const chips = appliedChips(params, setParams);

  return (
    <section>
      <LibraryHeader />
      <LibraryTabs current="/library/kanji" />

      <LibraryToolbar params={params} placeholder={PLACEHOLDER} onSearch={(q) => setParams({ q }, { replace: true })}>
        <LevelFilter selected={params.levels} onChange={(levels) => setParams({ levels })} />
      </LibraryToolbar>

      <ResultBar chips={chips} page={page} sortLabel="학습 순서" unit="자" onReset={reset} />
      <QuizEntry params={params} totalElements={page?.totalElements ?? 0} type="kanji" />

      <InlineAlert />

      {/* 첫 로딩만 스켈레톤(한 화면분), 갱신 로딩은 기존 목록을 흐리게 유지 (§7-1) */}
      {loading && !page && (
        <div aria-hidden="true" className="kanji-tile-grid">
          {Array.from({ length: 12 }, (_, i) => (
            <div key={i} className="k-skeleton sk-tile" />
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
          conditionText={`${chips.map((chip) => chip.plain).join(" · ")} 조건에 해당하는 한자가 없어요`}
          hint="글자·훈음·음독·훈독 중 다른 것으로 찾아보세요"
          query={params.q}
          onReset={reset}
        />
      )}

      {!error && items.length > 0 && (
        <>
          <div className={`kanji-tile-grid${loading ? " list-loading" : ""}`}>
            {items.map((kanji) => (
              <KanjiTile key={kanji.id} kanji={kanji} to={`/library/kanji/${kanji.id}${search}`} />
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
