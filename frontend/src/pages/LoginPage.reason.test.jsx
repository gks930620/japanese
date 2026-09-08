// TDD Red — senior-dev 작성 (2026-09-03 판정 D-11)
//
// 비로그인으로 /mypage·/community/write에 가면 로그인 화면으로 보내지만, 화면은 "서비스에 로그인하세요"라고만 한다.
// 사용자는 자기가 누른 것이 왜 사라졌는지 모른다. `ProtectedRoute`가 이미 `state.from`을 넘기므로(B-M2)
// 로그인 화면은 그 값이 있을 때 **왜 여기 왔는지 한 줄** 말한다. 직접 /login으로 온 사람에게는 그 줄이 없다.
//
// 이 테스트를 수정하지 말 것 — 계약 변경은 senior-dev 경유 (CLAUDE.md TDD 규칙 2).
import { render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { describe, expect, it } from "vitest";
import { apiError, apiSuccess, stubFetch } from "../test/helpers.jsx";
import { AuthProvider } from "../context/AuthContext.jsx";
import { LoginPage } from "./LoginPage.jsx";

function renderLogin(state) {
  stubFetch((url) => (url.includes("/api/users/me") ? apiError(401, "NOT_AUTHENTICATED") : apiSuccess(null)));
  render(
    <MemoryRouter initialEntries={[{ pathname: "/login", state }]}>
      <AuthProvider>
        <Routes>
          <Route element={<LoginPage />} path="/login" />
        </Routes>
      </AuthProvider>
    </MemoryRouter>,
  );
}

describe("로그인 화면은 왜 여기 왔는지 말한다 (D-11)", () => {
  it("보호된 화면에서 보내졌으면 '로그인이 필요해요' 한 줄이 있다", async () => {
    renderLogin({ from: "/mypage" });

    expect(await screen.findByText(/로그인이 필요해요/)).toBeInTheDocument();
  });

  it("직접 /login으로 왔으면 그 줄이 없다 — 없는 이유를 지어내지 않는다", async () => {
    renderLogin(undefined);

    await screen.findByRole("button", { name: /로그인/ });
    expect(screen.queryByText(/로그인이 필요해요/)).toBeNull();
  });
});
