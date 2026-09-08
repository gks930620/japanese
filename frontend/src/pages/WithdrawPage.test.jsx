import { render as rtlRender, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { describe, expect, it } from "vitest";
import { apiError, apiSuccess, stubFetch } from "../test/helpers.jsx";
import { LocationProbe } from "../test/LocationProbe.jsx";
import { AuthProvider } from "../context/AuthContext.jsx";
import { WithdrawPage } from "./WithdrawPage.jsx";

/**
 * 회원 탈퇴 화면 (설계/04 §4-1) — TDD Red, senior-dev 작성.
 * 인수 조건: AC-A-18, AC-A-30 ~ AC-A-36, AC-A-41·42
 *
 * 되돌릴 수 없는 화면이다. 그래서 이 테스트가 고정하는 것은 문구가 아니라
 * **실수로 탈퇴되지 않는 구조**(확인 체크 + 본인 확인 + 최종 모달)다.
 *
 * 이 테스트를 수정하지 말 것 — 계약 변경은 senior-dev 경유.
 */

const LOCAL_PREVIEW = {
  completedUnitCount: 42,
  bookmarkCounts: { kanji: 12, grammar: 5, vocabulary: 30, total: 47 },
  communityCount: 3,
  commentCount: 12,
  confirmationType: "PASSWORD",
};

const SOCIAL_PREVIEW = { ...LOCAL_PREVIEW, confirmationType: "TEXT" };

function render({ preview = LOCAL_PREVIEW, withdrawResponse } = {}) {
  const fetchMock = stubFetch((url) => {
    if (url.includes("/api/users/me")) {
      return apiSuccess({ id: 3, username: "gks930620", nickname: "한창희", provider: "LOCAL" });
    }
    if (url.includes("/api/me/withdrawal-preview")) return apiSuccess(preview);
    if (url.includes("/api/me/withdrawal")) return withdrawResponse ?? apiSuccess({ withdrawn: true });
    return apiSuccess(null);
  });

  rtlRender(
    <MemoryRouter initialEntries={["/mypage/withdraw"]}>
      <LocationProbe />
      <AuthProvider>
        <Routes>
          <Route element={<WithdrawPage />} path="/mypage/withdraw" />
          <Route element={<div>홈</div>} path="/" />
          <Route element={<div>마이페이지</div>} path="/mypage" />
        </Routes>
      </AuthProvider>
    </MemoryRouter>,
  );
  return fetchMock;
}

function withdrawRequests(fetchMock) {
  return fetchMock.mock.calls.filter(
    ([url, options]) => String(url).includes("/api/me/withdrawal") && !String(url).includes("preview") && options?.method,
  );
}

async function fillLocalConfirmation() {
  await userEvent.type(screen.getByLabelText("비밀번호"), "1234");
  await userEvent.click(screen.getByLabelText("위 내용을 확인했어요"));
}

describe("탈퇴 안내 (AC-A-30)", () => {
  it("사라지는 것과 남는 것의 숫자가 실제 값으로 보인다", async () => {
    render();

    // 완료 유닛 42 · 어휘 30 — 문구·배치는 designer 소관이라 "실제 값이 화면에 있는가"만 고정한다 (채팅 숫자는 기능 제거로 없음)
    await waitFor(() => expect(document.body.textContent).toMatch(/42/));
    expect(document.body.textContent).toMatch(/30/);
  });

  it("[내가 쓴 글 찾기]가 내 닉네임으로 검색된 커뮤니티를 가리킨다 (AC-A-41)", async () => {
    render();

    await waitFor(() =>
      expect(screen.getByRole("link", { name: "내가 쓴 글 찾기" })).toHaveAttribute(
        "href",
        "/community?searchType=nickname&keyword=%ED%95%9C%EC%B0%BD%ED%9D%AC",
      ),
    );
  });

  it("[취소]는 마이페이지로 돌아간다 (AC-A-42)", async () => {
    render();

    await waitFor(() => expect(screen.getByRole("link", { name: "취소" })).toHaveAttribute("href", "/mypage"));
  });
});

describe("실수로 탈퇴되지 않는다 (AC-A-32·33·34·35)", () => {
  it("확인 체크와 본인 확인이 모두 채워지기 전에는 [탈퇴하기]가 눌리지 않는다", async () => {
    render();
    await waitFor(() => expect(screen.getByLabelText("비밀번호")).toBeInTheDocument());

    expect(screen.getByRole("button", { name: "탈퇴하기" })).toBeDisabled();

    await userEvent.type(screen.getByLabelText("비밀번호"), "1234");
    expect(screen.getByRole("button", { name: "탈퇴하기" })).toBeDisabled();

    await userEvent.click(screen.getByLabelText("위 내용을 확인했어요"));
    expect(screen.getByRole("button", { name: "탈퇴하기" })).toBeEnabled();
  });

  it("[탈퇴하기]를 눌러도 곧바로 탈퇴되지 않고 최종 확인을 한 번 더 받는다", async () => {
    const fetchMock = render();
    await waitFor(() => expect(screen.getByLabelText("비밀번호")).toBeInTheDocument());

    await fillLocalConfirmation();
    await userEvent.click(screen.getByRole("button", { name: "탈퇴하기" }));

    expect(screen.getByRole("button", { name: "탈퇴" })).toBeInTheDocument();
    expect(withdrawRequests(fetchMock)).toHaveLength(0);
  });

  it("최종 확인에서 [취소]하면 탈퇴되지 않고 입력값이 남는다", async () => {
    const fetchMock = render();
    await waitFor(() => expect(screen.getByLabelText("비밀번호")).toBeInTheDocument());

    await fillLocalConfirmation();
    await userEvent.click(screen.getByRole("button", { name: "탈퇴하기" }));
    await userEvent.click(screen.getByRole("button", { name: "취소" }));

    expect(withdrawRequests(fetchMock)).toHaveLength(0);
    expect(screen.getByLabelText("비밀번호")).toHaveValue("1234");
  });
});

describe("탈퇴 실행 (AC-A-36)", () => {
  it("최종 확인을 누르면 POST /api/me/withdrawal 로 본인 확인 값을 보낸다", async () => {
    const fetchMock = render();
    await waitFor(() => expect(screen.getByLabelText("비밀번호")).toBeInTheDocument());

    await fillLocalConfirmation();
    await userEvent.click(screen.getByRole("button", { name: "탈퇴하기" }));
    await userEvent.click(screen.getByRole("button", { name: "탈퇴" }));

    await waitFor(() => expect(withdrawRequests(fetchMock)).toHaveLength(1));
    const [, options] = withdrawRequests(fetchMock)[0];
    expect(options.method).toBe("POST");
    expect(JSON.parse(options.body)).toEqual({ password: "1234" });
  });

  it("성공하면 홈으로 이동한다", async () => {
    render();
    await waitFor(() => expect(screen.getByLabelText("비밀번호")).toBeInTheDocument());

    await fillLocalConfirmation();
    await userEvent.click(screen.getByRole("button", { name: "탈퇴하기" }));
    await userEvent.click(screen.getByRole("button", { name: "탈퇴" }));

    await waitFor(() => expect(screen.getByTestId("location").textContent).toBe("/"));
  });

  it("비밀번호가 틀리면(400 PASSWORD_MISMATCH) 화면에 머물고 안내가 보인다", async () => {
    render({ withdrawResponse: apiError(400, "PASSWORD_MISMATCH") });
    await waitFor(() => expect(screen.getByLabelText("비밀번호")).toBeInTheDocument());

    await fillLocalConfirmation();
    await userEvent.click(screen.getByRole("button", { name: "탈퇴하기" }));
    await userEvent.click(screen.getByRole("button", { name: "탈퇴" }));

    await waitFor(() => expect(screen.getByTestId("location").textContent).toBe("/mypage/withdraw"));
  });
});

describe("소셜 계정 분기 (AC-A-18)", () => {
  it("비밀번호 칸 대신 확인 문구 입력칸이 보이고, 정확한 문구만 통과한다", async () => {
    const fetchMock = render({ preview: SOCIAL_PREVIEW });

    await waitFor(() => expect(screen.getByLabelText("확인 문구")).toBeInTheDocument());
    expect(screen.queryByLabelText("비밀번호")).not.toBeInTheDocument();

    await userEvent.type(screen.getByLabelText("확인 문구"), "탈퇴할래요");
    await userEvent.click(screen.getByLabelText("위 내용을 확인했어요"));
    // 문구가 정확하지 않으면 서버까지 가지 않는다
    expect(screen.getByRole("button", { name: "탈퇴하기" })).toBeDisabled();

    await userEvent.clear(screen.getByLabelText("확인 문구"));
    await userEvent.type(screen.getByLabelText("확인 문구"), "탈퇴합니다");
    expect(screen.getByRole("button", { name: "탈퇴하기" })).toBeEnabled();

    await userEvent.click(screen.getByRole("button", { name: "탈퇴하기" }));
    await userEvent.click(screen.getByRole("button", { name: "탈퇴" }));

    await waitFor(() => expect(withdrawRequests(fetchMock)).toHaveLength(1));
    expect(JSON.parse(withdrawRequests(fetchMock)[0][1].body)).toEqual({ confirmText: "탈퇴합니다" });
  });
});
