// frontend-dev 작성 — 자료실 퀴즈 진입·화면(설계/05 §15-1). 선작성 테스트가 덮지 않는 부분.
import { render as rtlRender, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { describe, expect, it } from "vitest";
import { apiSuccess, stubFetch } from "../test/helpers.jsx";
import { kanjiItem, libraryPage } from "../test/libraryHelpers.jsx";
import { LocationProbe } from "../test/LocationProbe.jsx";
import { LibraryKanjiPage } from "./LibraryKanjiPage.jsx";
import { LibraryQuizPage } from "./LibraryQuizPage.jsx";

const MANY_KANJI = Array.from({ length: 6 }, (_, i) => ({
  ...kanjiItem(), id: 10 + i, letter: `字${i}`, meaningKo: `훈음${i}`, onyomi: `オン${i}`, kunyomi: null,
}));

function renderList(page, route = "/library/kanji") {
  stubFetch((url) => (url.includes("/api/library/kanji") ? apiSuccess(page) : apiSuccess(null)));
  rtlRender(
    <MemoryRouter initialEntries={[route]}>
      <LocationProbe />
      <Routes>
        <Route element={<LibraryKanjiPage />} path="/library/kanji" />
        <Route element={<div>퀴즈 화면</div>} path="/library/:type/quiz" />
      </Routes>
    </MemoryRouter>,
  );
}

function renderQuiz(page, route = "/library/kanji/quiz") {
  stubFetch((url) => (url.includes("/api/library/") ? apiSuccess(page) : apiSuccess(null)));
  rtlRender(
    <MemoryRouter initialEntries={[route]}>
      <LocationProbe />
      <Routes>
        <Route element={<LibraryQuizPage />} path="/library/:type/quiz" />
        <Route element={<div>자료실 목록</div>} path="/library/kanji" />
      </Routes>
    </MemoryRouter>,
  );
}

describe("자료실 진입 버튼 (Q19·Q21)", () => {
  it("결과 개수 줄에 [이 조건으로 문제 풀기]가 있고 현재 조건을 주소로 넘긴다", async () => {
    renderList(libraryPage(MANY_KANJI, { totalElements: 6, totalAll: 100 }), "/library/kanji?level=N5&page=2");

    const entry = await screen.findByRole("link", { name: "이 조건으로 문제 풀기" });
    // page·sort는 버리고 출제 조건(q·level·pos)만 넘긴다
    expect(entry).toHaveAttribute("href", "/library/kanji/quiz?level=N5");
  });

  it("범위가 4개 미만이면 비활성 안내가 보인다 (Q21)", async () => {
    renderList(libraryPage(MANY_KANJI.slice(0, 3), { totalElements: 3, totalAll: 100 }));

    await screen.findByText(/총 100자 중 3자|총 3자/);
    expect(screen.queryByRole("link", { name: "이 조건으로 문제 풀기" })).not.toBeInTheDocument();
    expect(screen.getByText(/4개 이상 필요해요/)).toBeInTheDocument();
  });

  it("0건이면 버튼째 미렌더 — EmptyBlock이 조건 수정을 이미 안내한다", async () => {
    renderList(libraryPage([], { totalElements: 0, totalAll: 100 }), "/library/kanji?q=zzz");

    await screen.findByText(/검색 결과가 없어요/);
    expect(screen.queryByText(/문제 풀기/)).not.toBeInTheDocument();
  });
});

describe("자료실 퀴즈 화면 (§3-2)", () => {
  it("시작 화면에 범위 되읽기·문항 수 칩·[문제 풀기]가 있다 (Q20)", async () => {
    renderQuiz(libraryPage(MANY_KANJI, { totalElements: 6, totalAll: 100 }));

    expect(await screen.findByRole("button", { name: "문제 풀기" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "10문제" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "20문제" })).toBeInTheDocument();
    expect(screen.getByText(/한자 6(자|개)/)).toBeInTheDocument();
  });

  it("범위 4개 미만으로 직접 진입하면 문제를 낼 수 없다는 안내와 돌아가기가 보인다", async () => {
    renderQuiz(libraryPage(MANY_KANJI.slice(0, 2), { totalElements: 2, totalAll: 100 }));

    expect(await screen.findByText(/문제를 낼 수 없어요/)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "자료실로 돌아가기" })).toBeInTheDocument();
  });

  it("[문제 풀기]를 누르면 문제가 나온다", async () => {
    const user = userEvent.setup();
    renderQuiz(libraryPage(MANY_KANJI, { totalElements: 6, totalAll: 100 }));

    await user.click(await screen.findByRole("button", { name: "문제 풀기" }));

    expect(await screen.findByText(/1 \/ \d+/)).toBeInTheDocument();
  });
});
