import { screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { apiError, apiSuccess, stubFetch } from "../test/helpers.jsx";
import { kanjiItem, renderLibrary } from "../test/libraryHelpers.jsx";
import { LibraryKanjiDetailPage } from "./LibraryKanjiDetailPage.jsx";

function detail(overrides = {}) {
  return {
    ...kanjiItem(),
    words: [{ word: "日本人", kana: "にほんじん", meaningKo: "일본인" }],
    learnedIn: { courseId: 2, courseTitle: "왕초보", level: "N5", unitNo: 3, unitTitle: "여기는 어디예요?" },
    ...overrides,
  };
}

function render(response, route = "/library/kanji/11") {
  stubFetch(() => response);
  renderLibrary(<LibraryKanjiDetailPage />, { path: "/library/kanji/:kanjiId", route });
}

describe("LibraryKanjiDetailPage (설계/05 §7)", () => {
  it("큰 글자·훈음·레벨·읽기·예시 단어를 보여준다 (인수 12)", async () => {
    render(apiSuccess(detail()));

    expect(await screen.findByText("人")).toBeInTheDocument();
    expect(screen.getByText("사람 인")).toBeInTheDocument();
    expect(screen.getByText("N5")).toBeInTheDocument();
    expect(screen.getByText("ジン・ニン")).toBeInTheDocument();
    expect(screen.getByText("日本人")).toBeInTheDocument();
    expect(screen.getByText("にほんじん")).toBeInTheDocument();
  });

  it("음독이 없으면 그 행을 렌더하지 않는다", async () => {
    render(apiSuccess(detail({ onyomi: null })));

    expect(await screen.findByText("훈독")).toBeInTheDocument();
    expect(screen.queryByText("음독")).toBeNull();
  });

  it("예시 단어가 없으면 소제목째 렌더하지 않는다 (빈 제목 금지)", async () => {
    render(apiSuccess(detail({ words: [] })));

    await screen.findByText("사람 인");
    expect(screen.queryByText("예시 단어")).toBeNull();
  });

  it("'어디서 배우나'의 primary가 그 유닛으로 간다 (인수 13·32)", async () => {
    render(apiSuccess(detail()));

    expect(await screen.findByText(/왕초보\(N5\) 코스 · 유닛 3 여기는 어디예요\?/)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /이 유닛에서 배우기/ })).toHaveAttribute("href", "/courses/2/units/3");
  });

  it("'목록으로'는 직전 목록 주소를 복원한다 (인수 14)", async () => {
    render(apiSuccess(detail()), "/library/kanji/11?q=%EC%82%AC%EB%9E%8C&level=N5&page=2");

    expect(await screen.findByRole("link", { name: /목록으로/ })).toHaveAttribute(
      "href",
      "/library/kanji?q=%EC%82%AC%EB%9E%8C&level=N5&page=2",
    );
  });

  it("404면 [자료실로]가 한자 목록으로 간다 (인수 34)", async () => {
    render(apiError(404, "NOT_FOUND"));

    expect(await screen.findByText("찾을 수 없는 항목이에요")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "자료실로" })).toHaveAttribute("href", "/library/kanji");
  });

  it("500이면 [다시 시도] 오류 카드 (§7-3)", async () => {
    render(apiError(500, "INTERNAL_ERROR"));

    expect(await screen.findByRole("button", { name: "다시 시도" })).toBeInTheDocument();
  });
});
