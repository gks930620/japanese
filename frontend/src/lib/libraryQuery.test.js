import { describe, expect, it } from "vitest";
import {
  buildLibraryApiUrl,
  buildLibrarySearch,
  countAppliedFilters,
  parseLibraryParams,
  levelOptions,
  levelText,
  toggleValue,
} from "./libraryQuery.js";

describe("parseLibraryParams — 주소가 목록 상태의 단일 출처 (설계/05 §9)", () => {
  it("쿼리가 없으면 기본값", () => {
    expect(parseLibraryParams("")).toEqual({
      q: "",
      levels: [],
      pos: [],
      sort: "LEARNING",
      hasRules: false,
      page: 1,
    });
  });

  it("레벨·품사는 콤마 구분 복수로 읽고, 허용 밖 값은 버린다 (설계/04 §3-1)", () => {
    const parsed = parseLibraryParams("?level=N5,N9,N3&pos=VERB,UNKNOWN");
    expect(parsed.levels).toEqual(["N5", "N3"]);
    expect(parsed.pos).toEqual(["VERB"]);
  });

  it("검색어는 trim하고, 공백만이면 미적용", () => {
    expect(parseLibraryParams("?q=%20%20").q).toBe("");
    expect(parseLibraryParams("?q=%20사람%20").q).toBe("사람");
  });

  it("page는 1 미만·비숫자면 1로 보정한다", () => {
    expect(parseLibraryParams("?page=3").page).toBe(3);
    expect(parseLibraryParams("?page=0").page).toBe(1);
    expect(parseLibraryParams("?page=abc").page).toBe(1);
  });

  it("sort는 KANA만 인정하고 그 외는 기본(LEARNING)", () => {
    expect(parseLibraryParams("?sort=KANA").sort).toBe("KANA");
    expect(parseLibraryParams("?sort=WHATEVER").sort).toBe("LEARNING");
  });

  it("hasRules는 true일 때만 적용 (설계/04 §3-5)", () => {
    expect(parseLibraryParams("?hasRules=true").hasRules).toBe(true);
    expect(parseLibraryParams("?hasRules=false").hasRules).toBe(false);
  });
});

describe("buildLibrarySearch — 기본값은 주소에서 생략한다", () => {
  it("전부 기본값이면 빈 문자열", () => {
    expect(buildLibrarySearch(parseLibraryParams(""))).toBe("");
  });

  it("걸린 조건만 담는다", () => {
    const search = buildLibrarySearch({
      q: "사람",
      levels: ["N5", "N3"],
      pos: [],
      sort: "LEARNING",
      hasRules: false,
      page: 2,
    });
    expect(search).toBe("?q=%EC%82%AC%EB%9E%8C&level=N5%2CN3&page=2");
  });

  it("parse → build 왕복이 같은 주소를 만든다", () => {
    const search = "?q=%EA%B1%B4%EB%AC%BC&pos=NOUN%2CVERB&sort=KANA&page=4";
    expect(buildLibrarySearch(parseLibraryParams(search))).toBe(search);
  });
});

describe("buildLibraryApiUrl — API 파라미터명은 계약 그대로, page만 0-base로 변환", () => {
  it("기본 상태에서도 page·size는 명시한다", () => {
    expect(buildLibraryApiUrl("/api/library/kanji", parseLibraryParams(""), 60)).toBe(
      "/api/library/kanji?page=0&size=60",
    );
  });

  it("화면의 page(1-base)를 API의 0-base로 바꾼다", () => {
    const url = buildLibraryApiUrl("/api/library/kanji", parseLibraryParams("?page=3"), 60);
    expect(url).toBe("/api/library/kanji?page=2&size=60");
  });

  it("검색·필터·정렬을 계약 파라미터명으로 싣는다", () => {
    const params = parseLibraryParams("?q=건물&level=N5,N4&pos=NOUN&sort=KANA&hasRules=true");
    const url = buildLibraryApiUrl("/api/library/vocabulary", params, 50);
    expect(url).toBe(
      "/api/library/vocabulary?page=0&size=50&q=%EA%B1%B4%EB%AC%BC&level=N5%2CN4&pos=NOUN&hasRules=true&sort=KANA",
    );
  });
});

describe("countAppliedFilters — [초기화]·모바일 필터 토글의 개수", () => {
  it("조건이 없으면 0 (페이지 번호는 조건이 아니다)", () => {
    expect(countAppliedFilters(parseLibraryParams("?page=5"))).toBe(0);
  });

  it("검색어·레벨 개수·품사 개수·활용표·정렬을 각각 1로 센다", () => {
    expect(countAppliedFilters(parseLibraryParams("?q=사람&level=N5,N4&pos=VERB&hasRules=true&sort=KANA"))).toBe(6);
  });
});

describe("toggleValue — 필터 칩 복수 선택", () => {
  it("없으면 추가, 있으면 제거한다", () => {
    expect(toggleValue(["N5"], "N4")).toEqual(["N5", "N4"]);
    expect(toggleValue(["N5", "N4"], "N5")).toEqual(["N4"]);
  });
});

// 설계/05 §16-2 — 코드는 그대로 두고 **문구만** 사람 말로 바꾼다(단방향).
describe("레벨 표기와 자료실별 선택지 (§5)", () => {
  it("표시 맵은 코드 → 문구 한 방향이다", () => {
    expect(levelText("INTRO")).toBe("입문");
    expect(levelText("N5")).toBe("N5");
    expect(levelText("N1")).toBe("N1");
    expect(levelText("E1")).toBe("코스 1");
    expect(levelText("E5")).toBe("코스 5");
  });

  it("맵에 없는 코드는 코드를 그대로 보여준다 — 사과 문구를 만들지 않는다", () => {
    expect(levelText("N9")).toBe("N9");
    expect(levelText(null)).toBe("");
  });

  it("한자에는 입문 칩이 없고, 문법·어휘에는 있다", () => {
    expect(levelOptions({ type: "kanji" })).toEqual(["N5", "N4", "N3", "N2", "N1"]);
    expect(levelOptions({ type: "grammar" })).toEqual(["INTRO", "N5", "N4", "N3", "N2", "N1"]);
    expect(levelOptions({ type: "vocabulary" })).toEqual(["INTRO", "N5", "N4", "N3", "N2", "N1"]);
  });

  it("영어는 코스 1~5뿐이다 — 일본어 코드가 섞이지 않는다", () => {
    expect(levelOptions({ type: "expressions", lang: "en" })).toEqual(["E1", "E2", "E3", "E4", "E5"]);
    expect(levelOptions({ type: "vocabulary", lang: "en" })).toEqual(["E1", "E2", "E3", "E4", "E5"]);
  });

  it("주소의 level은 탭 선택지가 아니라 **유효한 코드 전체**로 판정한다 (§5-5)", () => {
    // 한자 탭에 ?level=INTRO — 선택지에는 없지만 유효한 코드다(서버는 200 + 0건)
    expect(parseLibraryParams("?level=INTRO").levels).toEqual(["INTRO"]);
    expect(parseLibraryParams("?level=N1,E1").levels).toEqual(["N1", "E1"]);
    expect(parseLibraryParams("?level=N9").levels).toEqual([]);
  });
});
