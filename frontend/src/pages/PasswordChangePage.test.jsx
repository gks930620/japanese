import { render as rtlRender, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { describe, expect, it } from "vitest";
import { apiError, apiSuccess, stubFetch } from "../test/helpers.jsx";
import { LocationProbe } from "../test/LocationProbe.jsx";
import { AuthProvider } from "../context/AuthContext.jsx";
import { PasswordChangePage } from "./PasswordChangePage.jsx";

/**
 * 비밀번호 변경 화면 (설계/04 §4-1) — TDD Red, senior-dev 작성.
 * 인수 조건: AC-A-17, AC-A-21 ~ AC-A-27
 *
 * 서버의 400은 errorCode로 갈린다 — 어느 칸을 비우고 어디에 문구를 붙일지가 다르기 때문이다.
 * 화면은 `message` 문자열이 아니라 `errorCode`로 분기한다(설계/04 §1-1).
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

const KAKAO_ACCOUNT = { ...LOCAL_ACCOUNT, provider: "kakao", social: true, emailEditable: false, passwordChangeable: false };

function render({ account = LOCAL_ACCOUNT, changeResponse } = {}) {
  const fetchMock = stubFetch((url) => {
    if (url.includes("/api/users/me")) return apiSuccess({ id: 3, ...account });
    if (url.includes("/api/me/password")) return changeResponse ?? apiSuccess({ changed: true, accessToken: null, refreshToken: null });
    if (url.includes("/api/me/account")) return apiSuccess(account);
    return apiSuccess(null);
  });

  rtlRender(
    <MemoryRouter initialEntries={["/mypage/password"]}>
      <LocationProbe />
      <AuthProvider>
        <Routes>
          <Route element={<PasswordChangePage />} path="/mypage/password" />
          <Route element={<div>마이페이지</div>} path="/mypage" />
        </Routes>
      </AuthProvider>
    </MemoryRouter>,
  );
  return fetchMock;
}

function passwordRequests(fetchMock) {
  return fetchMock.mock.calls.filter(([url, options]) => String(url).includes("/api/me/password") && options?.method);
}

async function fillForm({ current = "1234", next = "newpass1234", confirm = "newpass1234" } = {}) {
  await userEvent.type(screen.getByLabelText("현재 비밀번호"), current);
  await userEvent.type(screen.getByLabelText("새 비밀번호"), next);
  await userEvent.type(screen.getByLabelText("새 비밀번호 확인"), confirm);
}

describe("비밀번호 변경 — 폼 (AC-A-21)", () => {
  it("세 칸이 모두 보인다", async () => {
    render();

    await waitFor(() => expect(screen.getByLabelText("현재 비밀번호")).toBeInTheDocument());
    expect(screen.getByLabelText("새 비밀번호")).toBeInTheDocument();
    expect(screen.getByLabelText("새 비밀번호 확인")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "변경" })).toBeInTheDocument();
  });

  it("비어 있으면 변경 요청이 나가지 않는다", async () => {
    const fetchMock = render();
    await waitFor(() => expect(screen.getByLabelText("현재 비밀번호")).toBeInTheDocument());

    await userEvent.click(screen.getByRole("button", { name: "변경" }));

    expect(passwordRequests(fetchMock)).toHaveLength(0);
  });

  it("[취소]는 마이페이지로 돌아간다", async () => {
    render();

    await waitFor(() => expect(screen.getByRole("link", { name: "취소" })).toHaveAttribute("href", "/mypage"));
  });
});

describe("비밀번호 변경 — 서버 판정 (AC-A-22 ~ 25)", () => {
  it("현재 비밀번호가 틀리면(400 PASSWORD_MISMATCH) 그 칸만 비워진다", async () => {
    render({ changeResponse: apiError(400, "PASSWORD_MISMATCH") });
    await waitFor(() => expect(screen.getByLabelText("현재 비밀번호")).toBeInTheDocument());

    await fillForm();
    await userEvent.click(screen.getByRole("button", { name: "변경" }));

    expect(await screen.findByRole("alert")).toBeInTheDocument();
    expect(screen.getByLabelText("현재 비밀번호")).toHaveValue("");
    // 나머지 두 칸은 지우지 않는다 — 사용자가 다시 타이핑할 이유가 없다
    expect(screen.getByLabelText("새 비밀번호")).toHaveValue("newpass1234");
    expect(screen.getByLabelText("새 비밀번호 확인")).toHaveValue("newpass1234");
  });

  it("새 비밀번호 확인이 다르면 안내가 보이고 화면에 머문다", async () => {
    render({ changeResponse: apiError(400, "NEW_PASSWORD_CONFIRM_MISMATCH") });
    await waitFor(() => expect(screen.getByLabelText("현재 비밀번호")).toBeInTheDocument());

    await fillForm({ confirm: "different1234" });
    await userEvent.click(screen.getByRole("button", { name: "변경" }));

    expect(await screen.findByRole("alert")).toBeInTheDocument();
    expect(screen.getByTestId("location").textContent).toBe("/mypage/password");
  });

  it("지금 쓰는 비밀번호와 같으면(NEW_PASSWORD_SAME_AS_CURRENT) 안내가 보인다", async () => {
    render({ changeResponse: apiError(400, "NEW_PASSWORD_SAME_AS_CURRENT") });
    await waitFor(() => expect(screen.getByLabelText("현재 비밀번호")).toBeInTheDocument());

    await fillForm({ next: "1234", confirm: "1234" });
    await userEvent.click(screen.getByRole("button", { name: "변경" }));

    expect(await screen.findByRole("alert")).toBeInTheDocument();
  });
});

describe("비밀번호 변경 — 성공 (AC-A-26)", () => {
  it("PUT /api/me/password 로 세 값을 보낸다", async () => {
    const fetchMock = render();
    await waitFor(() => expect(screen.getByLabelText("현재 비밀번호")).toBeInTheDocument());

    await fillForm();
    await userEvent.click(screen.getByRole("button", { name: "변경" }));

    await waitFor(() => expect(passwordRequests(fetchMock)).toHaveLength(1));
    const [, options] = passwordRequests(fetchMock)[0];
    expect(options.method).toBe("PUT");
    expect(JSON.parse(options.body)).toEqual({
      currentPassword: "1234",
      newPassword: "newpass1234",
      newPasswordConfirm: "newpass1234",
    });
  });

  it("성공하면 마이페이지로 이동한다", async () => {
    render();
    await waitFor(() => expect(screen.getByLabelText("현재 비밀번호")).toBeInTheDocument());

    await fillForm();
    await userEvent.click(screen.getByRole("button", { name: "변경" }));

    await waitFor(() => expect(screen.getByTestId("location").textContent).toBe("/mypage"));
  });
});

describe("소셜 계정이 주소로 직접 들어온 경우 (AC-A-17)", () => {
  it("폼 대신 안내와 [마이페이지로]가 보인다", async () => {
    render({ account: KAKAO_ACCOUNT });

    await waitFor(() => expect(screen.getByRole("link", { name: "마이페이지로" })).toHaveAttribute("href", "/mypage"));
    expect(screen.queryByLabelText("현재 비밀번호")).not.toBeInTheDocument();
    expect(screen.getByText(/카카오/)).toBeInTheDocument();
  });
});
