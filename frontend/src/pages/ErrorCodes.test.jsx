// frontend-dev 작성 — 새 오류 코드 2개의 화면 안내 (2026-08-25 서버 변경).
// 둘 다 **재시도로 회복되지 않는 실패**다(08 C-12 ④): 무엇이 문제인지·무엇을 하면 되는지를 말해야 한다.
//   · 429 TOO_MANY_LOGIN_ATTEMPTS — 얼마나 기다려야 하는지
//   · 413 PAYLOAD_TOO_LARGE       — 파일이 크다는 사실과 한도
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { apiError, apiSuccess, jsonResponse, stubFetch } from "../test/helpers.jsx";
import { AuthProvider } from "../context/AuthContext.jsx";
import { LoginPage } from "./LoginPage.jsx";
import { CommunityWritePage } from "./CommunityWritePage.jsx";

beforeEach(() => {
  vi.restoreAllMocks();
  vi.spyOn(window, "alert").mockImplementation(() => {});
});

describe("로그인 5회 실패 후 429 (TOO_MANY_LOGIN_ATTEMPTS)", () => {
  async function submitLogin(response) {
    stubFetch((url) => {
      const target = String(url);
      if (target.includes("/api/users/me")) return apiError(401, "NOT_AUTHENTICATED");
      if (target.includes("/api/login")) return response;
      return apiSuccess(null);
    });
    render(
      <MemoryRouter initialEntries={["/login"]}>
        <AuthProvider>
          <Routes>
            <Route element={<LoginPage />} path="/login" />
          </Routes>
        </AuthProvider>
      </MemoryRouter>,
    );
    const user = userEvent.setup();
    await user.type(screen.getByLabelText("아이디"), "gks930620");
    await user.type(screen.getByLabelText("비밀번호"), "wrong");
    await user.click(screen.getByRole("button", { name: /로그인/ }));
  }

  it("얼마나 기다려야 하는지 말한다 — '잠시 후'로 뭉개지 않는다", async () => {
    await submitLogin(
      jsonResponse(
        { success: false, message: "로그인 시도가 너무 많습니다", errorCode: "TOO_MANY_LOGIN_ATTEMPTS" },
        429,
      ),
    );

    await waitFor(() => expect(screen.getByText(/15분/)).toBeInTheDocument());
    expect(screen.getByText(/너무 많|여러 번/)).toBeInTheDocument();
    expect(screen.queryByText(/잠시 후 다시 시도/)).not.toBeInTheDocument();
  });

  it("비밀번호가 틀린 401은 지금 그대로다 (회귀)", async () => {
    await submitLogin(jsonResponse({ success: false, message: "아이디 또는 비밀번호가 올바르지 않습니다", errorCode: "INVALID_CREDENTIALS" }, 401));

    await waitFor(() => expect(screen.getByText(/올바르지 않습니다/)).toBeInTheDocument());
    expect(screen.queryByText(/15분/)).not.toBeInTheDocument();
  });
});

describe("업로드 413 (PAYLOAD_TOO_LARGE)", () => {
  it("파일이 크다는 사실과 한도를 말한다", async () => {
    stubFetch((url) => {
      const target = String(url);
      if (target.includes("/api/users/me")) return apiSuccess({ id: 3, username: "u", nickname: "n" });
      if (target.includes("/api/files")) {
        return jsonResponse({ success: false, message: "파일이 너무 큽니다", errorCode: "PAYLOAD_TOO_LARGE" }, 413);
      }
      if (target.includes("/api/communities")) return apiSuccess(1004);
      return apiSuccess(null);
    });
    render(
      <MemoryRouter initialEntries={["/community/write"]}>
        <AuthProvider>
          <Routes>
            <Route element={<CommunityWritePage />} path="/community/write" />
            <Route element={<div>상세</div>} path="/community/detail" />
          </Routes>
        </AuthProvider>
      </MemoryRouter>,
    );
    const user = userEvent.setup();
    await user.type(await screen.findByLabelText(/제목/), "제목");
    await user.type(screen.getByLabelText(/내용/), "본문");
    await user.upload(document.querySelector("input[type=file]"), new File(["x"], "big.zip"));
    await user.click(screen.getByRole("button", { name: /등록|작성|저장/ }));

    await waitFor(() => expect(window.alert).toHaveBeenCalled());
    const said = window.alert.mock.calls.map(([text]) => String(text)).join(" ");
    expect(said).toMatch(/10MB/);
    expect(said).not.toMatch(/잠시 후 다시 시도/);
  });
});
