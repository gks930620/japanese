// frontend-dev 작성 — 영어 자료실 3탭 + 표현 상세 (설계/05 §16-3).
// 갈리는 지점만 본다: 탭 3개(기본 표현) · 코스 필터 문구 · 정렬 셀렉트 미렌더 ·
// 발음 병기 · 탭 전체 0건 문구 · levelLabel 미사용.
import { render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { beforeEach, describe, expect, it } from "vitest";
import { apiError, apiSuccess, stubFetch } from "../test/helpers.jsx";
import {
  enVocabularyEntryFixture,
  expressionDetailFixture,
  expressionListItemFixture,
  grammarListItemFixture,
  libraryPageFixture,
} from "../test/apiFixtures.js";
import { AuthProvider } from "../context/AuthContext.jsx";
import { UserDataProvider } from "../context/UserDataContext.jsx";
import { EnLibraryExpressionsPage } from "./EnLibraryExpressionsPage.jsx";
import { EnExpressionDetailPage } from "./EnExpressionDetailPage.jsx";
import { LibraryGrammarPage } from "./LibraryGrammarPage.jsx";
import { LibraryVocabPage } from "./LibraryVocabPage.jsx";

const EXPRESSIONS = [
  expressionListItemFixture({ id: 7001, text: "get up", meaningKo: "일어나다", ipa: "/ɡet ʌp/", koApprox: "겟 업" }),
  expressionListItemFixture({ id: 7002, text: "look for", meaningKo: "~을 찾다" }),
];

function renderPage(element, { route, path, handler }) {
  const fetchMock = stubFetch((url) => {
    if (url.includes("/api/users/me")) return apiError(401, "NOT_AUTHENTICATED");
    return handler(url);
  });
  render(
    <MemoryRouter initialEntries={[route]}>
      <AuthProvider>
        <UserDataProvider>
          <Routes>
            <Route element={element} path={path} />
          </Routes>
        </UserDataProvider>
      </AuthProvider>
    </MemoryRouter>,
  );
  return fetchMock;
}

beforeEach(() => {
  window.localStorage.clear();
});

describe("영어 표현 목록 (§4-2)", () => {
  const handler = (url) =>
    url.includes("/api/en/library/expressions") ? apiSuccess(libraryPageFixture(EXPRESSIONS)) : apiSuccess(null);

  const renderList = (route = "/en/library/expressions") =>
    renderPage(<EnLibraryExpressionsPage />, { route, path: "/en/library/expressions", handler });

  it("영어 표현 API로 묻는다", async () => {
    const fetchMock = renderList();

    await screen.findByText("get up");
    expect(fetchMock.mock.calls.some(([url]) => String(url).includes("/api/en/library/expressions"))).toBe(true);
  });

  it("탭은 표현·문법·어휘 3개다 — 한자 탭이 없다", async () => {
    renderList();

    await screen.findByText("get up");
    expect(screen.getByRole("link", { name: "표현" }).getAttribute("href")).toBe("/en/library/expressions");
    expect(screen.getByRole("link", { name: "문법" }).getAttribute("href")).toBe("/en/library/grammar");
    expect(screen.getByRole("link", { name: "어휘" }).getAttribute("href")).toBe("/en/library/vocabulary");
    expect(screen.queryByRole("link", { name: "한자" })).not.toBeInTheDocument();
  });

  it("레벨 필터는 코스 1~5로 읽히고 코드는 화면에 없다", async () => {
    renderList();

    await screen.findByText("get up");
    expect(screen.getByRole("button", { name: "코스 1" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "코스 5" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "E1" })).not.toBeInTheDocument();
  });

  it("정렬 셀렉트를 렌더하지 않는다 — 선택지가 하나뿐이다", async () => {
    renderList();

    await screen.findByText("get up");
    expect(screen.queryByRole("combobox", { name: "정렬" })).not.toBeInTheDocument();
  });

  it("발음이 있으면 IPA·한글을 한 줄로 병기하고, 없으면 줄을 만들지 않는다", async () => {
    renderList();

    await screen.findByText("get up");
    expect(screen.getByText("/ɡet ʌp/ · 겟 업")).toBeInTheDocument();
    expect(document.querySelectorAll(".expr-pron")).toHaveLength(1);
  });

  it("조건 없이 0건이면 아직 준비 중 안내다 — 검색 0건 문구와 다르다", async () => {
    renderPage(<EnLibraryExpressionsPage />, {
      route: "/en/library/expressions",
      path: "/en/library/expressions",
      handler: () => apiSuccess(libraryPageFixture([], { totalElements: 0, totalAll: 0 })),
    });

    expect(await screen.findByText("아직 준비 중이에요")).toBeInTheDocument();
    expect(screen.queryByText(/검색 결과가 없어요/)).not.toBeInTheDocument();
    expect(screen.getByRole("link", { name: /영어 코스 보기/ }).getAttribute("href")).toBe("/en/courses");
  });

  it("검색어가 있으면 검색 0건 문구다", async () => {
    renderPage(<EnLibraryExpressionsPage />, {
      route: "/en/library/expressions?q=zzz",
      path: "/en/library/expressions",
      handler: () => apiSuccess(libraryPageFixture([], { totalElements: 0, totalAll: 12 })),
    });

    expect(await screen.findByText(/검색 결과가 없어요/)).toBeInTheDocument();
  });
});

describe("영어 표현 상세 (§4-5)", () => {
  const DETAIL = expressionDetailFixture({
    id: 7001,
    text: "get up",
    meaningKo: "잠자리에서 일어나다",
    usageNote: "아침에 몸을 일으키는 동작에 쓴다",
    ipa: "/ɡet ʌp/",
    koApprox: "겟 업",
    examples: [{ id: 1, en: "I get up at seven.", meaningKo: "나는 7시에 일어난다." }],
  });

  const renderDetail = (handler) =>
    renderPage(<EnExpressionDetailPage />, {
      route: "/en/library/expressions/7001",
      path: "/en/library/expressions/:expressionId",
      handler,
    });

  it("표제·발음·뜻·용법·예문과 배운 곳을 보여준다", async () => {
    renderDetail(() => apiSuccess(DETAIL));

    expect(await screen.findByText("get up")).toBeInTheDocument();
    expect(screen.getByText("/ɡet ʌp/ · 겟 업")).toBeInTheDocument();
    expect(screen.getByText("잠자리에서 일어나다")).toBeInTheDocument();
    expect(screen.getByText("I get up at seven.")).toBeInTheDocument();
    expect(screen.getByText(/다시 세우기 코스 · 유닛 1/)).toBeInTheDocument();
  });

  it("배우기 링크가 영어 유닛으로 간다 — 레벨 괄호도 없다", async () => {
    renderDetail(() => apiSuccess(DETAIL));

    const link = await screen.findByRole("link", { name: /이 유닛에서 배우기/ });
    expect(link.getAttribute("href")).toBe("/en/courses/101/units/1");
    expect(screen.queryByText(/\(E1\)/)).not.toBeInTheDocument();
  });

  it("없는 표현이면 표현 목록으로 돌려보낸다", async () => {
    renderDetail(() => apiError(404, "NOT_FOUND"));

    expect(await screen.findByText(/찾을 수 없는/)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "자료실로" }).getAttribute("href")).toBe("/en/library/expressions");
  });
});

