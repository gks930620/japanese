// TDD Red — senior-dev 작성 (2026-09-16, 기술설계_2026-09_SPA_상태복원 §3 전수표 — "URL로 가야 한다" 판정 1건)
//
// **댓글 페이지는 주소(`?cpage=`)에서 온다.** 글 상세의 댓글 3페이지에서 새로고침하면 지금은 1페이지로 돌아간다 —
// 페이지 번호가 컴포넌트 state에만 있어서다(설계/05 §9: 페이지는 쿼리스트링에).
//
// 다만 **replace로 쓴다**: 댓글 페이지는 "장소"가 아니라 상세 화면 안의 하위 목록이라 히스토리를 쌓지 않고,
// replace라 스크롤 규칙(PUSH=맨 위)에도 걸리지 않아 글 본문 위로 튀지 않는다(댓글은 화면 아래에 있다).
// 파라미터는 같은 게시판의 `page`와 같은 0-base이고 0은 생략한다(기본값 생략 — 05 §9).
//
// 이 테스트를 수정하지 말 것 — 계약 변경은 senior-dev 경유 (CLAUDE.md TDD 규칙 2).
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes, useLocation, useNavigationType } from "react-router-dom";
import { describe, expect, it } from "vitest";
import { apiError, apiSuccess, stubFetch } from "../test/helpers.jsx";
import { AuthProvider } from "../context/AuthContext.jsx";
import { CommunityDetailPage } from "./CommunityDetailPage.jsx";

const ME = { id: 3, username: "gks930620", nickname: "한창희", provider: "LOCAL" };
const POST = {
  id: 1004, userId: 9, nickname: "글쓴이", title: "제목", content: "<p>본문</p>", viewCount: 1, commentCount: 25,
  createdAt: "2026-01-01T00:00:00", updatedAt: "2026-01-01T00:00:00",
};

function commentsPage(page) {
  return {
    content: Array.from({ length: 10 }, (_, i) => ({
      id: page * 100 + i, userId: 9, nickname: "글쓴이", content: `댓글 ${page}-${i}`, createdAt: "2026-01-01T00:00:00",
    })),
    page,
    size: 10,
    totalElements: 25,
    totalPages: 3,
    first: page === 0,
    last: page === 2,
  };
}

/** 현재 주소와 마지막 이동 종류를 DOM에 노출한다 — replace 여부까지 본다 */
function Probe() {
  const location = useLocation();
  const type = useNavigationType();
  return (
    <div>
      <div data-testid="location">
        {location.pathname}
        {location.search}
      </div>
      <div data-testid="navtype">{type}</div>
    </div>
  );
}

function renderDetail(route, { me = null } = {}) {
  const fetchMock = stubFetch((url, options) => {
    const target = String(url);
    if (target.includes("/api/users/me")) return me ? apiSuccess(me) : apiError(401, "NOT_AUTHENTICATED");
    if (target.includes("/api/files")) return apiSuccess([]);
    if (/\/comments/.test(target)) {
      if (options?.method === "POST") return apiSuccess(null);
      const page = Number(new URL(target, "http://x").searchParams.get("page") ?? 0);
      return apiSuccess(commentsPage(page));
    }
    if (/\/api\/communities\/\d+$/.test(target)) return apiSuccess(POST);
    return apiSuccess(null);
  });
  render(
    <MemoryRouter initialEntries={[route]}>
      <AuthProvider>
        <Probe />
        <Routes>
          <Route element={<CommunityDetailPage />} path="/community/detail" />
        </Routes>
      </AuthProvider>
    </MemoryRouter>,
  );
  return fetchMock;
}

const commentCalls = (fetchMock) =>
  fetchMock.mock.calls.map(([url]) => String(url)).filter((url) => url.includes("/comments") && url.includes("page="));

describe("댓글 페이지는 주소에서 온다 (?cpage= · 설계/05 §9)", () => {
  it("?cpage=2 로 열면 댓글 3페이지(0-base 2)를 조회하고 그 페이지가 보인다", async () => {
    const fetchMock = renderDetail("/community/detail?id=1004&cpage=2");

    expect(await screen.findByText("댓글 2-0")).toBeInTheDocument();
    expect(commentCalls(fetchMock).some((url) => /[?&]page=2(&|$)/.test(url))).toBe(true);
    expect(commentCalls(fetchMock).some((url) => /[?&]page=0(&|$)/.test(url))).toBe(false);
  });

  it("댓글 페이지 버튼을 누르면 주소가 바뀐다 — replace라 히스토리를 쌓지 않는다", async () => {
    renderDetail("/community/detail?id=1004");
    await screen.findByText("댓글 0-0");

    await userEvent.setup().click(screen.getByRole("button", { name: "3" }));

    await waitFor(() => expect(screen.getByTestId("location")).toHaveTextContent("cpage=2"));
    expect(screen.getByTestId("location")).toHaveTextContent("id=1004"); // 글 id는 그대로
    expect(screen.getByTestId("navtype")).toHaveTextContent("REPLACE");
    expect(await screen.findByText("댓글 2-0")).toBeInTheDocument();
  });

  it("첫 페이지로 돌아가면 cpage는 주소에서 사라진다 (기본값 생략)", async () => {
    renderDetail("/community/detail?id=1004&cpage=2");
    await screen.findByText("댓글 2-0");

    await userEvent.setup().click(screen.getByRole("button", { name: "1" }));

    await waitFor(() => expect(screen.getByTestId("location")).not.toHaveTextContent("cpage"));
    expect(await screen.findByText("댓글 0-0")).toBeInTheDocument();
  });

  it("댓글을 쓰면 첫 페이지로 돌아가고 목록을 다시 부른다 — 주소의 cpage도 지운다", async () => {
    const fetchMock = renderDetail("/community/detail?id=1004&cpage=2", { me: ME });
    await screen.findByText("댓글 2-0");
    const user = userEvent.setup();

    await user.type(await screen.findByPlaceholderText(/댓글을 입력하세요/), "새 댓글");
    await user.click(screen.getByRole("button", { name: /댓글 작성/ }));

    await waitFor(() => expect(screen.getByTestId("location")).not.toHaveTextContent("cpage"));
    await waitFor(() => expect(commentCalls(fetchMock).at(-1)).toMatch(/[?&]page=0(&|$)/));
    expect(await screen.findByText("댓글 0-0")).toBeInTheDocument();
  });
});
