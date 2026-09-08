// frontend-dev 작성 — 정의서가 정했지만 선작성 테스트가 덮지 않은 분기.
// (errorCode별 "비우는 칸"의 나머지 두 규칙 · 탈퇴 실패의 대화상자 닫힘 · 방 관리 패널)
import { render as rtlRender, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { describe, expect, it } from "vitest";
import { apiError, apiSuccess, stubFetch } from "../test/helpers.jsx";
import { AuthProvider } from "../context/AuthContext.jsx";
import { PasswordChangePage } from "./PasswordChangePage.jsx";
import { WithdrawPage } from "./WithdrawPage.jsx";


const LOCAL = {
  username: "gks930620",
  nickname: "한창희",
  email: "a@b.com",
  provider: "LOCAL",
  social: false,
  emailEditable: true,
  passwordChangeable: true,
};

function renderPage(element, route, handler) {
  const fetchMock = stubFetch(handler);
  rtlRender(
    <MemoryRouter initialEntries={[route]}>
      <AuthProvider>
        <Routes>
          <Route element={element} path={route} />
          <Route element={<div>마이페이지</div>} path="/mypage" />
          <Route element={<div>홈</div>} path="/" />
        </Routes>
      </AuthProvider>
    </MemoryRouter>,
  );
  return fetchMock;
}

async function fillPasswords() {
  await userEvent.type(screen.getByLabelText("현재 비밀번호"), "1234");
  await userEvent.type(screen.getByLabelText("새 비밀번호"), "newpass1234");
  await userEvent.type(screen.getByLabelText("새 비밀번호 확인"), "newpass1234");
}

describe("비밀번호 변경 — '틀린 것만 지운다' (설계/04 §4-1)", () => {
  const renderPassword = (changeResponse) =>
    renderPage(<PasswordChangePage />, "/mypage/password", (url) => {
      if (url.includes("/api/users/me")) return apiSuccess({ id: 3, ...LOCAL });
      if (url.includes("/api/me/password")) return changeResponse;
      return apiSuccess(LOCAL);
    });

  it("확인 불일치는 확인 칸만 비우고 그 칸에 포커스한다", async () => {
    renderPassword(apiError(400, "NEW_PASSWORD_CONFIRM_MISMATCH"));
    await waitFor(() => expect(screen.getByLabelText("현재 비밀번호")).toBeInTheDocument());

    await fillPasswords();
    await userEvent.click(screen.getByRole("button", { name: "변경" }));

    await waitFor(() => expect(screen.getByLabelText("새 비밀번호 확인")).toHaveValue(""));
    expect(screen.getByLabelText("현재 비밀번호")).toHaveValue("1234");
    expect(screen.getByLabelText("새 비밀번호")).toHaveValue("newpass1234");
    expect(screen.getByLabelText("새 비밀번호 확인")).toHaveFocus();
  });

  it("현재와 같은 비밀번호면 새 비밀번호와 확인을 함께 비운다 (확인만 남으면 즉시 불일치가 난다)", async () => {
    renderPassword(apiError(400, "NEW_PASSWORD_SAME_AS_CURRENT"));
    await waitFor(() => expect(screen.getByLabelText("현재 비밀번호")).toBeInTheDocument());

    await fillPasswords();
    await userEvent.click(screen.getByRole("button", { name: "변경" }));

    await waitFor(() => expect(screen.getByLabelText("새 비밀번호")).toHaveValue(""));
    expect(screen.getByLabelText("새 비밀번호 확인")).toHaveValue("");
    expect(screen.getByLabelText("현재 비밀번호")).toHaveValue("1234"); // 맞은 값은 건드리지 않는다
    expect(screen.getByLabelText("새 비밀번호")).toHaveFocus();
  });

  it("길이 위반(VALIDATION_ERROR)은 아무 칸도 비우지 않는다 (자기가 뭘 쳤는지 보고 고쳐야 한다)", async () => {
    renderPassword(
      apiError(400, "VALIDATION_ERROR", "검증 실패", [{ field: "newPassword", message: "4자 이상" }]),
    );
    await waitFor(() => expect(screen.getByLabelText("현재 비밀번호")).toBeInTheDocument());

    await fillPasswords();
    await userEvent.click(screen.getByRole("button", { name: "변경" }));

    expect(await screen.findByRole("alert")).toBeInTheDocument();
    expect(screen.getByLabelText("현재 비밀번호")).toHaveValue("1234");
    expect(screen.getByLabelText("새 비밀번호")).toHaveValue("newpass1234");
  });

  it("서버가 403 PASSWORD_NOT_SUPPORTED를 주면 안내 화면으로 바뀐다 (플래그와 서버가 어긋난 경우)", async () => {
    renderPassword(apiError(403, "PASSWORD_NOT_SUPPORTED"));
    await waitFor(() => expect(screen.getByLabelText("현재 비밀번호")).toBeInTheDocument());

    await fillPasswords();
    await userEvent.click(screen.getByRole("button", { name: "변경" }));

    expect(await screen.findByRole("link", { name: "마이페이지로" })).toBeInTheDocument();
    expect(screen.queryByLabelText("현재 비밀번호")).not.toBeInTheDocument();
  });
});

describe("회원 탈퇴 — 실패별 대화상자 처리 (설계/05 §12-1 · 설계/04 §4-1)", () => {
  const PREVIEW = {
    completedUnitCount: 42,
    bookmarkCounts: { kanji: 12, grammar: 5, vocabulary: 30, total: 47 },
    communityCount: 3,
    commentCount: 12,
    confirmationType: "PASSWORD",
  };

  const renderWithdraw = (withdrawResponse) =>
    renderPage(<WithdrawPage />, "/mypage/withdraw", (url) => {
      if (url.includes("/api/users/me")) return apiSuccess({ id: 3, nickname: "한창희" });
      if (url.includes("withdrawal-preview")) return apiSuccess(PREVIEW);
      if (url.includes("/api/me/withdrawal")) return withdrawResponse;
      return apiSuccess(null);
    });

  async function openDialog() {
    await userEvent.type(screen.getByLabelText("비밀번호"), "1234");
    await userEvent.click(screen.getByLabelText("위 내용을 확인했어요"));
    await userEvent.click(screen.getByRole("button", { name: "탈퇴하기" }));
  }

  it("비밀번호 불일치는 대화상자를 닫고 그 칸을 비운 뒤 포커스한다", async () => {
    renderWithdraw(apiError(400, "PASSWORD_MISMATCH"));
    await waitFor(() => expect(screen.getByLabelText("비밀번호")).toBeInTheDocument());

    await openDialog();
    await userEvent.click(screen.getByRole("button", { name: "탈퇴" }));

    await waitFor(() => expect(screen.queryByRole("button", { name: "탈퇴" })).not.toBeInTheDocument());
    expect(screen.getByLabelText("비밀번호")).toHaveValue("");
    expect(screen.getByLabelText("비밀번호")).toHaveFocus();
    expect(screen.getByLabelText("위 내용을 확인했어요")).toBeChecked(); // 체크는 켜진 채로 둔다
  });

  it("5xx는 대화상자를 닫지 않고 그 안에서 알린다", async () => {
    renderWithdraw(apiError(500, "INTERNAL_SERVER_ERROR"));
    await waitFor(() => expect(screen.getByLabelText("비밀번호")).toBeInTheDocument());

    await openDialog();
    await userEvent.click(screen.getByRole("button", { name: "탈퇴" }));

    expect(await screen.findByText(/탈퇴하지 못했어요/)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "탈퇴" })).toBeInTheDocument();
  });

  it("로컬 계정에만 아이디 재가입 안내가 보인다 (소셜에는 거짓이다)", async () => {
    renderWithdraw(apiSuccess({ withdrawn: true }));

    expect(await screen.findByText(/같은 아이디로 다시 가입할 수 없어요/)).toBeInTheDocument();
  });
});
