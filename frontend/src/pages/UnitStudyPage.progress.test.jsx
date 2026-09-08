// frontend-dev 작성 — 코드리뷰 Major 1·2 회귀 방지 (AC-P-04·05·10).
// 완료한 유닛은 1번 스텝으로 열리고, 복원 진입은 "정리 스텝 도달"이 아니다.
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { beforeEach, describe, expect, it } from "vitest";
import { apiError, apiSuccess, stubFetch, unitStudyPayload } from "../test/helpers.jsx";
import { AuthProvider } from "../context/AuthContext.jsx";
import { UserDataProvider } from "../context/UserDataContext.jsx";
import { setGuestLastPosition, setGuestUnitCompleted, readGuestProgress } from "../lib/guestStore.js";
import { UnitStudyPage } from "./UnitStudyPage.jsx";

const PAYLOAD = unitStudyPayload({
  courseId: 2,
  unitNo: 4,
  grammars: [
    {
      id: 1,
      name: "名詞+です",
      nameKo: "명사입니다",
      explanation: "설명",
      examples: [{ jp: "学生です。", kana: null, meaningKo: "학생입니다." }],
      rules: [],
    },
  ],
});

/** 비로그인(게스트) 상태로 유닛 학습 화면을 띄운다 — 진도는 localStorage에서 온다 */
function renderUnit() {
  stubFetch((url) =>
    url.includes("/api/users/me") ? apiError(401, "NOT_AUTHENTICATED") : apiSuccess(PAYLOAD),
  );
  render(
    <MemoryRouter initialEntries={["/courses/2/units/4"]}>
      <AuthProvider>
        <UserDataProvider>
          <Routes>
            <Route element={<UnitStudyPage />} path="/courses/:courseId/units/:unitNo" />
          </Routes>
        </UserDataProvider>
      </AuthProvider>
    </MemoryRouter>,
  );
}

beforeEach(() => {
  window.localStorage.clear();
});

describe("UnitStudyPage — 스텝 복원 (AC-P-08·10)", () => {
  it("미완료 유닛은 저장된 스텝으로 열리고 이어보기 띠가 뜬다", async () => {
    setGuestLastPosition({ courseId: 2, unitNo: 4, stepKey: "kanji" }, new Date());
    renderUnit();

    expect(await screen.findByText(/보던 곳부터 이어서 보고 있어요/)).toBeInTheDocument();
    await waitFor(() => expect(screen.getByText("스텝 3 / 6")).toBeInTheDocument());
  });

  it("완료한 유닛은 저장된 스텝이 있어도 1번 스텝으로 열린다 (AC-P-10)", async () => {
    setGuestUnitCompleted(2, 4, true);
    setGuestLastPosition({ courseId: 2, unitNo: 4, stepKey: "kanji" }, new Date());
    renderUnit();

    expect(await screen.findByText("이 유닛은 마쳤어요")).toBeInTheDocument();
    expect(screen.getByText("스텝 1 / 6")).toBeInTheDocument();
    // 두 안내 띠가 겹치지 않는다 (설계/05 §8의 전제)
    expect(screen.queryByText(/보던 곳부터 이어서 보고 있어요/)).toBeNull();
  });
});

describe("UnitStudyPage — 완료 자동 전송 (AC-P-04·05)", () => {
  it("정리 스텝에 도달하면 완료로 표시된다", async () => {
    const user = userEvent.setup();
    renderUnit();

    await user.click(await screen.findByRole("button", { name: "정리" }));

    await waitFor(() => expect(readGuestProgress().completedUnits).toEqual([{ courseId: 2, unitNo: 4 }]));
  });

  it("저장된 위치가 summary라도 **복원 진입**만으로는 완료가 되지 않는다 (도달이 아니다)", async () => {
    setGuestLastPosition({ courseId: 2, unitNo: 4, stepKey: "summary" }, new Date());
    renderUnit();

    // 정리 스텝이 열리지만 완료 전송은 없다 — [완료 취소]한 유닛이 되살아나면 안 된다
    // (정리가 몇 번째 스텝인지는 여기서 단언하지 않는다 — 스텝 순서는 UnitStudyPage.stepOrder.test.jsx 한 곳이 고정한다, 08 C-11)
    expect(await screen.findByText("이번 유닛에서 배운 것")).toBeInTheDocument();
    expect(readGuestProgress().completedUnits).toEqual([]);
  });

  it("복원 진입 뒤 다른 스텝으로 갔다가 정리로 돌아오면 그때는 완료된다", async () => {
    const user = userEvent.setup();
    setGuestLastPosition({ courseId: 2, unitNo: 4, stepKey: "summary" }, new Date());
    renderUnit();

    await user.click(await screen.findByRole("button", { name: "한자" }));
    await user.click(screen.getByRole("button", { name: "정리" }));

    await waitFor(() => expect(readGuestProgress().completedUnits).toEqual([{ courseId: 2, unitNo: 4 }]));
  });
});
