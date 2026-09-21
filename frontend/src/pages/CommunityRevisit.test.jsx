// TDD Red — senior-dev 작성 (2026-09-16, 기술설계_2026-09_SPA_상태복원 §1 — 직접 fetch하는 화면을 조회 훅으로)
//
// 커뮤니티 목록·상세는 `useEffect`에서 직접 fetch해 **재방문마다 "로딩 중..."부터 다시 시작**한다.
// 글을 열었다가 [목록]으로 돌아오면 방금 본 목록이 사라졌다 나타난다 — 사용자가 말한 "뒤로가기가 어렵다"의 실물이다.
// 조회 훅(`useApiQuery`, 캐시 계약은 hooks/useApiQuery.cache.test.jsx)으로 옮기면 두 번째 방문은 첫 렌더에서 곧바로 본문이다.
//
// 캐시를 쓰면 **쓰기 뒤의 무효화**가 따라온다: 글을 지우고 목록으로 갈 때 캐시된 옛 목록(지운 글 포함)을 한 프레임이라도
// 먼저 그리면 안 된다. 쓰기(작성·수정·삭제) 뒤에는 `/api/communities` 접두사를 무효화한다.
//
// 이 테스트를 수정하지 말 것 — 계약 변경은 senior-dev 경유 (CLAUDE.md TDD 규칙 2).
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { describe, expect, it, vi } from "vitest";
import { apiError, apiSuccess, stubFetch } from "../test/helpers.jsx";
import { LocationProbe } from "../test/LocationProbe.jsx";
import { AuthProvider } from "../context/AuthContext.jsx";
import { CommunityListPage } from "./CommunityListPage.jsx";
import { CommunityDetailPage } from "./CommunityDetailPage.jsx";

const ME = { id: 3, username: "gks930620", nickname: "한창희", provider: "LOCAL" };
const POST = {
  id: 1004, userId: 3, nickname: "한창희", title: "지울 글", content: "<p>본문</p>", viewCount: 1, commentCount: 0,
  createdAt: "2026-01-01T00:00:00", updatedAt: "2026-01-01T00:00:00",
};
const OTHER = { ...POST, id: 1005, userId: 9, nickname: "남", title: "남는 글" };
const listPage = (content) => ({ content, page: 0, size: 10, totalElements: content.length, totalPages: 1, first: true, last: true });
const EMPTY_COMMENTS = { content: [], page: 0, size: 10, totalElements: 0, totalPages: 0, first: true, last: true };

function stubCommunity({ me = null, list = () => apiSuccess(listPage([POST, OTHER])) } = {}) {
  return stubFetch((url, options) => {
    const target = String(url);
    if (target.includes("/api/users/me")) return me ? apiSuccess(me) : apiError(401, "NOT_AUTHENTICATED");
    if (target.includes("/api/files")) return apiSuccess([]);
    if (/\/comments/.test(target)) return apiSuccess(EMPTY_COMMENTS);
    if (/\/api\/communities\/\d+$/.test(target)) {
      if (options?.method === "DELETE") return apiSuccess(null);
      return apiSuccess(POST);
    }
    if (target.includes("/api/communities")) return list();
    return apiSuccess(null);
  });
}

function renderCommunity(route) {
  return render(
    <MemoryRouter initialEntries={[route]}>
      <AuthProvider>
        <LocationProbe />
        <Routes>
          <Route element={<CommunityListPage />} path="/community" />
          <Route element={<CommunityDetailPage />} path="/community/detail" />
        </Routes>
      </AuthProvider>
    </MemoryRouter>,
  );
}

describe("커뮤니티 재방문 — 두 번째 방문은 첫 렌더에서 곧바로 본문이다", () => {
  it("목록: 다시 마운트되면 '로딩 중...' 없이 방금 본 글 목록이 바로 보인다", async () => {
    stubCommunity();
    const first = renderCommunity("/community");
    await screen.findByText("지울 글");
    first.unmount();

    renderCommunity("/community");

    // 기다리지 않는다 — 캐시가 첫 렌더를 채운다
    expect(screen.getByText("지울 글")).toBeInTheDocument();
    expect(screen.queryByText(/로딩 중/)).toBeNull();
  });

  it("상세: 다시 마운트되면 '로딩 중...' 없이 글 제목이 바로 보인다", async () => {
    stubCommunity();
    const first = renderCommunity("/community/detail?id=1004");
    await screen.findByRole("heading", { name: "지울 글" });
    first.unmount();

    renderCommunity("/community/detail?id=1004");

    expect(screen.getByRole("heading", { name: "지울 글" })).toBeInTheDocument();
    expect(screen.queryByText(/로딩 중/)).toBeNull();
  });
});

describe("쓰기 뒤에는 목록 캐시를 무효화한다", () => {
  it("글을 지우고 목록으로 가면 지운 글이 든 옛 목록을 먼저 그리지 않는다", async () => {
    let listCalls = 0;
    stubCommunity({
      me: ME,
      list: () => {
        listCalls += 1;
        // 첫 조회만 즉시 응답(캐시를 채운다). 삭제 뒤 조회는 영원히 오지 않는다 —
        // 캐시가 무효화되지 않았다면 이 사이에 옛 목록(지울 글 포함)이 보이고, 무효화됐다면 아무 글도 보이지 않는다
        return listCalls === 1 ? apiSuccess(listPage([POST, OTHER])) : new Promise(() => {});
      },
    });
    vi.spyOn(window, "confirm").mockReturnValue(true);
    const user = userEvent.setup();

    // ① 목록을 한 번 본다(캐시에 "지울 글"이 들어간다) → ② 그 글을 연다
    renderCommunity("/community");
    await user.click(await screen.findByText("지울 글"));
    await screen.findByRole("heading", { name: "지울 글" });

    // ③ 지운다 → 목록으로
    await user.click(await screen.findByRole("button", { name: /삭제/ }));
    await waitFor(() => expect(screen.getByTestId("location")).toHaveTextContent("/community"));
    expect(screen.getByTestId("location")).not.toHaveTextContent("detail");

    // 목록 화면이 떴다. 옛 목록이 캐시에서 그대로 나오면 "지울 글"이 보인다 — 그러면 안 된다
    await waitFor(() => expect(listCalls).toBe(2)); // 다시 부르기는 한다
    expect(screen.queryByText("지울 글")).toBeNull();
    expect(screen.queryByText("남는 글")).toBeNull();
  });
});
