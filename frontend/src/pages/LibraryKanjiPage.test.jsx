import { screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import { apiError, apiSuccess, stubFetch } from "../test/helpers.jsx";
import { kanjiItem, libraryPage, renderLibrary } from "../test/libraryHelpers.jsx";
import { LibraryKanjiPage } from "./LibraryKanjiPage.jsx";

function render(page, route = "/library/kanji") {
  const fetchMock = stubFetch(() => (page instanceof Error ? page : apiSuccess(page)));
  renderLibrary(<LibraryKanjiPage />, { path: "/library/kanji", route });
  return fetchMock;
}

describe("LibraryKanjiPage — 목록 (설계/05 §7)", () => {
  it("타일에 글자·훈음·음독·훈독·레벨이 보인다 (인수 9)", async () => {
    render(libraryPage([kanjiItem()]));

    const tile = await screen.findByRole("link", { name: /사람 인/ });
    expect(within(tile).getByText("人")).toBeInTheDocument();
    expect(within(tile).getByText("ジン・ニン")).toBeInTheDocument();
    expect(within(tile).getByText("ひと")).toBeInTheDocument();
    expect(within(tile).getByText("N5")).toBeInTheDocument(); // 레벨 배지
  });

  it("음독·훈독이 없으면 그 줄을 렌더하지 않는다", async () => {
    render(libraryPage([kanjiItem({ onyomi: null })]));

    expect(await screen.findByText("ひと")).toBeInTheDocument();
    expect(screen.queryByText("ジン・ニン")).toBeNull();
  });

  it("타일은 상세로 가고, 목록 조건을 주소에 함께 넘긴다 (인수 14)", async () => {
    render(libraryPage([kanjiItem()]), "/library/kanji?q=%EC%82%AC%EB%9E%8C&page=2");

    const tile = await screen.findByRole("link", { name: /사람 인/ });
    expect(tile).toHaveAttribute("href", "/library/kanji/11?q=%EC%82%AC%EB%9E%8C&page=2");
  });

  it("결과 개수는 API 값(totalAll·totalElements)에서 만든다 — 고정 숫자 금지 (인수 27)", async () => {
    render(libraryPage([kanjiItem()], { totalElements: 350, totalAll: 1000 }), "/library/kanji?level=N3");

    expect(await screen.findByText(/총 1,000자 중 350자 · 학습 순서/)).toBeInTheDocument();
  });

  it("조건이 없으면 전체 개수만 보여준다", async () => {
    render(libraryPage([kanjiItem()], { totalElements: 1000, totalAll: 1000 }));

    expect(await screen.findByText("총 1,000자 · 학습 순서")).toBeInTheDocument();
  });
});

describe("LibraryKanjiPage — 주소 동기화 (인수 6·7)", () => {
  it("API는 계약 파라미터명으로 호출한다 (page는 0-base)", async () => {
    const fetchMock = render(libraryPage([kanjiItem()]), "/library/kanji?level=N5,N3&q=%EC%82%AC%EB%9E%8C&page=2");

    await screen.findByText("人");
    expect(fetchMock.mock.calls[0][0]).toBe("/api/library/kanji?page=1&size=60&q=%EC%82%AC%EB%9E%8C&level=N5%2CN3");
  });

  it("레벨 칩을 누르면 주소에 반영되고 1페이지로 돌아간다", async () => {
    const user = userEvent.setup();
    render(libraryPage([kanjiItem()]), "/library/kanji?page=3");
    await screen.findByText("人");

    await user.click(screen.getByRole("button", { name: "N4" }));

    await waitFor(() => expect(screen.getByTestId("location")).toHaveTextContent("/library/kanji?level=N4"));
  });

  it("검색어를 입력하면 디바운스 후 주소에 반영되고 1페이지로 돌아간다", async () => {
    const user = userEvent.setup();
    render(libraryPage([kanjiItem()]), "/library/kanji?page=4");
    await screen.findByText("人");

    await user.type(screen.getByLabelText("자료실 검색"), "사람");

    await waitFor(() => expect(screen.getByTestId("location")).toHaveTextContent("?q=%EC%82%AC%EB%9E%8C"));
    expect(screen.getByTestId("location")).not.toHaveTextContent("page=");
  });

  it("적용 칩의 ✕는 그 조건만 해제한다", async () => {
    const user = userEvent.setup();
    render(libraryPage([kanjiItem()]), "/library/kanji?q=%EC%82%AC%EB%9E%8C&level=N5");
    await screen.findByText("人");

    await user.click(screen.getByRole("button", { name: "N5 조건 해제" }));

    await waitFor(() => expect(screen.getByTestId("location")).toHaveTextContent("?q=%EC%82%AC%EB%9E%8C"));
    expect(screen.getByTestId("location")).not.toHaveTextContent("level=");
  });

  it("[초기화]는 쿼리 없는 기본 주소로 보낸다", async () => {
    const user = userEvent.setup();
    render(libraryPage([kanjiItem()]), "/library/kanji?q=%EC%82%AC%EB%9E%8C&level=N5&page=2");
    await screen.findByText("人");

    await user.click(screen.getByRole("button", { name: "초기화" }));

    await waitFor(() => expect(screen.getByTestId("location")).toHaveTextContent(/^\/library\/kanji$/));
  });
});

describe("LibraryKanjiPage — 상태별 UI (§7)", () => {
  it("0건 + 검색어 → 검색어를 인용한 안내와 초기화 버튼", async () => {
    render(libraryPage([], { totalElements: 0, totalAll: 1000 }), "/library/kanji?q=%EC%82%AC%EB%9E%8C%EC%9E%A1%EC%9D%B4");

    expect(await screen.findByText(/'사람잡이' 검색 결과가 없어요/)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "검색·필터 초기화" })).toBeInTheDocument();
  });

  it("0건 + 필터만 → 걸린 조건을 되읽어 준다", async () => {
    render(libraryPage([], { totalElements: 0, totalAll: 1000 }), "/library/kanji?level=N2");

    expect(await screen.findByText("조건에 맞는 항목이 없어요")).toBeInTheDocument();
    expect(screen.getByText(/N2 조건에 해당하는 한자가 없어요/)).toBeInTheDocument();
  });

  it("API 오류여도 탭·검색창은 남고 목록만 오류 카드로 바뀐다 (§7-3)", async () => {
    stubFetch(() => apiError(500, "INTERNAL_ERROR"));
    renderLibrary(<LibraryKanjiPage />, { path: "/library/kanji", route: "/library/kanji" });

    expect(await screen.findByRole("button", { name: "다시 시도" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "문법" })).toBeInTheDocument();
    expect(screen.getByLabelText("자료실 검색")).toBeInTheDocument();
  });
});
