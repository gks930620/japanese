import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { LEVELS, countAppliedFilters, levelText, toggleValue } from "../../lib/libraryQuery.js";
import { useUserData } from "../../context/userDataStore.js";

/** 자료실 3탭 — 현재 탭만 그라디언트, 전환 시 조건은 넘기지 않는다 (설계/05 §3-2·§9) */
const TABS = [
  { to: "/library/kanji", label: "한자" },
  { to: "/library/grammar", label: "문법" },
  { to: "/library/vocabulary", label: "어휘" },
];

/** 영어 자료실 3탭 — 한자 탭이 없고 기본이 표현이다 (설계/05 §16-3) */
const EN_TABS = [
  { to: "/en/library/expressions", label: "표현" },
  { to: "/en/library/grammar", label: "문법" },
  { to: "/en/library/vocabulary", label: "어휘" },
];

export function LibraryHeader({ lang = "ja" }) {
  const en = lang === "en";
  return (
    <div className="page-header">
      <div aria-hidden="true" className="page-avatar">
        {en ? "abc" : "辞"}
      </div>
      <div className="page-head-text">
        <h1>{en ? "영어 자료실" : "자료실"}</h1>
        <p>
          {en
            ? "코스에서 배운 표현·문법·어휘를 사전처럼 다시 찾아봅니다"
            : "코스에서 배운 한자·문법·어휘를 사전처럼 다시 찾아봅니다"}
        </p>
      </div>
    </div>
  );
}

export function LibraryTabs({ current, lang = "ja" }) {
  const { bookmarkCounts } = useUserData();
  const en = lang === "en";
  return (
    <nav aria-label="자료실 종류" className="ref-tabs chip-row">
      {(en ? EN_TABS : TABS).map((tab) => (
        <Link
          key={tab.to}
          aria-current={tab.to === current ? "page" : undefined}
          className={`chip${tab.to === current ? " on" : ""}`}
          to={tab.to}
        >
          {tab.label}
        </Link>
      ))}
      {/* 보관함 진입 — 4번째 탭으로 오해되지 않게 톤을 달리한다. 0이면 숫자를 생략(§3-2).
          영어 보관함은 아직 없다(설계/05 §16-3) — 탭 줄은 칩 3개뿐이다 */}
      {!en && (
        <Link className="bm-entry" to="/bookmarks">
          ★ 내 보관함{bookmarkCounts.total > 0 ? ` ${bookmarkCounts.total}` : ""}
        </Link>
      )}
    </nav>
  );
}

/** 레벨 배지 — 레벨별 색 구분 없음(단색). 3종 공통 (설계/05 §12) */
export function LevelBadge({ level }) {
  return <span className="lv-badge">{levelText(level)}</span>;
}

/** 검색창 — 버튼 없이 300ms 디바운스로 주소를 replace 갱신 (설계/05 §9) */
export function LibrarySearchInput({ value, placeholder, onChange }) {
  const [text, setText] = useState(value);
  const [syncedValue, setSyncedValue] = useState(value);

  // 주소가 밖에서 바뀌면(뒤로가기·초기화·적용 칩 해제) 입력값을 맞춘다.
  // effect의 setState 대신 렌더 중 조정 — 입력 도중 포커스를 잃지 않는다.
  if (value !== syncedValue) {
    setSyncedValue(value);
    if (value !== text.trim()) setText(value);
  }

  // 300ms 디바운스로 주소를 갱신한다. 주소(value)와 같아지면 더 밀지 않는다.
  useEffect(() => {
    if (text.trim() === value) return undefined;
    const timer = setTimeout(() => onChange(text.trim()), 300);
    return () => clearTimeout(timer);
  }, [text, value, onChange]);

  return (
    <div className="search-input-wrapper">
      <span aria-hidden="true" className="material-icons">
        search
      </span>
      <input aria-label="자료실 검색" placeholder={placeholder} type="text" value={text} onChange={(e) => setText(e.target.value)} />
      {text && (
        <button aria-label="검색어 지우기" className="search-clear" type="button" onClick={() => setText("")}>
          ✕
        </button>
      )}
    </div>
  );
}

function FilterChip({ selected, label, onClick }) {
  return (
    <button aria-pressed={selected} className={`chip${selected ? " sel" : ""}`} type="button" onClick={onClick}>
      {selected ? `✓ ${label}` : label}
    </button>
  );
}

export function FilterGroup({ label, children }) {
  return (
    <div className="filter-group">
      <span className="filter-group-label">{label}</span>
      <div className="filter-chips">{children}</div>
    </div>
  );
}

/**
 * 레벨 필터 — 복수 선택(그룹 안 OR), 선택 상태는 --point-soft (그라디언트 금지 §0-5).
 * 선택지·그룹 라벨은 자료실마다 다르다(설계/05 §16-2: 영어는 "코스 1~5", 그룹 라벨도 "코스").
 */
export function LevelFilter({ selected, onChange, options = LEVELS, label = "레벨" }) {
  return (
    <FilterGroup label={label}>
      {options.map((level) => (
        <FilterChip
          key={level}
          label={levelText(level)}
          selected={selected.includes(level)}
          onClick={() => onChange(toggleValue(selected, level))}
        />
      ))}
    </FilterGroup>
  );
}

