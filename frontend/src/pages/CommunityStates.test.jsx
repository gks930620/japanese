// TDD Red — senior-dev 작성 (2026-09-03 판정 D-5 · 08 C-12 ④)
//
// 커뮤니티만 자료실이 세운 "없음"의 말투를 안 지킨다:
//   ① 검색 0건을 "게시글이 없습니다"로 뭉갠다 — 검색 때문인지 게시판이 빈 것인지 알 수 없고 조건을 지우는 길이 없다.
//   ② 비로그인에게 "첫 번째 게시글을 작성해보세요!"라고 한다 — 그 사람에게는 [글쓰기] 버튼이 없다(할 수 없는 일을 시킨다).
//   ③ 없는 글(404)을 "불러오지 못했습니다"라고 한다 — 통신 실패가 아니라 없는 주소다.
// 기준은 자료실 EmptyBlock: 조건을 되읽고, 다음 행동을 주고, 없는 것을 없다고 말한다.
//
// 이 테스트를 수정하지 말 것 — 계약 변경은 senior-dev 경유 (CLAUDE.md TDD 규칙 2).
import { render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { describe, expect, it } from "vitest";
import { apiError, apiSuccess, stubFetch } from "../test/helpers.jsx";
import { AuthProvider } from "../context/AuthContext.jsx";
import { CommunityListPage } from "./CommunityListPage.jsx";
import { CommunityDetailPage } from "./CommunityDetailPage.jsx";

const EMPTY_PAGE = { content: [], page: 0, size: 10, totalElements: 0, totalPages: 0, first: true, last: true };

function renderCommunity(route, { detailStatus = 200 } = {}) {
  stubFetch((url) => {
    const target = String(url);
    if (target.includes("/api/users/me")) return apiError(401, "NOT_AUTHENTICATED");
    if (target.includes("/api/files")) return apiSuccess([]);
    if (/\/api\/communities\/\d+\/comments/.test(target)) return apiSuccess(EMPTY_PAGE);
    if (/\/api\/communities\/\d+$/.test(target)) {
      return detailStatus === 404 ? apiError(404, "NOT_FOUND", "존재하지 않는 게시글입니다: 99999") : apiSuccess(null);
    }
    if (target.includes("/api/communities")) return apiSuccess(EMPTY_PAGE);
    return apiSuccess(null);
  });
  render(
    <MemoryRouter initialEntries={[route]}>
      <AuthProvider>
        <Routes>
          <Route element={<CommunityListPage />} path="/community" />
          <Route element={<CommunityDetailPage />} path="/community/detail" />
        </Routes>
      </AuthProvider>
    </MemoryRouter>,
  );
}

describe("커뮤니티 — '없음'의 말투를 자료실 규칙에 맞춘다 (D-5)", () => {
  it("검색 0건은 검색어를 되읽고 조건을 지우는 길을 준다 (①)", async () => {
    renderCommunity("/community?searchType=title&keyword=zzzzzzq");

    expect(await screen.findByText(/zzzzzzq/)).toBeInTheDocument();
    expect(screen.getByText(/검색 결과가 없어요/)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /초기화/ })).toBeInTheDocument();
    expect(screen.queryByText("게시글이 없습니다")).toBeNull();
  });

  it("비로그인의 빈 게시판은 글을 쓰라고 하지 않는다 (②)", async () => {
    renderCommunity("/community");

    await screen.findByText(/게시글이 없어요|아직 글이 없어요|게시글이 없습니다/);
    expect(screen.queryByText(/작성해보세요/)).toBeNull();
    expect(screen.queryByRole("link", { name: /글쓰기/ })).toBeNull();
  });

  it("없는 글은 '찾을 수 없는 글'이다 — 통신 실패 문구를 쓰지 않는다 (③)", async () => {
    renderCommunity("/community/detail?id=99999", { detailStatus: 404 });

    expect(await screen.findByText(/찾을 수 없는 글/)).toBeInTheDocument();
    expect(screen.queryByText(/불러오지 못했/)).toBeNull();
    expect(screen.queryByRole("button", { name: "다시 시도" })).toBeNull();
    expect(screen.getByRole("link", { name: /커뮤니티 목록으로/ })).toHaveAttribute("href", "/community");
  });
});
