import { render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { describe, expect, it } from "vitest";
import { apiError, apiSuccess, stubFetch } from "../test/helpers.jsx";
import { kanjiItem, libraryPage } from "../test/libraryHelpers.jsx";
import { LibraryQuizPage } from "./LibraryQuizPage.jsx";

/**
 * 없는 자료실 유형의 퀴즈 주소 — **재시도로 성공할 수 없는 화면에 [다시 시도]를 두지 않는다**
 * (2026-08-25 판정 L4)
 *
 * `/library/:type/quiz`는 type을 검증하지 않아 `/library/bogus/quiz`가 그대로 매칭되고,
 * 서버는 정상적으로 404를 주는데 화면은 그것을 통신 실패로 뭉개 [다시 시도] 카드를 띄운다.
 * **몇 번을 눌러도 성공할 수 없다** — `HomeController` 주석이 경계한 바로 그 패턴이고,
 * 이미 `CourseDetailPage`가 같은 판정("400·404는 재시도로 회복 불가 → 404 화면")을 받아 고쳤다.
 *
 * 자료실 **목록** 라우트는 이미 kanji·grammar·vocabulary 3개를 열거해 이 문제가 없다.
 * 퀴즈만 와일드카드다 — 같은 제품이 같은 사실(없는 유형)을 두 경로에서 다르게 대한다.
 *
 * 판정: 유형이 kanji·grammar·vocabulary가 아니면 **API를 부르지 않고** 404 화면을 준다.
 *
 * 이 테스트를 수정하지 말 것 — 계약 변경은 senior-dev 경유.
 */

function renderQuizAt(route, fetchHandler) {
  const fetchMock = stubFetch(fetchHandler ?? (() => apiError(404, "NOT_FOUND")));
  render(
    <MemoryRouter initialEntries={[route]}>
      <Routes>
        <Route element={<LibraryQuizPage />} path="/library/:type/quiz" />
      </Routes>
    </MemoryRouter>,
  );
  return fetchMock;
}

describe("없는 자료실 유형의 퀴즈 주소 (L4)", () => {
  it("404 화면을 주고 [다시 시도]는 없다", async () => {
    renderQuizAt("/library/bogus/quiz");

    expect(await screen.findByText(/찾을 수 없는 페이지/)).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "다시 시도" })).not.toBeInTheDocument();
  });

  it("자료실로 돌아가는 길을 준다", async () => {
    renderQuizAt("/library/bogus/quiz");

    const back = await screen.findByRole("link", { name: /자료실/ });
    expect(back).toHaveAttribute("href", "/library/kanji");
  });

  it("서버를 부르지도 않는다 — 없는 유형인 것은 주소만 봐도 안다", async () => {
    const fetchMock = renderQuizAt("/library/bogus/quiz");

    await screen.findByText(/찾을 수 없는 페이지/);
    const libraryCalls = fetchMock.mock.calls.filter(([url]) => String(url).includes("/api/library/"));
    expect(libraryCalls).toHaveLength(0);
  });

  it("정상 유형은 그대로 동작한다 (막는 것은 없는 유형뿐)", async () => {
    const items = Array.from({ length: 6 }, (_, i) => ({
      ...kanjiItem(), id: 10 + i, letter: `字${i}`, meaningKo: `훈음${i}`, onyomi: `オン${i}`, kunyomi: null,
    }));
    renderQuizAt("/library/kanji/quiz", () => apiSuccess(libraryPage(items, { totalElements: 6, totalAll: 100 })));

    expect(await screen.findByRole("button", { name: "문제 풀기" })).toBeInTheDocument();
    expect(screen.queryByText(/찾을 수 없는 페이지/)).not.toBeInTheDocument();
  });
});
