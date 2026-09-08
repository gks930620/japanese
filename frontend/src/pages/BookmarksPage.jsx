import { useEffect, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { Pagination } from "../components/Pagination.jsx";
import { ApiErrorCard } from "../components/StateCards.jsx";
import { ConfirmDialog } from "../components/ConfirmDialog.jsx";
import { MergeBanner } from "../components/MergeBanner.jsx";
import { InlineAlert } from "../components/InlineAlert.jsx";
import { EmptyBlock, LevelFilter, LibraryToolbar, ResultBar } from "../components/library/LibraryShell.jsx";
import { GrammarRow, KanjiTile, VocabTable } from "../components/library/ListItems.jsx";
import { useUserData } from "../context/userDataStore.js";
import { PAGE_SIZE, buildLibrarySearch, parseLibraryParams } from "../lib/libraryQuery.js";
import { appliedChips } from "../lib/libraryChips.js";
import * as userData from "../lib/userData.js";
import { alertClass, btnClass, cardClass, emptyClass, selectClass, toolbarClass } from "../components/ui/kitClass.js";

const TABS = [
  { key: "kanji", label: "한자", unit: "자", to: "/library/kanji" },
  { key: "grammar", label: "문법", unit: "개", to: "/library/grammar" },
  { key: "vocabulary", label: "어휘", unit: "개", to: "/library/vocabulary" },
];

const UNDO_MS = 5000;

/** 기본 탭 = 담은 것이 가장 많은 탭. 전부 0이면 한자 (AC-B-11) */
function defaultTab(counts) {
  return TABS.reduce((best, tab) => ((counts[tab.key] ?? 0) > (counts[best.key] ?? 0) ? tab : best), TABS[0]).key;
}

// 보관함 (설계/05 §8) — 자료실 툴바·항목·페이지네이션을 그대로 재사용한다
export function BookmarksPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { ready, isAuthenticated, bookmarkCounts, toggleBookmark, clearBookmarks, discardGuestData } = useUserData();

  const tabParam = searchParams.get("tab");
  const tab = TABS.find((item) => item.key === tabParam) ?? null;
  const search = searchParams.toString();
  const params = parseLibraryParams(search);

  const [page, setPage] = useState(null);
  const [error, setError] = useState(false);
  const [loading, setLoading] = useState(true);
  const [removed, setRemoved] = useState([]); // [{id, name, index, undoable}]
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [clearBrowserOpen, setClearBrowserOpen] = useState(false);
  const [attempt, setAttempt] = useState(0);

  // tab이 없으면 담은 것이 가장 많은 탭으로 주소를 바꾼다(히스토리를 더럽히지 않게 replace)
  useEffect(() => {
    // 개수를 알기 전에 보내면 항상 한자로 떨어진다 — 첫 조회가 끝난 뒤에 판정한다
    if (!tab && ready) navigate(`/bookmarks?tab=${defaultTab(bookmarkCounts)}`, { replace: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab, ready, bookmarkCounts.kanji, bookmarkCounts.grammar, bookmarkCounts.vocabulary]);

  const type = tab?.key;
  const size = type ? PAGE_SIZE[type] : 0;

  useEffect(() => {
    if (!type) return undefined;
    let cancelled = false;

    userData
      .fetchBookmarkList(isAuthenticated, type, {
        page: params.page,
        size,
        sort: params.sort === "LEARNING" ? "LEARNING" : "RECENT",
        q: params.q,
        levels: params.levels,
      })
      .then((result) => {
        if (cancelled) return;
        setPage(result);
        setError(false);
        setLoading(false);
        setRemoved([]);
      })
      .catch(() => {
        if (cancelled) return;
        setError(true);
        setLoading(false);
      });

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [type, search, isAuthenticated, attempt]);

  if (!tab) return null;

  const setParams = (patch, { replace = false } = {}) => {
    const next = { ...params, ...patch };
    if (!("page" in patch)) next.page = 1;
    navigate(`/bookmarks${buildLibrarySearch(next)}${buildLibrarySearch(next) ? "&" : "?"}tab=${tab.key}`, { replace });
  };
  const reset = () => navigate(`/bookmarks?tab=${tab.key}`);
  const chips = appliedChips(params, setParams);
  const items = page?.content ?? [];
  const removedEntry = (id) => removed.find((entry) => entry.id === id);

  /** 빼기 — 토스트 없이 **그 자리에** 되돌리기 자리표시자를 남긴다 (§3-4) */
  const handleStar = async (next, { id, name }) => {
    if (next) return;
    const index = items.findIndex((item) => item.id === id);
    setRemoved((prev) => [...prev, { id, name, index, undoable: true }]);
    setTimeout(() => {
      setRemoved((prev) => prev.map((entry) => (entry.id === id ? { ...entry, undoable: false } : entry)));
    }, UNDO_MS);
    await toggleBookmark(tab.key, id, false);
  };

  const handleUndo = async (id) => {
    setRemoved((prev) => prev.filter((entry) => entry.id !== id));
    // 목록을 다시 부르지 않는다 — 순서가 흔들리면 "되돌린 것"이 아니게 된다
    await toggleBookmark(tab.key, id, true);
  };

  const visible = items.filter((item) => !removedEntry(item.id) || removedEntry(item.id).undoable);
  const listEmpty = !loading && !error && visible.length === 0;
  const nothingSaved = (bookmarkCounts[tab.key] ?? 0) === 0 && chips.length === 0;

  const undoBlock = (item) => (
    <div key={`undo-${item.id}`} className={`bm-undo${tab.key === "kanji" ? "" : " row"}`}>
      <span>「{removedEntry(item.id).name}」을 뺐어요</span>
      <button className={btnClass({ variant: "ghost" })} type="button" onClick={() => handleUndo(item.id)}>
        되돌리기
      </button>
    </div>
  );

  return (
    <section>
      <MergeBanner />

      <div className="k-flex page-header">
        <div aria-hidden="true" className="k-avatar page-avatar">
          ★
        </div>
        <div className="page-head-text">
          <h1 className="k-page-title">내 보관함</h1>
          <p className="k-page-desc">자료실이나 학습 중에 ☆를 누른 한자·문법·어휘가 모여요</p>
        </div>
      </div>

      <nav aria-label="보관함 종류" className="k-tabs ref-tabs">
        {TABS.map((item) => (
          <Link
            key={item.key}
            aria-current={item.key === tab.key ? "page" : undefined}
            to={`/bookmarks?tab=${item.key}`}
          >
            {item.label} ({bookmarkCounts[item.key] ?? 0})
          </Link>
        ))}
      </nav>

      {/* 비로그인 안내 — 사실 진술이라 닫기가 없다 (§4-1) */}
      {!isAuthenticated && (
        <div className={alertClass({ className: "row-alert" })}>
          <span>이 기록은 지금 쓰는 브라우저에만 저장돼요.</span>
          <span className="k-flex notice-actions">
            <Link state={{ from: "/bookmarks" }} to="/login">
              로그인하고 계정에 저장 ›
            </Link>
          </span>
        </div>
      )}

      <InlineAlert />

      <LibraryToolbar
        params={params}
        placeholder="담은 것 안에서 검색"
        onSearch={(q) => setParams({ q }, { replace: true })}
      >
        <LevelFilter selected={params.levels} onChange={(levels) => setParams({ levels })} />
        <div className="filter-group">
          <span className="filter-group-label">정렬</span>
          <select
            aria-label="정렬"
            className={selectClass()}
            value={params.sort === "LEARNING" ? "LEARNING" : "RECENT"}
            onChange={(e) => setParams({ sort: e.target.value === "LEARNING" ? "LEARNING" : "RECENT" })}
          >
            <option value="RECENT">최근 담은 순</option>
            <option value="LEARNING">학습 순서</option>
          </select>
        </div>
      </LibraryToolbar>

      <ResultBar
        chips={chips}
        page={page}
        sortLabel={params.sort === "LEARNING" ? "학습 순서" : "최근 담은 순"}
        totalPrefix="담은"
        unit={tab.unit}
        onReset={reset}
      />

      {(bookmarkCounts[tab.key] ?? 0) > 0 && (
        <div className={toolbarClass()}>
          <button className={btnClass({ variant: "secondary", className: "bm-clear" })} type="button" onClick={() => setConfirmOpen(true)}>
            {tab.label} 전체 비우기
          </button>
        </div>
      )}

      {loading && !page && (
        <div aria-hidden="true" className={cardClass({ flush: true, className: "ref-list" })}>
          {Array.from({ length: 6 }, (_, i) => (
            <div key={i} className="k-skeleton sk-row" />
          ))}
        </div>
      )}

      {error && <ApiErrorCard onRetry={() => setAttempt((n) => n + 1)} />}

      {listEmpty && nothingSaved && (
        <div className={emptyClass("empty-block")}>
          <div aria-hidden="true" className="empty-glyph">
            ☆
          </div>
          <h2>아직 담은 것이 없어요</h2>
          <p>자료실이나 학습 중에 ☆를 누르면 여기에 모여요.</p>
          <Link className={btnClass({ variant: "primary" })} to={tab.to}>
            자료실 열기
          </Link>
        </div>
      )}

      {listEmpty && !nothingSaved && (
        <EmptyBlock
          conditionText={`${chips.map((chip) => chip.plain).join(" · ")} 조건에 해당하는 항목이 없어요`}
          hint="다른 검색어나 레벨로 찾아보세요"
          query={params.q}
          onReset={reset}
        />
      )}

      {!error && visible.length > 0 && tab.key === "kanji" && (
        <div className="kanji-tile-grid">
          {visible.map((item) =>
            removedEntry(item.id) ? (
              undoBlock(item)
            ) : (
              <KanjiTile key={item.id} kanji={item} to={`/library/kanji/${item.id}`} onStar={handleStar} />
            ),
          )}
        </div>
      )}

      {!error && visible.length > 0 && tab.key === "grammar" && (
        <div className={cardClass({ flush: true, className: "ref-list" })}>
          {visible.map((item) =>
            removedEntry(item.id) ? (
              undoBlock(item)
            ) : (
              <GrammarRow key={item.id} grammar={item} to={`/library/grammar/${item.id}`} onStar={handleStar} />
            ),
          )}
        </div>
      )}

      {!error && visible.length > 0 && tab.key === "vocabulary" && (
        <div>
          <VocabTable
            items={visible}
            listKey={search}
            renderRow={(item) =>
              removedEntry(item.id) ? (
                <tr key={`undo-${item.id}`}>
                  <td colSpan={7}>{undoBlock(item)}</td>
                </tr>
              ) : null
            }
            onStar={handleStar}
          />
        </div>
      )}

      {!error && page && page.totalPages > 1 && (
        <Pagination page={page.page} totalPages={page.totalPages} onChange={(next) => setParams({ page: next + 1 })} />
      )}

      {/* 비로그인만 — 브라우저 기록 전체 삭제 (진도까지 지운다) */}
      {!isAuthenticated && (
        <button className="bm-footnote" type="button" onClick={() => setClearBrowserOpen(true)}>
          이 브라우저 기록 지우기
        </button>
      )}

      <ConfirmDialog
        confirmLabel="비우기"
        description="되돌릴 수 없어요."
        errorText="비우지 못했어요. 잠시 후 다시 시도해 주세요."
        open={confirmOpen}
        title={`${tab.label} ${bookmarkCounts[tab.key] ?? 0}개를 모두 뺄까요?`}
        onCancel={() => setConfirmOpen(false)}
        onConfirm={async () => {
          const result = await clearBookmarks(tab.key);
          if (result.ok) {
            setConfirmOpen(false);
            setAttempt((n) => n + 1);
          }
          return result;
        }}
      />

      <ConfirmDialog
        confirmLabel="지우기"
        description="완료 표시·이어보기 위치와 보관함이 모두 지워져요. 되돌릴 수 없어요."
        open={clearBrowserOpen}
        title="이 브라우저에 저장된 기록을 지울까요?"
        onCancel={() => setClearBrowserOpen(false)}
        onConfirm={() => {
          discardGuestData();
          setClearBrowserOpen(false);
          setAttempt((n) => n + 1);
          return { ok: true };
        }}
      />
    </section>
  );
}
