// TDD Red — senior-dev 작성 (2026-09-03 결정 `진행사항/결정_2026-09_이어서_확인문제.md` §1-3 · AC-R-5·6)
//
// 코스 상세는 "지도"다 — 가리켜야 할 곳은 **안 한 곳**(미완료 최전선)이고, 그 말은 "다음 유닛"이지 "이어서"가 아니다.
//   · 주 버튼: 미완료 최전선으로. 문구에 **"이어서" 금지**(권장 "유닛 n 학습하기").
//   · "여기부터"(강조)는 최전선 행에만.
//   · 마지막 위치가 이 코스의 **미완료** 유닛이고 최전선과 **다를 때만** 그 행에 "보던 중"(읽기 전용, 강조 아님).
//     완료된 유닛에는 붙이지 않는다(복습은 처음부터 — 01 §7-4). 두 행이 같으면 "여기부터"만.
// 진도 계산은 게스트 저장소로 넣는다(회원·게스트가 같은 계산을 쓴다 — 설계/04 §6-3).
//
// 이 테스트를 수정하지 말 것 — 계약 변경은 senior-dev 경유 (CLAUDE.md TDD 규칙 2).
import { render, screen, within } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { beforeEach, describe, expect, it } from "vitest";
import { apiError, apiSuccess, stubFetch } from "../test/helpers.jsx";
import { AuthProvider } from "../context/AuthContext.jsx";
import { UserDataProvider } from "../context/UserDataContext.jsx";
import { setGuestLastPosition, setGuestUnitCompleted } from "../lib/guestStore.js";
import { CourseDetailPage } from "./CourseDetailPage.jsx";

const DETAIL = {
  id: 2, courseNo: 1, levelLabel: "JLPT N5", levelCode: "N5", title: "왕초보", targetAudience: "", goal: "", notice: null,
  description: "소개", status: "AVAILABLE",
  summary: { unitCount: 8, grammarCount: 16, kanjiCount: 40, vocabCount: 120 },
  units: Array.from({ length: 8 }, (_, i) => ({ unitNo: i + 1, title: `제목 ${i + 1}`, grammarCount: 2, kanjiCount: 5, vocabCount: 15 })),
};

function renderDetail() {
  stubFetch((url) => (url.includes("/api/users/me") ? apiError(401, "NOT_AUTHENTICATED") : apiSuccess(DETAIL)));
  render(
    <MemoryRouter initialEntries={["/courses/2"]}>
      <AuthProvider>
        <UserDataProvider>
          <Routes>
            <Route element={<CourseDetailPage />} path="/courses/:courseId" />
          </Routes>
        </UserDataProvider>
      </AuthProvider>
    </MemoryRouter>,
  );
}

/**
 * 유닛 n 행(링크).
 *
 * ⚠️ href만으로는 주 버튼과 구분되지 않는다 — 주 버튼도 최전선 유닛을 가리키므로
 * "여기부터" 케이스에서는 **두 링크의 href가 같다**. 그래서 목록 행의 표식(`.unit-num`)으로 좁힌다.
 * (2026-09-04 코디네이터가 선택자만 정정 — 단언은 원문 그대로다. 검토 요망: senior-dev)
 */
async function unitRow(n) {
  const rows = await screen.findAllByRole("link");
  const row = rows.find(
    (link) => link.getAttribute("href") === `/courses/2/units/${n}` && link.querySelector(".unit-num"),
  );
  if (!row) throw new Error(`유닛 ${n} 행이 없다`);
  return row;
}

beforeEach(() => {
  window.localStorage.clear();
});

describe("코스 상세 주 버튼 — '다음 유닛'이지 '이어서'가 아니다 (AC-R-5)", () => {
  it("1·2 완료면 주 버튼은 유닛 3으로 가고 문구에 '이어서'가 없다", async () => {
    setGuestUnitCompleted(2, 1, true);
    setGuestUnitCompleted(2, 2, true);
    renderDetail();

    const primary = await screen.findByRole("link", { name: /유닛 3/ });
    expect(primary).toHaveAttribute("href", "/courses/2/units/3");
    expect(primary.textContent).not.toMatch(/이어서/);
    // 이 화면 어디에도 "이어서"가 없다
    expect(screen.queryByText(/이어서/)).toBeNull();
  });
});

describe("유닛 행 표시 — '여기부터'는 최전선, '보던 중'은 마지막 위치 (AC-R-6)", () => {
  it("1·2 완료 후 7을 보다 나온 상태: 주 버튼 3 · 03행 '여기부터' · 07행 '보던 중' · 강조는 하나", async () => {
    setGuestUnitCompleted(2, 1, true);
    setGuestUnitCompleted(2, 2, true);
    setGuestLastPosition({ courseId: 2, unitNo: 7, stepKey: "dialog" }, new Date());
    renderDetail();

    expect(await screen.findByRole("link", { name: /유닛 3/ })).toHaveAttribute("href", "/courses/2/units/3");
    expect(within(await unitRow(3)).getByText("여기부터")).toBeInTheDocument();
    expect(within(await unitRow(7)).getByText("보던 중")).toBeInTheDocument();
    expect(screen.getAllByText("여기부터")).toHaveLength(1);
    expect(screen.getAllByText("보던 중")).toHaveLength(1);
    // 완료 표시는 그대로
    expect(within(await unitRow(2)).getByText(/완료/)).toBeInTheDocument();
  });

  it("마지막 위치가 최전선과 같으면 '여기부터'만 붙는다", async () => {
    setGuestUnitCompleted(2, 1, true);
    setGuestUnitCompleted(2, 2, true);
    setGuestLastPosition({ courseId: 2, unitNo: 3, stepKey: "dialog" }, new Date());
    renderDetail();

    // 진도는 비동기로 실린다 — 이 케이스는 앞선 대기 단언이 없으므로 여기서 기다린다(단언 자체는 그대로)
    expect(await within(await unitRow(3)).findByText("여기부터")).toBeInTheDocument();
    expect(screen.queryByText("보던 중")).toBeNull();
  });

  it("마지막 위치 유닛이 완료됐으면 '보던 중'을 붙이지 않는다 (복습은 처음부터)", async () => {
    setGuestUnitCompleted(2, 1, true);
    setGuestUnitCompleted(2, 2, true);
    setGuestLastPosition({ courseId: 2, unitNo: 2, stepKey: "summary" }, new Date());
    renderDetail();

    // 진도는 비동기로 실린다 — 앞선 대기 단언이 없으므로 여기서 기다린다(단언 자체는 그대로)
    expect(await within(await unitRow(3)).findByText("여기부터")).toBeInTheDocument();
    expect(screen.queryByText("보던 중")).toBeNull();
  });

  it("다른 코스의 마지막 위치는 이 코스에 '보던 중'을 만들지 않는다", async () => {
    setGuestUnitCompleted(2, 1, true);
    setGuestLastPosition({ courseId: 3, unitNo: 5, stepKey: "dialog" }, new Date());
    renderDetail();

    // 진도는 비동기로 실린다 — 앞선 대기 단언이 없으므로 여기서 기다린다(단언 자체는 그대로)
    expect(await within(await unitRow(2)).findByText("여기부터")).toBeInTheDocument();
    expect(screen.queryByText("보던 중")).toBeNull();
  });
});
