import { Pagination } from "../components/Pagination.jsx";
import { ApiErrorCard, FilterErrorCard } from "../components/StateCards.jsx";
import { InlineAlert } from "../components/InlineAlert.jsx";
import { QuizEntry } from "../components/library/QuizEntry.jsx";
import {
  EmptyBlock,
  FilterChip,
  FilterGroup,
  LevelBadge,
  LevelFilter,
  LibraryHeader,
  LibraryTabs,
  LibraryToolbar,
  ResultBar,
} from "../components/library/LibraryShell.jsx";
import { VocabTable } from "../components/library/ListItems.jsx";
import { useLibraryList } from "../hooks/useLibraryList.js";
import { PAGE_SIZE, toggleValue, levelOptions } from "../lib/libraryQuery.js";
import { appliedChips } from "../lib/libraryChips.js";
import { partOfSpeechOptions } from "../constants/partOfSpeech.js";

const PLACEHOLDER = "단어·읽는 법·뜻으로 검색 (예: 建物, たてもの, 건물)";
const EN_PLACEHOLDER = "단어·뜻으로 검색 (예: apple, 사과)";
// 어휘 자료실 (설계/05 §7) — 표 5열 + 행 확장 아코디언, 50개/쪽. 상세 화면 없음
export function LibraryVocabPage({ lang = "ja" }) {
  const en = lang === "en";
  const { params, page, loading, error, reload, setParams, reset } = useLibraryList(
    en ? "/api/en/library/vocabulary" : "/api/library/vocabulary",
    PAGE_SIZE.vocabulary,
  );
  const items = page?.content ?? [];
  const chips = appliedChips(params, setParams);
  const nothingYet = page != null && (page.totalAll ?? 0) === 0 && chips.length === 0;

  // 펼침은 주소에 넣지 않는 순간 상태 — 목록(조건·페이지)이 바뀌면 전부 접힌다(공용 VocabTable이 listKey로 처리)
  const listKey = `${params.q}|${params.levels}|${params.pos}|${params.sort}|${params.page}`;

  return (
    <section>
      <LibraryHeader lang={lang} />
      <LibraryTabs current={en ? "/en/library/vocabulary" : "/library/vocabulary"} lang={lang} />

      <LibraryToolbar params={params} placeholder={en ? EN_PLACEHOLDER : PLACEHOLDER} onSearch={(q) => setParams({ q }, { replace: true })}>
        <LevelFilter
          label={en ? "코스" : "레벨"}
          options={levelOptions({ lang, type: "vocabulary" })}
          selected={params.levels}
          onChange={(levels) => setParams({ levels })}
        />
        <FilterGroup label="품사">
          {partOfSpeechOptions(lang).map((pos) => (
            <FilterChip
              key={pos.code}
              label={pos.label}
              selected={params.pos.includes(pos.code)}
              onClick={() => setParams({ pos: toggleValue(params.pos, pos.code) })}
            />
          ))}
        </FilterGroup>
        {/* 영어는 제2 정렬이 없다 — 선택지 하나뿐인 셀렉트는 렌더하지 않는다(영어 §4-2) */}
        {!en && (
          <FilterGroup label="정렬">
            {/* 정렬은 택일이라 셀렉트 — 복수 선택 언어(칩)와 섞지 않는다 (설계/05 §12) */}
            <select
              aria-label="정렬"
              className="filter-select"
              value={params.sort}
              onChange={(e) => setParams({ sort: e.target.value })}
            >
              <option value="LEARNING">학습 순서</option>
              <option value="KANA">가나순</option>
            </select>
          </FilterGroup>
        )}
      </LibraryToolbar>

      <ResultBar
        chips={chips}
        page={page}
        sortLabel={params.sort === "KANA" ? "가나순" : "학습 순서"}
        unit="개"
        onReset={reset}
      />
      {!en && <QuizEntry params={params} totalElements={page?.totalElements ?? 0} type="vocabulary" />}

      <InlineAlert />

      {loading && !page && (
        <div aria-hidden="true" className="panel ref-list">
          {Array.from({ length: 10 }, (_, i) => (
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
          conditionText={`${chips.map((chip) => chip.plain).join(" · ")} 조건에 해당하는 어휘가 없어요`}
          hint={en ? "한국어 뜻으로도 찾을 수 있어요" : "한자 대신 읽는 법(たてもの)이나 한국어 뜻으로도 찾을 수 있어요"}
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
          <div className={`table-wrap${loading ? " list-loading" : ""}`}>
            <VocabTable items={items} latin={en} listKey={listKey} />
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