export { FilterChip };

/**
 * 툴바 — 검색창 + 필터. 모바일(≤768px)에서는 필터가 접힌 상태로 시작한다 (설계/05 §10).
 * 어떤 상태에서도 사라지지 않는다(오류·0건에서도 조건을 고쳐 빠져나갈 수 있어야 한다).
 */
export function LibraryToolbar({ params, placeholder, onSearch, children }) {
  const [openOnMobile, setOpenOnMobile] = useState(false);
  const appliedCount = countAppliedFilters(params);

  return (
    <div className="ref-toolbar panel">
      <LibrarySearchInput placeholder={placeholder} value={params.q} onChange={onSearch} />
      <button
        aria-expanded={openOnMobile}
        className="btn filter-toggle"
        type="button"
        onClick={() => setOpenOnMobile((prev) => !prev)}
      >
        ⚙ 필터{appliedCount > 0 ? ` (${appliedCount})` : ""}
      </button>
      <div className={`filter-rows${openOnMobile ? " open" : ""}`}>{children}</div>
    </div>
  );
}

/**
 * 결과 개수 + 적용 칩 + [초기화].
 * 숫자는 전부 API 값이다 — 고정 문구 금지 (인수 27). totalAll은 설계/04 §3-2 공통 규약.
 */
export function ResultBar({ page, unit, sortLabel, chips, onReset, totalPrefix = "총" }) {
  const total = page?.totalAll ?? page?.totalElements ?? 0;
  const filtered = page?.totalElements ?? 0;
  const isFiltered = chips.length > 0 && total !== filtered;
  const format = (n) => Number(n).toLocaleString("ko-KR");

  return (
    <div className="result-bar">
      <span className="result-count">
        {isFiltered
          ? `${totalPrefix} ${format(total)}${unit} 중 ${format(filtered)}${unit} · ${sortLabel}`
          : `${totalPrefix} ${format(filtered)}${unit} · ${sortLabel}`}
      </span>
      {chips.length > 0 && (
        <span className="applied-chips">
          {chips.map((chip) => (
            <button
              key={chip.key}
              aria-label={`${chip.label} 조건 해제`}
              className="applied-chip"
              type="button"
              onClick={chip.onRemove}
            >
              {chip.label}
              <span aria-hidden="true"> ✕</span>
            </button>
          ))}
          <button className="btn ghost" type="button" onClick={onReset}>
            초기화
          </button>
        </span>
      )}
    </div>
  );
}

/**
 * 0건 (설계/05 §8) — 검색어가 있을 때와 필터만 걸렸을 때 문구가 갈린다.
 * 조건이 하나도 없는데 0건이면 "아직 없는 것"이지 "못 찾은 것"이 아니다(설계/05 §8).
 */
export function EmptyBlock({ query, hint, conditionText, onReset, notReady = null }) {
  const searched = Boolean(query);
  if (notReady) {
    return (
      <div className="panel empty-block">
        <div aria-hidden="true" className="empty-glyph">
          🔍
        </div>
        <h2>아직 준비 중이에요</h2>
        <p>{notReady.description}</p>
        <Link className="btn primary" to={notReady.to}>
          {notReady.label}
        </Link>
      </div>
    );
  }
  return (
    <div className="panel empty-block">
      <div aria-hidden="true" className="empty-glyph">
        🔍
      </div>
      <h2>{searched ? `'${query}' 검색 결과가 없어요` : "조건에 맞는 항목이 없어요"}</h2>
      <p>{searched ? hint : conditionText}</p>
      <button className="btn primary" type="button" onClick={onReset}>
        {searched ? "검색·필터 초기화" : "필터 초기화"}
      </button>
    </div>
  );
}

/** 상세 상단 보조줄 — "목록으로"는 직전 목록 주소를 그대로 복원한다 (인수 14) */
export function RefTopbar({ backTo, caption }) {
  return (
    <div className="unit-topbar ref-topbar">
      <Link className="btn ghost" to={backTo}>
        ‹ 목록으로
      </Link>
      <span className="unit-topbar-title">{caption}</span>
    </div>
  );
}

/** "어디서 배우나" — 첫 줄만 primary, 나머지는 텍스트 링크 (설계/05 §3-2) */
export function WhereLearn({ entries, lang = "ja" }) {
  const en = lang === "en";
  const unitBase = en ? "/en/courses" : "/courses";
  const list = (entries ?? []).filter(Boolean);
  if (list.length === 0) return null;

  return (
    <div className="panel padded where-learn">
      <div className="step-caption">어디서 배우나</div>
      {list.map((entry, i) => (
        <div key={`${entry.courseId}-${entry.unitNo}-${i}`} className="where-learn-row">
          <span className="where-learn-text">
            {entry.courseTitle}
            {!en && `(${entry.level})`} 코스 · 유닛 {entry.unitNo} {entry.unitTitle}
          </span>
          {i === 0 ? (
            <Link className="btn primary" to={`${unitBase}/${entry.courseId}/units/${entry.unitNo}`}>
              이 유닛에서 배우기 ›
            </Link>
          ) : (
            <Link to={`${unitBase}/${entry.courseId}/units/${entry.unitNo}`}>배우기 ›</Link>
          )}
        </div>
      ))}
    </div>
  );
}
