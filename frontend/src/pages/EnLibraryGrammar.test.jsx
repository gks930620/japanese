import { screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { apiSuccess, stubFetch } from "../test/helpers.jsx";
import { grammarItem, libraryPage, renderLibrary } from "../test/libraryHelpers.jsx";
import { LibraryGrammarPage } from "./LibraryGrammarPage.jsx";

/**
 * 영어 문법 자료실의 **일본어 누출** 두 가지 (2026-08-25 판정 A-M4 · A-L4)
 *
 * - **A-M4**: 검색창 placeholder가 `PLACEHOLDER` 상수 하나라 영어 화면에도 "예: てから, 가능형"이 뜬다.
 *   같은 화면의 다른 자리는 전부 갈라 놨고(0건 힌트·레벨 라벨·탭), 어휘 탭에는 `EN_PLACEHOLDER` 선례가 있다.
 *   설계/05 §16-3의 취지("일본어 개념이 영어 화면에 나오지 않는다")에 정면으로 어긋난다.
 *
 * - **A-L4**: "활용표 있는 것만" 칩은 영어에서 **항상 0건**이다. 영어 문법에는 활용표(`rules`) 개념 자체가 없다
 *   (실측: 영어 문법 4개 전부 `hasRules:false`, 유닛 응답도 `rules: []`).
 *   판정 기준은 **구조적 0이냐 일시적 0이냐**다:
 *     · 구조적 0(영어 활용표) → 칩을 **뺀다**. 한자 탭이 INTRO 칩을 뺀 것과 같은 판단(`libraryQuery.js:42`)
 *     · 일시적 0(영어 레벨 "코스 2~5" = 준비중, 일본어 "접속사" = 미분류) → **둔다.** 데이터가 채워지면 채워진다
 *
 * 이 테스트를 수정하지 말 것 — 계약 변경은 senior-dev 경유.
 */

const EN_ITEMS = [
  { ...grammarItem(), id: 9001, name: "be동사 현재형", nameKo: "~이다", level: "E1", hasRules: false },
  { ...grammarItem(), id: 9002, name: "일반동사 현재형", nameKo: "~한다", level: "E1", hasRules: false },
];
const JA_ITEMS = [grammarItem()];

function renderGrammar({ en, items }) {
  stubFetch(() => apiSuccess(libraryPage(items, { size: 20 })));
  return renderLibrary(<LibraryGrammarPage lang={en ? "en" : "ja"} />, {
    path: en ? "/en/library/grammar" : "/library/grammar",
    route: en ? "/en/library/grammar" : "/library/grammar",
  });
}

describe("영어 문법 검색창 (A-M4)", () => {
  it("가나 예시가 없다", async () => {
    renderGrammar({ en: true, items: EN_ITEMS });

    const box = await screen.findByLabelText("자료실 검색");
    expect(box.getAttribute("placeholder")).not.toMatch(/てから|가능형/);
  });

  it("영어에 맞는 예시를 준다 — 검색 대상은 명칭과 한국어 뜻 그대로다", async () => {
    renderGrammar({ en: true, items: EN_ITEMS });

    const box = await screen.findByLabelText("자료실 검색");
    expect(box.getAttribute("placeholder")).toMatch(/검색/);
    expect(box.getAttribute("placeholder")).toMatch(/[A-Za-z]/); // 영어 예시 한 낱말 이상
  });

  it("일본어 화면은 그대로다 (회귀)", async () => {
    renderGrammar({ en: false, items: JA_ITEMS });

    const box = await screen.findByLabelText("자료실 검색");
    expect(box.getAttribute("placeholder")).toContain("てから");
  });
});

describe("항상 0건인 필터 칩 (A-L4)", () => {
  it("영어 문법에는 '활용표 있는 것만' 칩이 없다 — 구조적으로 0건이다", async () => {
    renderGrammar({ en: true, items: EN_ITEMS });

    await screen.findByLabelText("자료실 검색");
    expect(screen.queryByRole("button", { name: "활용표 있는 것만" })).not.toBeInTheDocument();
  });

  it("일본어 문법에는 그대로 있다 (실제로 걸리는 데이터가 있다)", async () => {
    renderGrammar({ en: false, items: JA_ITEMS });

    expect(await screen.findByRole("button", { name: "활용표 있는 것만" })).toBeInTheDocument();
  });

  it("영어 레벨 칩(코스 2~5)은 남긴다 — 준비중이라 비어 있을 뿐 구조적 0이 아니다", async () => {
    renderGrammar({ en: true, items: EN_ITEMS });

    await screen.findByLabelText("자료실 검색");
    expect(screen.getByRole("button", { name: "코스 2" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "코스 5" })).toBeInTheDocument();
  });
});
