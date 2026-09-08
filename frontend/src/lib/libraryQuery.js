// 자료실 목록의 상태 = 주소(쿼리스트링). 컴포넌트 state에 이중으로 두지 않는다 (설계/05 §9).
// 파라미터명은 API 계약(§4-B)과 동일: q · level · pos · sort · hasRules · page.
// 단, page는 화면 주소에서 1-base(기본 1은 생략), API는 0-base다 — 변환은 여기 한 곳에서만 한다.
import { PART_OF_SPEECH_CODES } from "../constants/partOfSpeech.js";

/**
 * 레벨 표시 맵 (설계/05 §16-2) — **코드 → 문구 한 방향뿐이다.**
 * 문구에서 코드를 되만드는 함수를 만들지 않는다(3단계 치명 ①이 났던 문). 요청에는 언제나 코드가 실린다.
 */
export const LEVEL_TEXT = {
  INTRO: "입문",
  N5: "N5",
  N4: "N4",
  N3: "N3",
  N2: "N2",
  N1: "N1",
  E1: "코스 1",
  E2: "코스 2",
  E3: "코스 3",
  E4: "코스 4",
  E5: "코스 5",
};

/** 유효한 레벨 코드 전체 — 주소 판정용(탭 선택지와 다르다, §5-5) */
export const ALL_LEVEL_CODES = Object.keys(LEVEL_TEXT);

/** 코드 → 사람이 읽는 문구. 모르는 코드는 코드를 그대로(장래 코드가 늘어도 화면이 비지 않는다) */
export function levelText(code) {
  if (!code) return "";
  return LEVEL_TEXT[code] ?? code;
}

const JA_LEVELS = ["INTRO", "N5", "N4", "N3", "N2", "N1"];
const EN_LEVELS = ["E1", "E2", "E3", "E4", "E5"];

/**
 * 자료실별 레벨 선택지 (설계/04 §3-1 · 설계/05 §16-2) — 학습 순서 고정.
 * 한자에는 입문이 없다(데이터 0건이라 고르면 항상 0건 화면이 된다). 없는 이유를 화면에 설명하지 않는다(§7-2).
 */
export function levelOptions({ type, lang = "ja" }) {
  if (lang === "en") return EN_LEVELS;
  return type === "kanji" ? JA_LEVELS.filter((code) => code !== "INTRO") : JA_LEVELS;
}

/** 일본어 기본 선택지 — 기존 호출부(한자 탭)의 기본값 */
export const LEVELS = levelOptions({ type: "kanji" });

/** 자료실별 페이지 크기 (설계/05 §9 — 화면폭에 따라 바꾸지 않는다) */
export const PAGE_SIZE = { kanji: 60, grammar: 20, vocabulary: 50 };

const DEFAULT_SORT = "LEARNING";

function splitList(raw, allowed) {
  if (!raw) return [];
  const seen = [];
  raw
    .split(",")
    .map((value) => value.trim())
    .forEach((value) => {
      if (allowed.includes(value) && !seen.includes(value)) seen.push(value);
    });
  return seen;
}

/**
 * 주소의 쿼리스트링 → 목록 상태.
 * @param {string|URLSearchParams} search
 */
export function parseLibraryParams(search) {
  const params = typeof search === "string" ? new URLSearchParams(search) : search;
  const page = Number.parseInt(params.get("page") ?? "", 10);
  return {
    q: (params.get("q") ?? "").trim(),
    // 탭 선택지가 아니라 **유효한 코드 전체**로 판정한다 — 한자 탭의 ?level=INTRO도 적용 칩에 떠야 해제할 수 있다(§5-5)
    levels: splitList(params.get("level"), ALL_LEVEL_CODES),
    pos: splitList(params.get("pos"), PART_OF_SPEECH_CODES),
    sort: params.get("sort") === "KANA" ? "KANA" : DEFAULT_SORT,
    hasRules: params.get("hasRules") === "true",
    page: Number.isFinite(page) && page >= 1 ? page : 1,
  };
}

/** 목록 상태 → 화면 주소용 쿼리스트링. 기본값은 생략한다(공유 주소를 깨끗하게). */
export function buildLibrarySearch(params) {
  const search = new URLSearchParams();
  if (params.q) search.set("q", params.q);
  if (params.levels?.length) search.set("level", params.levels.join(","));
  if (params.pos?.length) search.set("pos", params.pos.join(","));
  if (params.hasRules) search.set("hasRules", "true");
  if (params.sort && params.sort !== DEFAULT_SORT) search.set("sort", params.sort);
  if (params.page && params.page > 1) search.set("page", String(params.page));
  const text = search.toString();
  return text ? `?${text}` : "";
}

/** 목록 상태 → API URL (설계/04 §3-1). page는 0-base로 변환한다. */
export function buildLibraryApiUrl(endpoint, params, size) {
  const search = new URLSearchParams();
  search.set("page", String(Math.max(0, (params.page ?? 1) - 1)));
  search.set("size", String(size));
  if (params.q) search.set("q", params.q);
  if (params.levels?.length) search.set("level", params.levels.join(","));
  if (params.pos?.length) search.set("pos", params.pos.join(","));
  if (params.hasRules) search.set("hasRules", "true");
  if (params.sort && params.sort !== DEFAULT_SORT) search.set("sort", params.sort);
  return `${endpoint}?${search.toString()}`;
}

/** 적용된 조건 개수 — [초기화] 노출과 모바일 필터 토글 배지에 쓴다. 페이지 번호는 조건이 아니다. */
export function countAppliedFilters(params) {
  return (
    (params.q ? 1 : 0) +
    (params.levels?.length ?? 0) +
    (params.pos?.length ?? 0) +
    (params.hasRules ? 1 : 0) +
    (params.sort !== DEFAULT_SORT ? 1 : 0)
  );
}

/** 필터 칩 복수 선택 토글 */
export function toggleValue(list, value) {
  return list.includes(value) ? list.filter((item) => item !== value) : [...list, value];
}
