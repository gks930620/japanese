// frontend-dev 작성 — 소유자 판정은 **userId**로 한다 (감사 C-1: 서버가 응답에서 username을 뺐다).
// username이 사라진 뒤 `post.username === user.username`은 undefined === undefined가 되어
// **모든 사용자에게 수정·삭제 버튼이 뜬다**. 그 회귀를 여기서 막는다.
import { render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { apiSuccess, stubFetch } from "../test/helpers.jsx";
import { AuthProvider } from "../context/AuthContext.jsx";
import { CommunityDetailPage } from "./CommunityDetailPage.jsx";

const ME = { id: 3, username: "gks930620", nickname: "한창희", provider: "LOCAL" };

/** GET /api/communities/{id} — username이 없는 현재 응답 모양 */
function postOf(userId) {
  return {
    id: 1004,
    title: "글",
    content: "본문",
    userId,
    nickname: "남",
    viewCount: 1,
    createdAt: "2026-08-25T00:00:00",
  };
}

function renderDetail(post, comments = []) {
  stubFetch((url) => {
    const target = String(url);
    if (target.includes("/api/users/me")) return apiSuccess(ME);
    if (target.includes("/comments")) return apiSuccess({ content: comments, totalElements: comments.length });
    if (target.includes("/api/files")) return apiSuccess([]);
    if (target.includes("/api/communities/")) return apiSuccess(post);
    return apiSuccess(null);
  });
  render(
    <MemoryRouter initialEntries={["/community/detail?id=1004"]}>
      <AuthProvider>
        <Routes>
          <Route element={<CommunityDetailPage />} path="/community/detail" />
        </Routes>
      </AuthProvider>
    </MemoryRouter>,
  );
}

beforeEach(() => {
  vi.restoreAllMocks();
});

describe("글 소유자 판정 (감사 C-1)", () => {
  it("남의 글에는 수정·삭제가 없다", async () => {
    renderDetail(postOf(99));

    await waitFor(() => expect(screen.getByRole("heading", { name: "글" })).toBeInTheDocument());
    expect(screen.queryByRole("link", { name: /수정/ })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /삭제/ })).not.toBeInTheDocument();
  });

  it("내 글에는 있다", async () => {
    renderDetail(postOf(ME.id));

    await waitFor(() => expect(screen.getByRole("heading", { name: "글" })).toBeInTheDocument());
    expect(screen.getByRole("link", { name: /수정/ })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /삭제/ })).toBeInTheDocument();
  });
});

describe("댓글 소유자 판정 (감사 C-1)", () => {
  const comment = (id, userId) => ({
    id,
    userId,
    nickname: `쓴이${id}`,
    content: `댓글 ${id}`,
    createdAt: "2026-08-25T00:00:00",
  });

  it("내 댓글에만 수정·삭제가 붙는다", async () => {
    renderDetail(postOf(99), [comment(1, ME.id), comment(2, 99)]);

    await waitFor(() => expect(screen.getByText("댓글 1")).toBeInTheDocument());
    // 내 댓글 1개에만 액션 묶음이 붙는다
    expect(document.querySelectorAll(".comment-actions")).toHaveLength(1);
  });
});
