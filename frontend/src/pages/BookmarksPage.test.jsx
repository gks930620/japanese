import { render as rtlRender, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { beforeEach, describe, expect, it } from "vitest";
import { apiError, apiSuccess, stubFetch } from "../test/helpers.jsx";
import { kanjiItem, libraryPage } from "../test/libraryHelpers.jsx";
import { LocationProbe } from "../test/LocationProbe.jsx";
import { AuthProvider } from "../context/AuthContext.jsx";
import { UserDataProvider } from "../context/UserDataContext.jsx";
import { toggleGuestBookmark } from "../lib/guestStore.js";
import { BookmarksPage } from "./BookmarksPage.jsx";

/**
 * 보관함 화면 (설계/05 §8) — 비로그인 기준.
 * /api/users/me를 401로 스텁해 게스트 상태로 두면 진도·보관함이 localStorage에서 온다.
 */
function render(route = "/bookmarks?tab=kanji", page = libraryPage([kanjiItem()])) {
  const fetchMock = stubFetch((url) =>
    url.includes("/api/users/me") ? apiError(401, "NOT_AUTHENTICATED") : apiSuccess(page),
  );
  rtlRender(
    <MemoryRouter initialEntries={[route]}>
      <LocationProbe />
      <AuthProvider>
        <UserDataProvider>
          <Routes>
            <Route element={<BookmarksPage />} path="/bookmarks" />
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

describe("BookmarksPage — 탭 (AC-B-11·17)", () => {
  it("tab이 없으면 담은 것이 가장 많은 탭으로 주소를 바꾼다", async () => {
    toggleGuestBookmark("grammar", 7, true);
    toggleGuestBookmark("grammar", 8, true);
    toggleGuestBookmark("kanji", 12, true);
    render("/bookmarks");

    await waitFor(() => expect(screen.getByTestId("location")).toHaveTextContent("/bookmarks?tab=grammar"));
  });

  it("담은 것이 하나도 없으면 한자 탭이다", async () => {
    render("/bookmarks");

    await waitFor(() => expect(screen.getByTestId("location")).toHaveTextContent("/bookmarks?tab=kanji"));
  });

  it("탭 라벨에 종류별 개수를 붙인다 (다른 탭에 무엇이 있는지 보이게)", async () => {
    toggleGuestBookmark("kanji", 12, true);
    toggleGuestBookmark("vocabulary", 1217, true);
    render();

    await waitFor(() => expect(screen.getByRole("link", { name: "한자 (1)" })).toBeInTheDocument(), {
      timeout: 3000,
    });
    expect(screen.getByRole("link", { name: "어휘 (1)" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "문법 (0)" })).toBeInTheDocument();
  });
});

describe("BookmarksPage — 목록 · 빼기 (AC-B-18·19·22)", () => {
  it("담은 것이 없으면 빈 상태와 [자료실 열기]를 보여준다", async () => {
    render("/bookmarks?tab=kanji", libraryPage([]));

    expect(await screen.findByText("아직 담은 것이 없어요")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "자료실 열기" })).toHaveAttribute("href", "/library/kanji");
  });

  it("담은 항목은 ★(담긴 상태)로 보인다", async () => {
    toggleGuestBookmark("kanji", 11, true);
    render();

    // ★ 상태는 컨텍스트가 보관함 id 집합을 읽은 뒤에 반영된다
    await waitFor(() => expect(screen.getByRole("button", { name: /人/ })).toHaveAttribute("aria-pressed", "true"));
    expect(screen.getByRole("button", { name: /人/ })).toHaveTextContent("★");
  });

  it("★를 누르면 그 자리에 되돌리기 자리표시자가 남는다 (토스트 없음)", async () => {
    const user = userEvent.setup();
    toggleGuestBookmark("kanji", 11, true);
    render();

    await user.click(await screen.findByRole("button", { name: /人/ }));

    expect(await screen.findByText(/「人」을 뺐어요/)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "되돌리기" })).toBeInTheDocument();
  });

  it("[되돌리기]를 누르면 그 자리에 항목이 다시 나타난다 (목록을 다시 부르지 않는다)", async () => {
    const user = userEvent.setup();
    toggleGuestBookmark("kanji", 11, true);
    render();

    await user.click(await screen.findByRole("button", { name: /人/ }));
    await user.click(await screen.findByRole("button", { name: "되돌리기" }));

    await waitFor(() => expect(screen.getByRole("button", { name: /人/ })).toHaveAttribute("aria-pressed", "true"));
    expect(screen.queryByText(/뺐어요/)).toBeNull();
  });
});

describe("BookmarksPage — 비로그인 안내 (§4-1)", () => {
  it("브라우저 저장 안내와 [이 브라우저 기록 지우기]가 보인다", async () => {
    toggleGuestBookmark("kanji", 11, true);
    render();

    expect(await screen.findByText(/이 기록은 지금 쓰는 브라우저에만 저장돼요/)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "이 브라우저 기록 지우기" })).toBeInTheDocument();
  });

  it("담은 것이 있을 때만 [한자 전체 비우기]가 보인다", async () => {
    toggleGuestBookmark("kanji", 11, true);
    render();

    expect(await screen.findByRole("button", { name: "한자 전체 비우기" })).toBeInTheDocument();
  });
});

describe("BookmarksPage — 조회 실패 (AC-B-25, QA 지적)", () => {
  it("목록을 못 불러오면 에러 카드가 뜬다 — '담은 것이 없어요'로 오해시키지 않는다", async () => {
    toggleGuestBookmark("kanji", 11, true);
    stubFetch((url) => {
      if (url.includes("/api/users/me")) return apiError(401, "NOT_AUTHENTICATED");
      if (url.includes("/api/library/kanji")) return apiError(500, "INTERNAL_ERROR");
      return apiSuccess(null);
    });
    rtlRender(
      <MemoryRouter initialEntries={["/bookmarks?tab=kanji"]}>
        <LocationProbe />
        <AuthProvider>
          <UserDataProvider>
            <Routes>
              <Route element={<BookmarksPage />} path="/bookmarks" />
            </Routes>
          </UserDataProvider>
        </AuthProvider>
      </MemoryRouter>,
    );

    expect(await screen.findByRole("button", { name: "다시 시도" })).toBeInTheDocument();
    expect(screen.queryByText("아직 담은 것이 없어요")).toBeNull();
    // 부분 교체 원칙 — 탭·검색창은 남는다
    expect(screen.getByRole("link", { name: /문법/ })).toBeInTheDocument();
    expect(screen.getByLabelText("자료실 검색")).toBeInTheDocument();
  });
});
