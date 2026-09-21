// TDD Red — senior-dev 작성 (2026-09-16, 기술설계_2026-09_SPA_상태복원 §1 — 05 §8 "갱신 로딩"과의 관계)
//
// 설계/05 §8은 페이지·필터 변경을 **"기존 목록을 유지하고 흐리게"**(`.list-loading`)로 정해 두었고
// 자료실 3화면이 그 클래스를 이미 붙이고 있다. 그런데 `useApiQuery`가 URL이 바뀌는 순간 data를 null로
// 떨어뜨려서 그 코드는 **한 번도 실행된 적이 없다** — 실제로는 매번 스켈레톤으로 갈아끼워져 스크롤이 튄다.
// 조회 훅의 `keepPreviousData` 옵션(hooks/useApiQuery.cache.test.jsx)을 자료실 목록 훅(`useLibraryList`)이 켜면
// 문서대로 동작한다. 규칙을 바꾸는 것이 아니라 **규칙을 막고 있던 사정을 없애는 것**이다(08 B-12와 같은 종류).
//
// 자료실 3종은 같은 훅을 쓰므로 문법 목록 하나로 고정한다(08 C-11 — 한 규칙은 한 파일).
//
// 이 테스트를 수정하지 말 것 — 계약 변경은 senior-dev 경유 (CLAUDE.md TDD 규칙 2).
import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import { apiSuccess, stubFetch } from "../test/helpers.jsx";
import { grammarItem, libraryPage, renderLibrary } from "../test/libraryHelpers.jsx";
import { LibraryGrammarPage } from "./LibraryGrammarPage.jsx";

const FIRST = Array.from({ length: 3 }, (_, i) => grammarItem({ id: 30 + i, name: `문법${i}` }));

describe("자료실 목록 — 페이지를 바꾸면 스켈레톤이 아니라 기존 목록이 흐려진다 (설계/05 §8)", () => {
  it("2페이지 응답이 오기 전까지 1페이지 행이 그대로 남고 .list-loading 이 붙는다", async () => {
    stubFetch((url) =>
      String(url).includes("page=1")
        ? new Promise(() => {}) // 2페이지는 아직 오지 않는다 — 그 사이의 화면을 본다
        : apiSuccess(libraryPage(FIRST, { totalElements: 40, totalAll: 40, totalPages: 2, last: false })),
    );
    renderLibrary(<LibraryGrammarPage />, { path: "/library/grammar", route: "/library/grammar" });
    await screen.findByText("문법0");

    await userEvent.setup().click(screen.getByRole("button", { name: "2" }));

    await waitFor(() => expect(screen.getByTestId("location")).toHaveTextContent("page=2"));
    // 옛 행이 남아 있고 흐려졌다
    expect(screen.getByText("문법0")).toBeInTheDocument();
    expect(document.querySelector(".ref-list")).toHaveClass("list-loading");
    // 스켈레톤으로 갈아끼우지 않았다
    expect(document.querySelector(".k-skeleton")).toBeNull();
  });
});
