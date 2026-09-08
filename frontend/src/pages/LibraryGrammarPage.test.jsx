import { screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import { apiError, apiSuccess, stubFetch } from "../test/helpers.jsx";
import { grammarItem, libraryPage, renderLibrary } from "../test/libraryHelpers.jsx";
import { LibraryGrammarPage } from "./LibraryGrammarPage.jsx";
import { LibraryGrammarDetailPage } from "./LibraryGrammarDetailPage.jsx";

function renderList(page, route = "/library/grammar") {
  const fetchMock = stubFetch(() => apiSuccess(page));
  renderLibrary(<LibraryGrammarPage />, { path: "/library/grammar", route });
  return fetchMock;
}

describe("LibraryGrammarPage — 목록 (설계/05 §7)", () => {
  it("명칭·한국어 부제·레벨을 보여주고 상세로 연결한다 (인수 15)", async () => {
    renderList(libraryPage([grammarItem()]));

    const row = await screen.findByRole("link", { name: /動詞て形/ });
    expect(within(row).getByText("동사 て형 만들기")).toBeInTheDocument();
    expect(within(row).getByText("N5")).toBeInTheDocument();
    expect(row).toHaveAttribute("href", "/library/grammar/37");
  });

  it("활용표가 있는 항목에만 '활용표' 태그가 붙는다 (인수 16)", async () => {
    renderList(libraryPage([grammarItem(), grammarItem({ id: 38, name: "〜てから", hasRules: false })]));

    const withRules = await screen.findByRole("link", { name: /動詞て形/ });
    const withoutRules = screen.getByRole("link", { name: /〜てから/ });
    expect(within(withRules).getByText("활용표")).toBeInTheDocument();
    expect(within(withoutRules).queryByText("활용표")).toBeNull();
  });

  it("'활용표 있는 것만' 토글이 주소와 API 파라미터에 반영된다", async () => {
    const user = userEvent.setup();
    const fetchMock = renderList(libraryPage([grammarItem()]));
    await screen.findByText("動詞て形");

    await user.click(screen.getByRole("button", { name: "활용표 있는 것만" }));

    await waitFor(() => expect(screen.getByTestId("location")).toHaveTextContent("?hasRules=true"));
    await waitFor(() =>
      expect(fetchMock.mock.calls.at(-1)[0]).toBe("/api/library/grammar?page=0&size=20&hasRules=true"),
    );
  });

  it("0건이면 문법 자료실 문구로 안내한다 (§7-2)", async () => {
    renderList(libraryPage([], { totalElements: 0, totalAll: 206 }), "/library/grammar?q=zzz");

    expect(await screen.findByText(/'zzz' 검색 결과가 없어요/)).toBeInTheDocument();
    expect(screen.getByText(/물결표/)).toBeInTheDocument();
  });
});

describe("LibraryGrammarDetailPage (설계/05 §7-1)", () => {
  function detail(overrides = {}) {
    return {
      id: 37,
      name: "動詞て形",
      nameKo: "동사 て형 만들기",
      explanation: "두 동작의 순서를 분명히 할 때 써요.",
      level: "N5",
      examples: [{ jp: "手を 洗ってから 食べます。", kana: "てを あらってから たべます。", meaningKo: "손을 씻고 나서 먹습니다." }],
      rules: [{ groupLabel: "1그룹", pattern: "う・つ・る → って", exampleBefore: "買う", exampleAfter: "買って" }],
      learnedIn: { courseId: 2, courseTitle: "왕초보", level: "N5", unitNo: 18, unitTitle: "사진 좀 찍어 주세요" },
      ...overrides,
    };
  }

  function renderDetail(response, route = "/library/grammar/37") {
    stubFetch(() => response);
    renderLibrary(<LibraryGrammarDetailPage />, { path: "/library/grammar/:grammarId", route });
  }

  it("유닛 학습과 같은 본문(예문·규칙표·설명)을 보여준다 (인수 18)", async () => {
    renderDetail(apiSuccess(detail()));

    expect(await screen.findByText("動詞て形")).toBeInTheDocument();
    expect(screen.getByText("손을 씻고 나서 먹습니다.")).toBeInTheDocument();
    expect(screen.getByText("買う")).toBeInTheDocument();
    expect(screen.getByText(/두 동작의 순서/)).toBeInTheDocument();
  });

  it("활용표가 없으면 표 블록을 렌더하지 않는다 (인수 19)", async () => {
    renderDetail(apiSuccess(detail({ rules: [] })));

    await screen.findByText("動詞て形");
    expect(screen.queryByRole("table")).toBeNull();
  });

  it("404면 [자료실로]가 문법 목록으로 간다 (인수 34)", async () => {
    renderDetail(apiError(404, "NOT_FOUND"));

    expect(await screen.findByRole("link", { name: "자료실로" })).toHaveAttribute("href", "/library/grammar");
  });
});
