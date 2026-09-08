import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes, useLocation } from "react-router-dom";
import { beforeEach, describe, expect, it } from "vitest";
import { apiError, apiSuccess, jsonResponse, stubFetch } from "../test/helpers.jsx";
import { unitStudyPayload } from "../test/helpers.jsx";
import { AuthProvider } from "../context/AuthContext.jsx";
import { UserDataProvider } from "../context/UserDataContext.jsx";
import { Layout } from "../components/Layout.jsx";
import { BookmarksPage } from "./BookmarksPage.jsx";
import { MyPage } from "./MyPage.jsx";
import { ProfileEditPage } from "./ProfileEditPage.jsx";
import { SignupPage } from "./SignupPage.jsx";
import { UnitStudyPage } from "./UnitStudyPage.jsx";

/**
 * 계정 흐름의 UX 세 건 (2026-08-25 판정 B-M1 · B-M2 · B-L5)
 *
 * - B-M1: 닉네임을 바꾸면 서버는 정상인데 헤더 배지만 옛 이름이다. `AuthContext.refreshUser`가 정의돼 있고
 *   부르는 곳이 0곳이다. 탈퇴 화면의 [내가 쓴 글 찾기]도 옛 닉네임으로 검색된다(AC-A-41 훼손).
 * - B-M2: 로그인 유도를 눌러 로그인하면 원래 자리로 안 돌아온다(설계/01 §6 위반).
 *   `LoginPage.jsx:22`가 `location.state?.from ?? "/"`이므로 **`state.from`을 주는 쪽의 책임**이다.
 *   올바른 선례가 저장소에 둘 있다(`ProtectedRoute.jsx:13` · `CommunityDetailPage.jsx:76`).
 * - B-L5: 가입 실패 문구가 "username: 아이디는 4~20자여야 합니다"로 나온다. 필드 변수명은 사용자의 말이 아니다.
 *
 * 이 테스트를 수정하지 말 것 — 계약 변경은 senior-dev 경유.
 */

/** 로그인 화면이 받은 복귀 주소를 눈에 보이게 한다 — `state.from`은 href에 담기지 않는다 */
function LoginProbe() {
  const location = useLocation();
  return <div data-testid="login-from">{location.state?.from ?? "(없음)"}</div>;
}

const VALIDATION_400 = jsonResponse(
  {
    success: false,
    message: "입력값을 확인해 주세요",
    errorCode: "VALIDATION_ERROR",
    errors: [
      { field: "username", message: "아이디는 4~20자여야 합니다" },
      { field: "password", message: "비밀번호는 4자 이상이어야 합니다" },
    ],
  },
  400,
);

beforeEach(() => {
  window.localStorage.clear();
});

describe("닉네임 변경 후 헤더 (B-M1)", () => {
  it("저장하면 헤더 배지가 새 닉네임으로 바뀐다 — 새로고침 없이", async () => {
    let nickname = "옛닉네임";
    stubFetch((url) => {
      const target = String(url);
      if (target.includes("/api/me/profile")) {
        nickname = "새닉네임";
        return apiSuccess({ nickname, email: "a@b.com" });
      }
      if (target.includes("/api/me/account")) {
        return apiSuccess({
          username: "gks930620", nickname, email: "a@b.com",
          provider: "LOCAL", social: false, emailEditable: true, passwordChangeable: true,
        });
      }
      if (target.includes("/api/users/me")) return apiSuccess({ id: 3, username: "gks930620", nickname });
      if (target.includes("/api/progress")) return apiSuccess({ completedUnits: [], lastPosition: null });
      return apiSuccess(null);
    });

    render(
      <MemoryRouter initialEntries={["/mypage/profile"]}>
        <AuthProvider>
          <UserDataProvider>
            <Routes>
              <Route element={<Layout />}>
                <Route element={<ProfileEditPage />} path="/mypage/profile" />
                <Route element={<MyPage />} path="/mypage" />
              </Route>
            </Routes>
          </UserDataProvider>
        </AuthProvider>
      </MemoryRouter>,
    );
    const user = userEvent.setup();

    await waitFor(() => expect(screen.getAllByText("옛닉네임").length).toBeGreaterThan(0));
    const input = await screen.findByLabelText("닉네임");
    await user.clear(input);
    await user.type(input, "새닉네임");
    await user.click(screen.getByRole("button", { name: "저장" }));

    await waitFor(() => expect(screen.getByText("수정했어요")).toBeInTheDocument());
    // 헤더의 닉네임 배지 — 클래스(.hdr-badge)가 아니라 **헤더 랜드마크 안의 텍스트**로 본다(2026-09-03 판정 §6-2).
    // 킷 교체로 클래스가 바뀌어도 "헤더에 새 닉네임이 보인다"는 사실은 그대로다.
    const header = screen.getByRole("banner");
    expect(within(header).getByText("새닉네임")).toBeInTheDocument();
    expect(within(header).queryByText("옛닉네임")).toBeNull();
  });
});

