import { render as rtlRender, screen, waitFor } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { describe, expect, it } from "vitest";
import { apiSuccess, stubFetch } from "../test/helpers.jsx";
import { AuthProvider } from "../context/AuthContext.jsx";
import { MyPage } from "./MyPage.jsx";

/**
 * 마이페이지 허브 (설계/04 §4-1 · 설계/05 §8) — TDD Red, senior-dev 작성.
 * 인수 조건: AC-A-01 ~ AC-A-04, AC-A-14·15·19·20
 *
 * 로그인 방식 분기의 근거는 `GET /api/me/account`의 `passwordChangeable`이다.
 * 화면이 `provider === "LOCAL"`을 직접 해석하지 않는다 — 서버가 강제하는 규칙과 화면이 숨기는 것이
 * 같은 출처에서 나와야 갈리지 않는다(설계/04 §4-1).
 *
 * 이 테스트를 수정하지 말 것 — 계약 변경은 senior-dev 경유.
 */

const LOCAL_ACCOUNT = {
  username: "gks930620",
  nickname: "한창희",
  email: "gks9306202@gmail.com",
  provider: "LOCAL",
  social: false,
  emailEditable: true,
  passwordChangeable: true,
};

const KAKAO_ACCOUNT = {
  username: "kakao4663679805",
  nickname: "한창희",
  email: "gks930620@naver.com",
  provider: "kakao",
  social: true,
  emailEditable: false,
  passwordChangeable: false,
};

function render(account = LOCAL_ACCOUNT) {
  const fetchMock = stubFetch((url) => {
    if (url.includes("/api/me/account")) return apiSuccess(account);
    if (url.includes("/api/users/me")) {
      return apiSuccess({ id: 3, username: account.username, nickname: account.nickname, provider: account.provider });
    }
    return apiSuccess(null);
  });

  rtlRender(
    <MemoryRouter initialEntries={["/mypage"]}>
      <AuthProvider>
        <Routes>
          <Route element={<MyPage />} path="/mypage" />
        </Routes>
      </AuthProvider>
    </MemoryRouter>,
  );
  return fetchMock;
}

describe("마이페이지 허브 (AC-A-01)", () => {
  it("네 영역이 모두 보인다", async () => {
    render();

    await waitFor(() => expect(screen.getByRole("heading", { name: "프로필" })).toBeInTheDocument());
    expect(screen.getByRole("heading", { name: "내 학습" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "내 보관함" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "계정 관리" })).toBeInTheDocument();
  });

  it("프로필에 아이디·닉네임·이메일·로그인 방식이 보인다", async () => {
    render();

    await waitFor(() => expect(screen.getByText("gks930620")).toBeInTheDocument());
    expect(screen.getByText("한창희")).toBeInTheDocument();
    expect(screen.getByText("gks9306202@gmail.com")).toBeInTheDocument();
  });

  it("각 카드에서 갈 곳으로 가는 링크가 있다", async () => {
    render();

    await waitFor(() => expect(screen.getByRole("link", { name: "정보 수정" })).toHaveAttribute("href", "/mypage/edit"));
    expect(screen.getByRole("link", { name: "보관함 열기" })).toHaveAttribute("href", "/bookmarks");
    expect(screen.getByRole("link", { name: "회원 탈퇴" })).toHaveAttribute("href", "/mypage/withdraw");
  });
});

describe("로그인 방식 분기 (AC-A-14·15·19·20)", () => {
  it("로컬 계정에는 [비밀번호 변경]이 보인다", async () => {
    render(LOCAL_ACCOUNT);

    await waitFor(() =>
      expect(screen.getByRole("link", { name: "비밀번호 변경" })).toHaveAttribute("href", "/mypage/password"),
    );
  });

  it("소셜 계정에는 [비밀번호 변경]이 아예 없다 (회색 비활성이 아니라 미노출)", async () => {
    render(KAKAO_ACCOUNT);

    await waitFor(() => expect(screen.getByRole("heading", { name: "계정 관리" })).toBeInTheDocument());
    expect(screen.queryByRole("link", { name: "비밀번호 변경" })).not.toBeInTheDocument();
  });

  it("소셜 계정에는 그 자리에 제공자 안내가 보인다", async () => {
    render(KAKAO_ACCOUNT);

    // 문구 전문은 designer 소관이라 "제공자 이름이 들어간 안내가 있는가"만 고정한다
    await waitFor(() => expect(screen.getByText(/카카오/)).toBeInTheDocument());
  });

  it("구글 계정도 같은 분기를 탄다 (제공자 이름만 다르다)", async () => {
    render({ ...KAKAO_ACCOUNT, provider: "google", username: "google116546165339264614279" });

    await waitFor(() => expect(screen.getByText(/구글|Google/)).toBeInTheDocument());
    expect(screen.queryByRole("link", { name: "비밀번호 변경" })).not.toBeInTheDocument();
  });
});
