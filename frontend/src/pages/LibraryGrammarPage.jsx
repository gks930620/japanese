import { useLocation } from "react-router-dom";
import { Pagination } from "../components/Pagination.jsx";
import { ApiErrorCard, FilterErrorCard } from "../components/StateCards.jsx";
import { InlineAlert } from "../components/InlineAlert.jsx";
import { QuizEntry } from "../components/library/QuizEntry.jsx";
import {
  EmptyBlock,
  FilterChip,
  FilterGroup,
  LevelFilter,
  LibraryHeader,
  LibraryTabs,
  LibraryToolbar,
  ResultBar,
} from "../components/library/LibraryShell.jsx";
import { GrammarRow } from "../components/library/ListItems.jsx";
import { useLibraryList } from "../hooks/useLibraryList.js";
import { PAGE_SIZE, levelOptions } from "../lib/libraryQuery.js";
import { appliedChips } from "../lib/libraryChips.js";
import { cardClass } from "../components/ui/kitClass.js";

const PLACEHOLDER = "문법 명칭·한국어 뜻으로 검색 (예: てから, 가능형)";
// 영어 탭의 예시는 영어여야 한다 — 가나 예시는 그 탭에서 검색되지 않는다(A-M4, 어휘 탭 선례)
const EN_PLACEHOLDER = "문법 명칭·한국어 뜻으로 검색 (예: be going to, 예정)";

// 문법 자료실 목록 (설계/05 §7) — 행 리스트, 20개/쪽.
// 영어 과정은 같은 화면을 쓴다(설계/05 §16-3): 경로·탭·필터 문구만 갈린다.
export function LibraryGrammarPage({ lang = "ja" }) {
  const en = lang === "en";
  const base = en ? "/en/library/grammar" : "/library/grammar";
  const { params, page, loading, error, reload, setParams, reset } = useLibraryList(
    en ? "/api/en/library/grammar" : "/api/library/grammar",
    PAGE_SIZE.grammar,
  );
  const { search } = useLocation();
  const items = page?.content ?? [];
  const chips = appliedChips(params, setParams);
  const nothingYet = page != null && (page.totalAll ?? 0) === 0 && chips.length === 0;

  return (
    <section>
      <LibraryHeader lang={lang} />
      <LibraryTabs current={base} lang={lang} />

      <LibraryToolbar params={params} placeholder={en ? EN_PLACEHOLDER : PLACEHOLDER} onSearch={(q) => setParams({ q }, { replace: true })}>
        <LevelFilter
          label={en ? "코스" : "레벨"}
          options={levelOptions({ lang, type: "grammar" })}
          selected={params.levels}
          onChange={(levels) => setParams({ levels })}
        />
        {/* 영어에는 활용 개념 자체가 없어 **구조적으로 0건**이다 — 한자 탭의 INTRO 칩과 같은 판정(A-L4) */}
        {!en && (
          <FilterGroup label="기타">
            {/* 단일 토글 칩 — 필터바 안에 조작 언어를 하나만 유지한다 (설계/05 §12) */}
            <FilterChip
              label="활용표 있는 것만"
              selected={params.hasRules}
              onClick={() => setParams({ hasRules: !params.hasRules })}
            />
          </FilterGroup>
        )}
      </LibraryToolbar>

      <ResultBar chips={chips} page={page} sortLabel="학습 순서" unit="개" onReset={reset} />
      {/* 영어 퀴즈는 아직 없다(설계/05 §16-1) */}
      {!en && <QuizEntry params={params} totalElements={page?.totalElements ?? 0} type="grammar" />}

      <InlineAlert />

      {loading && !page && (
        <div aria-hidden="true" className={cardClass({ flush: true, className: "ref-list" })}>
          {Array.from({ length: 6 }, (_, i) => (
            <div key={i} className="k-skeleton sk-row" />
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
          conditionText={`${chips.map((chip) => chip.plain).join(" · ")} 조건에 해당하는 문법이 없어요`}
          hint={en ? "한국어 뜻으로도 찾을 수 있어요" : "물결표(〜) 없이 てから처럼 입력해도 찾을 수 있어요"}
          notReady={
            en && nothingYet
              ? { description: "영어 과정은 맛보기 유닛만 열려 있어요", label: "영어 코스 보기", to: "/en/courses" }
              : null
          }
          query={params.q}
          onReset={reset}
        />
      )}

      {!error && items.length > 0 && (
        <>
          <div className={cardClass({ flush: true, className: `ref-list${loading ? " list-loading" : ""}` })}>
            {items.map((grammar) => (
              <GrammarRow
                key={grammar.id}
                grammar={grammar}
                latin={en}
                to={`${base}/${grammar.id}${search}`}
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
