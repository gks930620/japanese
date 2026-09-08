import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { describe, expect, it } from "vitest";
import { apiSuccess, stubFetch } from "../test/helpers.jsx";
import { AuthProvider } from "../context/AuthContext.jsx";
import { WithdrawPage } from "./WithdrawPage.jsx";

/**
 * 탈퇴 확인 모달의 **0** (2026-08-25 판정 B-L2 · 08 C-12 ①)
 *
 * 실측 문구: **"완료한 0개 유닛과 보관함 0개가 지워져요. 되돌릴 수 없어요."**
 * 같은 화면의 위 패널은 **이미 옳게** 처리한다 — 지울 게 없으면 "지워질 학습 기록이 없어요"를 쓰고,
 * 남을 게 없으면 패널째 없앤다(`WithdrawPage.jsx:147`). **마지막 확인 모달만 0을 그대로 읽는다.**
 * 되돌릴 수 없는 화면의 마지막 문장이 "0개가 지워져요"라고 말하면, 그 문장은 사용자의 판단에 아무 도움이 안 된다.
 *
 * 계약: **0인 항목은 문장에서 뺀다.** 둘 다 0이면 지워진다는 말 자체를 하지 않고 되돌릴 수 없다는 사실만 남긴다.
 *
 * 이 테스트를 수정하지 말 것 — 계약 변경은 senior-dev 경유.
 */

const EMPTY_PREVIEW = {
  completedUnitCount: 0,
  bookmarkCounts: { kanji: 0, grammar: 0, vocabulary: 0, total: 0 },
  communityCount: 0,
  commentCount: 0,
  confirmationType: "PASSWORD",
};

function renderWithdraw(preview) {
  stubFetch((url) => {
    const target = String(url);
    if (target.includes("/api/users/me")) {
      return apiSuccess({ id: 3, username: "gks930620", nickname: "한창희", provider: "LOCAL" });
    }
    if (target.includes("/api/me/withdrawal-preview")) return apiSuccess(preview);
    return apiSuccess(null);
  });
  render(
    <MemoryRouter initialEntries={["/mypage/withdraw"]}>
      <AuthProvider>
        <Routes>
          <Route element={<WithdrawPage />} path="/mypage/withdraw" />
        </Routes>
      </AuthProvider>
    </MemoryRouter>,
  );
}

/** 최종 확인 모달만 본다 — 같은 문구가 본문 패널에도 있어 화면 전체로 찾으면 어느 쪽인지 알 수 없다 */
function dialog() {
  return within(document.querySelector(".confirm-dialog"));
}

/** 확인 입력 + 체크 후 [탈퇴하기]를 눌러 최종 모달을 연다 */
async function openConfirm(user) {
  await waitFor(() => expect(screen.getByLabelText("비밀번호")).toBeInTheDocument());
  await user.type(screen.getByLabelText("비밀번호"), "1234");
  await user.click(screen.getByLabelText("위 내용을 확인했어요"));
  await user.click(screen.getByRole("button", { name: "탈퇴하기" }));
}

describe("지울 것이 없을 때의 확인 모달 (B-L2)", () => {
  it("'0개'라고 말하지 않는다", async () => {
    renderWithdraw(EMPTY_PREVIEW);
    const user = userEvent.setup();

    await openConfirm(user);

    expect(await screen.findByText("정말 탈퇴할까요?")).toBeInTheDocument();
    expect(dialog().queryByText(/0개/)).not.toBeInTheDocument();
  });

  it("되돌릴 수 없다는 사실은 그대로 말한다", async () => {
    renderWithdraw(EMPTY_PREVIEW);
    const user = userEvent.setup();

    await openConfirm(user);

    await screen.findByText("정말 탈퇴할까요?");
    expect(dialog().getByText(/되돌릴 수 없어요/)).toBeInTheDocument();
  });

  it("한쪽만 0이면 그쪽만 빠진다", async () => {
    renderWithdraw({ ...EMPTY_PREVIEW, completedUnitCount: 42 });
    const user = userEvent.setup();

    await openConfirm(user);

    await screen.findByText("정말 탈퇴할까요?");
    expect(dialog().getByText(/완료한 42개 유닛/)).toBeInTheDocument();
    expect(dialog().queryByText(/보관함 0개/)).not.toBeInTheDocument();
  });

  it("둘 다 있으면 지금 문구 그대로다 (회귀)", async () => {
    renderWithdraw({
      ...EMPTY_PREVIEW,
      completedUnitCount: 42,
      bookmarkCounts: { kanji: 12, grammar: 5, vocabulary: 30, total: 47 },
    });
    const user = userEvent.setup();

    await openConfirm(user);

    await screen.findByText("정말 탈퇴할까요?");
    expect(dialog().getByText(/완료한 42개 유닛과 보관함 47개가 지워져요/)).toBeInTheDocument();
  });
});
