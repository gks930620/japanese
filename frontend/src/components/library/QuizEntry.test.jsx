// senior-dev 선작성(TDD Red) — [이 조건으로 문제 풀기]가 목록의 조건을 출제 주소로 **어떻게 옮기는가**.
// 규칙 원본: 설계/09 §2-2 (출제 범위 = 목록이 보여준 그 범위). 버튼의 자리·모양은 설계/05 §15-1.
//
// **이 파일이 "무엇이 넘어가고 무엇이 안 넘어가는가"의 단일 출처다**(08 C-11).
// 버튼의 배치·4개 미만 비활성·0건 미렌더는 `pages/LibraryQuizPage.test.jsx`가 이미 고정하므로 여기서 다시 세우지 않는다.
//
// | 조건 | 넘긴다? | 이유 |
// |---|---|---|
// | `q` · `level` · `pos` · `hasRules` | O | **모집단을 좁힌다** — 목록이 보여준 개수가 곧 출제 범위라는 약속(09 §2-2·§2-3) |
// | `sort` · `page` | X | 같은 모집단을 **보는 순서·자리**일 뿐, 범위를 바꾸지 않는다 |
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it } from "vitest";
import { parseLibraryParams } from "../../lib/libraryQuery.js";
import { QuizEntry } from "./QuizEntry.jsx";

/** 목록 화면이 넘겨주는 것과 같은 모양으로 렌더한다 — 주소가 목록 상태의 단일 출처다(설계/05 §9) */
function entryHref({ type, search = "", totalElements = 21 }) {
  render(
    <MemoryRouter>
      <QuizEntry params={parseLibraryParams(search)} totalElements={totalElements} type={type} />
    </MemoryRouter>,
  );
  return screen.getByRole("link", { name: "이 조건으로 문제 풀기" }).getAttribute("href");
}

describe("QuizEntry — 목록의 조건을 출제 주소로 옮긴다 (설계/09 §2-2)", () => {
  it("[활용표 있는 것만]은 출제 범위를 좁히는 조건이라 그대로 넘어간다", () => {
    // N4 문법은 47개, 그중 활용표가 있는 것은 21개다.
    // 목록이 21개를 보여준 자리의 버튼이 47개짜리 퀴즈로 데려가면 "이 조건"도 개수도 거짓이 된다.
    expect(entryHref({ type: "grammar", search: "?level=N4&hasRules=true" })).toBe(
      "/library/grammar/quiz?level=N4&hasRules=true",
    );
  });

  it("활용표 토글이 꺼져 있으면 붙지 않는다 — 기본값은 주소에서 생략한다", () => {
    expect(entryHref({ type: "grammar", search: "?level=N4" })).toBe("/library/grammar/quiz?level=N4");
  });

  it("검색어·레벨·품사는 그대로 넘어간다", () => {
    expect(entryHref({ type: "vocabulary", search: "?q=건물&level=N5,N4&pos=NOUN,VERB" })).toBe(
      `/library/vocabulary/quiz?q=${encodeURIComponent("건물")}&level=N5%2CN4&pos=NOUN%2CVERB`,
    );
  });

  it("page·sort는 넘기지 않는다 — 같은 범위를 보는 자리·순서일 뿐이다", () => {
    expect(entryHref({ type: "kanji", search: "?level=N5&sort=KANA&page=3" })).toBe("/library/kanji/quiz?level=N5");
  });

  it("조건이 없으면 쿼리 없는 주소다 — 자료실 전체가 범위다", () => {
    expect(entryHref({ type: "kanji" })).toBe("/library/kanji/quiz");
  });

  it("범위를 좁히는 조건은 전부 함께 실리고, 범위와 무관한 것만 떨어진다", () => {
    expect(entryHref({ type: "grammar", search: "?q=ば&level=N4&hasRules=true&sort=KANA&page=2" })).toBe(
      `/library/grammar/quiz?q=${encodeURIComponent("ば")}&level=N4&hasRules=true`,
    );
  });
});
