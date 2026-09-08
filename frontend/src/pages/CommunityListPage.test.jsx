import { render as rtlRender, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { describe, expect, it } from "vitest";
import { apiError, apiSuccess, stubFetch } from "../test/helpers.jsx";
import { LocationProbe } from "../test/LocationProbe.jsx";
import { AuthProvider } from "../context/AuthContext.jsx";
import { CommunityListPage } from "./CommunityListPage.jsx";

/**
 * 커뮤니티 목록 — 주소로 들어온 검색 상태 (설계/04 §5 · AC-A-41) — TDD Red, senior-dev 작성.
 *
 * 탈퇴 화면의 [내가 쓴 글 찾기]가 "내 닉네임으로 검색된 상태"로 커뮤니티를 연다.
 * 지금은 검색 상태가 화면 안에만 있어 주소로 전달되지 않는다 —
 * 링크로 열 수 있으려면 **검색 조건이 주소에서 와야 한다**(자료실·보관함이 이미 쓰는 규칙).
 *
 * 이 테스트를 수정하지 말 것 — 계약 변경은 senior-dev 경유.
 */

function render(route) {
  const fetchMock = stubFetch((url) => {
    if (url.includes("/api/users/me")) {
      return apiSuccess({ id: 3, username: "gks930620", nickname: "한창희", provider: "LOCAL" });
    }
    if (url.includes("/api/communities")) {
      return apiSuccess({ content: [], totalElements: 0, totalPages: 0, number: 0, size: 10 });
    }
    return apiSuccess(null);
  });

  rtlRender(
    <MemoryRouter initialEntries={[route]}>
      <AuthProvider>
        <Routes>
          <Route element={<CommunityListPage />} path="/community" />
        </Routes>
      </AuthProvider>
    </MemoryRouter>,
  );
  return fetchMock;
}

describe("주소로 들어온 검색 조건 (AC-A-41)", () => {
  it("?searchType=nickname&keyword=... 로 열면 그 조건으로 조회한다", async () => {
    const fetchMock = render("/community?searchType=nickname&keyword=한창희");

    await waitFor(() => {
      const searched = fetchMock.mock.calls
        .map(([url]) => decodeURIComponent(String(url)))
        .filter((url) => url.includes("/api/communities"))
        .some((url) => url.includes("searchType=nickname") && url.includes("keyword=한창희"));
      expect(searched).toBe(true);
    });
  });

  it("검색창에도 그 조건이 채워져 보인다", async () => {
    render("/community?searchType=nickname&keyword=한창희");

    await waitFor(() => expect(screen.getByDisplayValue("한창희")).toBeInTheDocument());
  });
});

/**
 * 페이지도 주소에서 온다 (2026-09-03 판정 L7 — TDD Red, senior-dev 작성).
 *
 * 설계/02 §4: "목록 화면의 상태(검색어·필터·정렬·**페이지**)는 컴포넌트 state가 아니라 주소 쿼리스트링에 둔다."
 * 이 파일 머리의 규칙("주소가 목록 상태의 단일 출처")을 검색 조건에만 적용하고 페이지는 state로 남겨,
 * 3페이지에서 새로고침하면 1페이지로, 글을 열었다가 뒤로 오면 1페이지로 돌아간다. 자료실·보관함은 이미 지킨다.
 * 서버 보정(04 §1-5)이 있으므로 화면은 응답의 page를 신뢰해 주소를 되쓴다.
 */
function renderPaged(route) {
  const posts = Array.from({ length: 10 }, (_, i) => ({
    id: 100 + i, userId: 3, nickname: "한창희", title: `글 ${i}`, content: "내용", viewCount: 0, commentCount: 0,
    createdAt: "2026-01-01T00:00:00", updatedAt: "2026-01-01T00:00:00",
  }));
  const fetchMock = stubFetch((url) => {
    const target = String(url);
    if (target.includes("/api/users/me")) return apiError(401, "NOT_AUTHENTICATED");
    if (target.includes("/api/communities")) {
      const page = Number(new URL(target, "http://x").searchParams.get("page") ?? 0);
      return apiSuccess({ content: posts, page, size: 10, totalElements: 30, totalPages: 3, first: page === 0, last: page === 2 });
    }
    return apiSuccess(null);
  });
  rtlRender(
    <MemoryRouter initialEntries={[route]}>
      <AuthProvider>
        <LocationProbe />
        <Routes>
          <Route element={<CommunityListPage />} path="/community" />
        </Routes>
      </AuthProvider>
    </MemoryRouter>,
  );
  return fetchMock;
}

describe("페이지는 주소에서 온다 (L7 · 설계/02 §4)", () => {
  it("?page=2 로 열면 그 페이지를 조회한다", async () => {
    const fetchMock = renderPaged("/community?page=2");

    await waitFor(() => {
      const asked = fetchMock.mock.calls
        .map(([url]) => String(url))
        .filter((url) => url.includes("/api/communities"))
        .some((url) => /[?&]page=2(&|$)/.test(url));
      expect(asked).toBe(true);
    });
  });

  it("페이지 버튼을 누르면 주소가 바뀐다 — 새로고침·뒤로가기가 그 페이지를 복원한다", async () => {
    renderPaged("/community");
    const user = userEvent.setup();

    await user.click(await screen.findByRole("button", { name: "2" }));

    await waitFor(() => expect(screen.getByTestId("location").textContent).toMatch(/[?&]page=1(&|$)/));
  });
});
