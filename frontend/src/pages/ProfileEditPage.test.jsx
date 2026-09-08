import { render as rtlRender, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { describe, expect, it } from "vitest";
import { apiError, apiSuccess, stubFetch } from "../test/helpers.jsx";
import { LocationProbe } from "../test/LocationProbe.jsx";
import { AuthProvider } from "../context/AuthContext.jsx";
import { ProfileEditPage } from "./ProfileEditPage.jsx";

/**
 * 회원정보 수정 화면 (설계/04 §4-1) — TDD Red, senior-dev 작성.
 * 인수 조건: AC-A-05 ~ AC-A-13, AC-A-16
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

function render({ account = LOCAL_ACCOUNT, saveResponse } = {}) {
  const fetchMock = stubFetch((url) => {
    if (url.includes("/api/users/me")) return apiSuccess({ id: 3, ...account });
    if (url.includes("/api/me/profile")) return saveResponse ?? apiSuccess({ ...account, nickname: "바꾼닉네임" });
    if (url.includes("/api/me/account")) return apiSuccess(account);
    return apiSuccess(null);
  });

  rtlRender(
    <MemoryRouter initialEntries={["/mypage/edit"]}>
      <LocationProbe />
      <AuthProvider>
        <Routes>
          <Route element={<ProfileEditPage />} path="/mypage/edit" />
          <Route element={<div>마이페이지</div>} path="/mypage" />
        </Routes>
      </AuthProvider>
    </MemoryRouter>,
  );
  return fetchMock;
}

function profileRequests(fetchMock) {
  return fetchMock.mock.calls.filter(([url, options]) => String(url).includes("/api/me/profile") && options?.method);
}

describe("회원정보 수정 — 폼 (AC-A-05·11·12)", () => {
  it("현재 값이 채워진 폼이 열린다", async () => {
    render();

    await waitFor(() => expect(screen.getByLabelText("닉네임")).toHaveValue("한창희"));
    expect(screen.getByLabelText("이메일")).toHaveValue("gks9306202@gmail.com");
  });

  it("아이디는 수정할 수 없다", async () => {
    render();

    await waitFor(() => expect(screen.getByText("gks930620")).toBeInTheDocument());
    // 아이디는 입력칸으로 그리지 않는다 — 바꿀 수 없는 값을 입력칸으로 보여주면 바꿀 수 있다고 읽힌다
    expect(screen.queryByLabelText("아이디")).not.toBeInTheDocument();
  });

  it("[취소]는 마이페이지로 돌아간다", async () => {
    render();

    await waitFor(() => expect(screen.getByRole("link", { name: "취소" })).toHaveAttribute("href", "/mypage"));
  });
});

describe("회원정보 수정 — 검증 (AC-A-07·08·09)", () => {
  it("닉네임이 1자면 저장 요청이 나가지 않는다", async () => {
    const fetchMock = render();
    await waitFor(() => expect(screen.getByLabelText("닉네임")).toHaveValue("한창희"));

    await userEvent.clear(screen.getByLabelText("닉네임"));
    await userEvent.type(screen.getByLabelText("닉네임"), "가");
    await userEvent.click(screen.getByRole("button", { name: "저장" }));

    expect(await screen.findByRole("alert")).toBeInTheDocument();
    expect(profileRequests(fetchMock)).toHaveLength(0);
  });

  it("닉네임이 21자면 저장 요청이 나가지 않는다", async () => {
    const fetchMock = render();
    await waitFor(() => expect(screen.getByLabelText("닉네임")).toHaveValue("한창희"));

    await userEvent.clear(screen.getByLabelText("닉네임"));
    await userEvent.type(screen.getByLabelText("닉네임"), "가".repeat(21));
    await userEvent.click(screen.getByRole("button", { name: "저장" }));

    expect(await screen.findByRole("alert")).toBeInTheDocument();
    expect(profileRequests(fetchMock)).toHaveLength(0);
  });

  it("이메일 형식이 아니면 저장 요청이 나가지 않는다", async () => {
    const fetchMock = render();
    await waitFor(() => expect(screen.getByLabelText("이메일")).toHaveValue("gks9306202@gmail.com"));

    await userEvent.clear(screen.getByLabelText("이메일"));
    await userEvent.type(screen.getByLabelText("이메일"), "not-an-email");
    await userEvent.click(screen.getByRole("button", { name: "저장" }));

    expect(await screen.findByRole("alert")).toBeInTheDocument();
    expect(profileRequests(fetchMock)).toHaveLength(0);
  });
});

describe("회원정보 수정 — 저장 (AC-A-06·10·13)", () => {
  it("저장에 성공하면 마이페이지로 이동한다", async () => {
    render();
    await waitFor(() => expect(screen.getByLabelText("닉네임")).toHaveValue("한창희"));

    await userEvent.clear(screen.getByLabelText("닉네임"));
    await userEvent.type(screen.getByLabelText("닉네임"), "바꾼닉네임");
    await userEvent.click(screen.getByRole("button", { name: "저장" }));

    // 부분일치가 아니라 정확히 /mypage 여야 한다 (/mypage/edit 에 머무르면 실패)
    await waitFor(() => expect(screen.getByTestId("location").textContent).toBe("/mypage"));
  });

  it("저장은 PUT /api/me/profile 로 닉네임·이메일만 보낸다", async () => {
    const fetchMock = render();
    await waitFor(() => expect(screen.getByLabelText("닉네임")).toHaveValue("한창희"));

    await userEvent.clear(screen.getByLabelText("닉네임"));
    await userEvent.type(screen.getByLabelText("닉네임"), "바꾼닉네임");
    await userEvent.click(screen.getByRole("button", { name: "저장" }));

    await waitFor(() => expect(profileRequests(fetchMock)).toHaveLength(1));
    const [, options] = profileRequests(fetchMock)[0];
    expect(options.method).toBe("PUT");
    expect(JSON.parse(options.body)).toEqual({ nickname: "바꾼닉네임", email: "gks9306202@gmail.com" });
  });

  it("이메일 중복(409)이면 안내가 보이고 입력값이 그대로 남는다", async () => {
    render({ saveResponse: apiError(409, "DUPLICATE_RESOURCE") });
    await waitFor(() => expect(screen.getByLabelText("이메일")).toHaveValue("gks9306202@gmail.com"));

    await userEvent.clear(screen.getByLabelText("이메일"));
    await userEvent.type(screen.getByLabelText("이메일"), "taken@example.com");
    await userEvent.click(screen.getByRole("button", { name: "저장" }));

    expect(await screen.findByRole("alert")).toBeInTheDocument();
    expect(screen.getByLabelText("이메일")).toHaveValue("taken@example.com");
    expect(screen.getByTestId("location")).toHaveTextContent("/mypage/edit");
  });

  it("서버 오류(500)여도 입력값이 지워지지 않는다", async () => {
    render({ saveResponse: apiError(500, "INTERNAL_SERVER_ERROR") });
    await waitFor(() => expect(screen.getByLabelText("닉네임")).toHaveValue("한창희"));

    await userEvent.clear(screen.getByLabelText("닉네임"));
    await userEvent.type(screen.getByLabelText("닉네임"), "바꾼닉네임");
    await userEvent.click(screen.getByRole("button", { name: "저장" }));

    expect(await screen.findByRole("alert")).toBeInTheDocument();
    expect(screen.getByLabelText("닉네임")).toHaveValue("바꾼닉네임");
  });
});

describe("소셜 계정 분기 (AC-A-16)", () => {
  it("이메일 칸이 읽기 전용이고 제공자 안내가 붙는다", async () => {
    render({ account: KAKAO_ACCOUNT });

    await waitFor(() => expect(screen.getByLabelText("이메일")).toHaveAttribute("readonly"));
    expect(screen.getByText(/카카오/)).toBeInTheDocument();
    // 닉네임은 소셜도 고칠 수 있다
    expect(screen.getByLabelText("닉네임")).not.toHaveAttribute("readonly");
  });
});