describe("로그인 후 원래 자리로 (B-M2)", () => {
  it("보관함의 로그인 유도는 보관함으로 되돌아온다", async () => {
    stubFetch((url) =>
      String(url).includes("/api/users/me") ? apiError(401, "NOT_AUTHENTICATED") : apiSuccess(null),
    );
    render(
      <MemoryRouter initialEntries={["/bookmarks"]}>
        <AuthProvider>
          <UserDataProvider>
            <Routes>
              <Route element={<BookmarksPage />} path="/bookmarks" />
              <Route element={<LoginProbe />} path="/login" />
            </Routes>
          </UserDataProvider>
        </AuthProvider>
      </MemoryRouter>,
    );
    const user = userEvent.setup();

    await user.click(await screen.findByRole("link", { name: /로그인하고 계정에 저장/ }));

    expect(screen.getByTestId("login-from")).toHaveTextContent("/bookmarks");
  });

  it("유닛 정리 스텝의 로그인 띠는 그 유닛으로 되돌아온다", async () => {
    // 완료 3개째의 정리 스텝에서만 뜨는 띠다(설계/05 §8) — 게스트 진도를 그 상태로 만든다
    window.localStorage.setItem(
      "jp.guest.v1",
      JSON.stringify({
        version: 1,
        progress: {
          completedUnits: [
            { courseId: 2, unitNo: 1 },
            { courseId: 2, unitNo: 2 },
          ],
          lastPosition: null,
        },
        bookmarks: { kanji: [], grammar: [], vocabulary: [] },
      }),
    );
    stubFetch((url) => {
      const target = String(url);
      if (target.includes("/api/users/me")) return apiError(401, "NOT_AUTHENTICATED");
      if (target.includes("/api/courses/2/units/4")) return apiSuccess(unitStudyPayload({ unitNo: 4 }));
      return apiSuccess(null);
    });
    render(
      <MemoryRouter initialEntries={["/courses/2/units/4"]}>
        <AuthProvider>
          <UserDataProvider>
            <Routes>
              <Route element={<UnitStudyPage />} path="/courses/:courseId/units/:unitNo" />
              <Route element={<LoginProbe />} path="/login" />
            </Routes>
          </UserDataProvider>
        </AuthProvider>
      </MemoryRouter>,
    );
    const user = userEvent.setup();

    await user.click(await screen.findByRole("button", { name: "정리" }));
    await user.click(await screen.findByRole("link", { name: "로그인" }));

    expect(screen.getByTestId("login-from")).toHaveTextContent("/courses/2/units/4");
  });
});

describe("가입 실패 문구 (B-L5)", () => {
  async function submitSignup() {
    // * stubFetch는 url만 넘긴다 - method로 가를 수 없어 경로로 가른다(가입 POST는 /api/users 그 자체)
    stubFetch((url) => {
      const target = String(url);
      if (target.includes("/api/users/me")) return apiError(401, "NOT_AUTHENTICATED");
      if (target.endsWith("/api/users")) return VALIDATION_400;
      return apiSuccess(null);
    });
    render(
      <MemoryRouter initialEntries={["/signup"]}>
        <AuthProvider>
          <Routes>
            <Route element={<SignupPage />} path="/signup" />
          </Routes>
        </AuthProvider>
      </MemoryRouter>,
    );
    const user = userEvent.setup();
    await user.type(screen.getByLabelText("아이디"), "abc");
    await user.type(screen.getByLabelText("비밀번호"), "123");
    await user.type(screen.getByLabelText("비밀번호 확인"), "123");
    await user.type(screen.getByLabelText(/이메일/), "a@b.com");
    await user.type(screen.getByLabelText("닉네임"), "닉");
    await user.click(screen.getByRole("button", { name: /가입/ }));
  }

  it("영문 필드명을 보여주지 않는다", async () => {
    await submitSignup();

    expect(await screen.findByText(/아이디는 4~20자여야 합니다/)).toBeInTheDocument();
    expect(screen.queryByText(/username/)).not.toBeInTheDocument();
  });

  it("여러 건이면 줄로 나눠 보여 준다 — 한 줄로 붙지 않는다", async () => {
    await submitSignup();

    await screen.findByText(/아이디는 4~20자여야 합니다/);
    expect(document.querySelectorAll("li").length).toBeGreaterThanOrEqual(2);
  });
});