describe("영어 문법·어휘 탭 (§4-3·§4-4)", () => {
  it("문법 목록은 영어 API로 묻고 별을 붙이지 않는다", async () => {
    const fetchMock = renderPage(<LibraryGrammarPage lang="en" />, {
      route: "/en/library/grammar",
      path: "/en/library/grammar",
      handler: () =>
        apiSuccess(
          libraryPageFixture([grammarListItemFixture({ id: 7101, name: "be going to", nameKo: "~할 예정이다" })]),
        ),
    });

    await screen.findByText("be going to");
    expect(fetchMock.mock.calls.some(([url]) => String(url).includes("/api/en/library/grammar"))).toBe(true);
    expect(document.querySelector(".bm-star")).toBeNull();
  });

  it("어휘 목록은 읽기 열 자리에 발음을 넣고 품사는 영어 7종만 고른다", async () => {
    renderPage(<LibraryVocabPage lang="en" />, {
      route: "/en/library/vocabulary",
      path: "/en/library/vocabulary",
      handler: () =>
        apiSuccess(
          libraryPageFixture([
            enVocabularyEntryFixture({ id: 7201, word: "apple", ipa: "/ˈæpəl/", koApprox: "애플", meanings: ["사과"] }),
          ]),
        ),
    });

    await screen.findByText("apple");
    expect(screen.getByRole("columnheader", { name: "발음" })).toBeInTheDocument();
    expect(screen.getByText("/ˈæpəl/")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "전치사" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "い형용사" })).not.toBeInTheDocument();
  });
});
