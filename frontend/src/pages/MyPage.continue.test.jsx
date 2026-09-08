import { render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { apiSuccess, stubFetch } from "../test/helpers.jsx";
import { coursesFixture, enCoursesFixture } from "../test/apiFixtures.js";
import { AuthProvider } from "../context/AuthContext.jsx";
import { UserDataProvider } from "../context/UserDataContext.jsx";
import { MyPage } from "./MyPage.jsx";

/**
 * 마이페이지 [이어서 학습하기] (2026-08-25 판정 B-H3 · B-L3 · B-L1)
 *
 * 마지막 위치는 사이트 전체에 **하나**인데(설계/04 §6-3) 영어 과정이 생기면서 그 하나에 영어 코스 id(101~105)가 들어간다.
 * 마이페이지는 그 값을 **일본어 주소에 그대로** 끼워 `/courses/101/units/1` → `404 존재하지 않는 코스입니다: 101`.
 * 진도 저장은 켜 두기로 했으므로(08 C-14) **그 기능이 만드는 상태까지 화면이 책임진다.**
 *
 * **홈은 같은 상황을 이미 옳게 처리한다** — 코스 목록에서 찾고 못 찾으면 조용히 버튼을 감춘다(`HomePage.jsx:18`).
 * 마이페이지에만 그 판정이 없다. 같은 제품이 같은 사실을 두 화면에서 다르게 대하고 있다.
 *
 * 계약:
 *   ① 마지막 위치의 코스를 **두 과정 목록**(`/api/courses` + `/api/en/courses`)에서 찾는다.
 *   ② 찾으면 **그 과정의 주소**로 잇는다 — 영어면 `/en/courses/{id}/units/{n}`.
 *   ③ 문구에 **코스 이름**을 넣는다(설계/05 §8 "진행 중인 코스" — B-L3). 홈과 같은 문장을 쓴다.
 *      영어는 레벨 괄호가 없다(설계/05 §16-2 — 코스명이 곧 단계 이름).
 *   ④ 못 찾으면(사라진 코스) 버튼도 문구도 만들지 않는다 — 홈과 같은 규칙(설계/05 §8).
 *   ⑤ 완료 유닛이 0이면 [학습 기록 초기화]를 그리지 않는다(08 C-12 ① — B-L1).
 *
 * 이 테스트를 수정하지 말 것 — 계약 변경은 senior-dev 경유.
 */

const ACCOUNT = {
  username: "gks930620",
  nickname: "한창희",
  email: "gks9306202@gmail.com",
  provider: "LOCAL",
  social: false,
  emailEditable: true,
  passwordChangeable: true,
};

function renderMyPage({ lastPosition = null, completedUnits = [] } = {}) {
  stubFetch((url) => {
    const target = String(url);
    if (target.includes("/api/me/account")) return apiSuccess(ACCOUNT);
    if (target.includes("/api/users/me")) return apiSuccess({ id: 3, username: "gks930620", nickname: "한창희" });
    if (target.includes("/api/progress")) return apiSuccess({ completedUnits, lastPosition });
    if (target.includes("/api/en/courses")) return apiSuccess(enCoursesFixture());
    if (target.includes("/api/courses")) return apiSuccess(coursesFixture());
    if (target.includes("/api/bookmarks")) return apiSuccess({ kanji: [], grammar: [], vocabulary: [] });
    return apiSuccess(null);
  });
  render(
    <MemoryRouter initialEntries={["/mypage"]}>
      <AuthProvider>
        <UserDataProvider>
          <Routes>
            <Route element={<MyPage />} path="/mypage" />
          </Routes>
        </UserDataProvider>
      </AuthProvider>
    </MemoryRouter>,
  );
}

const resumeLink = () => screen.queryByRole("link", { name: "이어서 학습하기" });

describe("영어 진도에서 이어서 학습하기 (B-H3)", () => {
  it("영어 코스는 영어 주소로 잇는다 — 일본어 주소가 아니다", async () => {
    // 이 테스트가 보는 것은 **주소의 과정**이다. 보던 유닛을 완료로 두면 2026-09 결정 D-2에 따라
    // "그 뒤 유닛"으로 가버려 검증 대상이 흐려진다 — 미완료로 두어 마지막 위치 그대로를 본다.
    renderMyPage({ lastPosition: { courseId: 101, unitNo: 1, stepKey: "vocab" }, completedUnits: [] });

    await waitFor(() => expect(resumeLink()).toBeInTheDocument());
    expect(resumeLink()).toHaveAttribute("href", "/en/courses/101/units/1");
  });

  it("일본어 코스는 지금과 같다 (회귀)", async () => {
    renderMyPage({ lastPosition: { courseId: 4, unitNo: 7, stepKey: "grammar-0" }, completedUnits: [{ courseId: 4, unitNo: 6 }] });

    await waitFor(() => expect(resumeLink()).toBeInTheDocument());
    expect(resumeLink()).toHaveAttribute("href", "/courses/4/units/7");
  });

  it("사라진 코스면 버튼을 만들지 않는다 — 홈과 같은 규칙(설계/05 §8)", async () => {
    renderMyPage({ lastPosition: { courseId: 999, unitNo: 3, stepKey: "vocab" } });

    await waitFor(() => expect(screen.getByRole("heading", { name: "내 학습" })).toBeInTheDocument());
    expect(resumeLink()).not.toBeInTheDocument();
    expect(screen.queryByText(/학습 중이었어요/)).not.toBeInTheDocument();
  });
});

describe("내 학습 카드의 문구 (B-L3)", () => {
  it("코스 이름이 들어간다 — '유닛 1'만으로는 어디였는지 알 수 없다", async () => {
    renderMyPage({ lastPosition: { courseId: 4, unitNo: 7, stepKey: "vocab" } });

    await waitFor(() => expect(screen.getByText(/중급\(JLPT N3\) 코스 · 유닛 7 학습 중이었어요/)).toBeInTheDocument());
  });

  it("영어 코스는 레벨 괄호 없이 코스명만 쓴다 (설계/05 §16-2)", async () => {
    renderMyPage({ lastPosition: { courseId: 101, unitNo: 2, stepKey: "vocab" } });

    await waitFor(() => expect(screen.getByText(/다시 세우기 코스 · 유닛 2 학습 중이었어요/)).toBeInTheDocument());
    expect(screen.queryByText(/E1/)).not.toBeInTheDocument();
  });
});

describe("학습 기록이 0일 때 (B-L1)", () => {
  it("[학습 기록 초기화]를 그리지 않는다 — 지울 것이 없다", async () => {
    renderMyPage({ completedUnits: [] });

    await waitFor(() => expect(screen.getByText("아직 학습 기록이 없어요")).toBeInTheDocument());
    expect(screen.queryByRole("button", { name: "학습 기록 초기화" })).not.toBeInTheDocument();
  });

  it("기록이 있으면 그대로 있다 (회귀)", async () => {
    renderMyPage({ completedUnits: [{ courseId: 2, unitNo: 1 }, { courseId: 2, unitNo: 2 }] });

    await waitFor(() => expect(screen.getByText("완료한 유닛 2개")).toBeInTheDocument());
    expect(screen.getByRole("button", { name: "학습 기록 초기화" })).toBeInTheDocument();
  });
});
