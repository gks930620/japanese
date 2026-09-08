// TDD Red — senior-dev 작성 (2026-09-03 결정 `진행사항/결정_2026-09_이어서_확인문제.md` §1 · AC-R-1·3·4·7)
//
// 같은 진도에 대해 홈 히어로와 마이페이지의 [이어서 학습하기]는 **같은 주소·같은 뜻의 문장**이어야 한다.
// 그리고 건너뛰기 없이 순서대로 가는 사용자에게는 홈의 "이어서"와 코스 상세의 "다음 유닛"이 **같은 유닛**이다.
// 사용자관점 점검 D-2는 홈(마지막 위치)과 코스 상세(미완료 최전선)가 같은 말로 다른 곳을 가리키던 결함이었다.
//
// 이 테스트를 수정하지 말 것 — 계약 변경은 senior-dev 경유 (CLAUDE.md TDD 규칙 2).
import { render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { describe, expect, it } from "vitest";
import { apiSuccess, stubFetch } from "../test/helpers.jsx";
import { coursesFixture, enCoursesFixture } from "../test/apiFixtures.js";
import { AuthProvider } from "../context/AuthContext.jsx";
import { UserDataProvider } from "../context/UserDataContext.jsx";
import { HomePage } from "./HomePage.jsx";
import { MyPage } from "./MyPage.jsx";
import { CourseDetailPage } from "./CourseDetailPage.jsx";

const ACCOUNT = { username: "gks930620", nickname: "한창희", email: "a@b.c", provider: "LOCAL", social: false, emailEditable: true, passwordChangeable: true };
const done = (courseId, ...unitNos) => unitNos.map((unitNo) => ({ courseId, unitNo }));

function courseDetail(unitCount = 20) {
  return {
    id: 2, courseNo: 1, levelLabel: "JLPT N5", levelCode: "N5", title: "왕초보", targetAudience: "", goal: "", notice: null,
    description: "소개", status: "AVAILABLE",
    summary: { unitCount, grammarCount: 40, kanjiCount: 100, vocabCount: 300 },
    units: Array.from({ length: unitCount }, (_, i) => ({ unitNo: i + 1, title: `유닛 ${i + 1}`, grammarCount: 2, kanjiCount: 5, vocabCount: 15 })),
  };
}

/** 회원 상태로 progress를 서버에서 준다 — 세 화면이 같은 진도를 본다 */
function stubAll(progress) {
  stubFetch((url) => {
    const target = String(url);
    if (target.includes("/api/me/account")) return apiSuccess(ACCOUNT);
    if (target.includes("/api/users/me")) return apiSuccess({ id: 3, username: "gks930620", nickname: "한창희" });
    if (target.includes("/api/progress")) return apiSuccess(progress);
    if (target.includes("/api/en/courses")) return apiSuccess(enCoursesFixture());
    if (/\/api\/courses\/\d+$/.test(target)) return apiSuccess(courseDetail());
    if (target.includes("/api/courses")) return apiSuccess(coursesFixture());
    if (target.includes("/api/bookmarks")) return apiSuccess({ kanji: [], grammar: [], vocabulary: [] });
    return apiSuccess(null);
  });
}

function renderAt(route, element, path) {
  return render(
    <MemoryRouter initialEntries={[route]}>
      <AuthProvider>
        <UserDataProvider>
          <Routes>
            <Route element={element} path={path} />
          </Routes>
        </UserDataProvider>
      </AuthProvider>
    </MemoryRouter>,
  );
}

async function homeCta() {
  // 히어로의 유일한 CTA — 문구는 상태마다 다르므로 href로 본다
  const link = await screen.findByRole("link", { name: /이어서 학습하기|다음 코스|코스 목록 보기|학습 시작하기/ });
  return link;
}

describe("홈과 마이페이지의 [이어서 학습하기]는 같은 곳으로 간다 (AC-R-1)", () => {
  it("보던 유닛을 마쳤으면 둘 다 그 뒤 첫 미완료 유닛(4)을 가리키고 문장이 목적지를 명시한다 (AC-R-3)", async () => {
    const progress = { completedUnits: done(2, 1, 2, 3), lastPosition: { courseId: 2, unitNo: 2, stepKey: "summary", updatedAt: "2026-09-01T00:00:00" } };

    stubAll(progress);
    const home = renderAt("/", <HomePage />, "/");
    const homeLink = await homeCta();
    expect(homeLink).toHaveAttribute("href", "/courses/2/units/4");
    expect(homeLink).toHaveTextContent("이어서 학습하기");
    expect(await screen.findByText(/다음은 유닛 4/)).toBeInTheDocument();
    home.unmount();

    stubAll(progress);
    renderAt("/mypage", <MyPage />, "/mypage");
    const myLink = await screen.findByRole("link", { name: "이어서 학습하기" });
    expect(myLink).toHaveAttribute("href", "/courses/2/units/4");
    expect(screen.getByText(/다음은 유닛 4/)).toBeInTheDocument();
  });

  it("코스를 완주했으면 둘 다 다음 코스 상세로 — 버튼에 '이어서'가 없다 (AC-R-4)", async () => {
    const all = Array.from({ length: 10 }, (_, i) => i + 1);
    const progress = { completedUnits: done(1, ...all), lastPosition: { courseId: 1, unitNo: 10, stepKey: "summary", updatedAt: "2026-09-01T00:00:00" } };

    stubAll(progress);
    const home = renderAt("/", <HomePage />, "/");
    const homeLink = await screen.findByRole("link", { name: /다음 코스.*왕초보/ });
    expect(homeLink).toHaveAttribute("href", "/courses/2");
    expect(screen.queryByRole("link", { name: /이어서 학습하기/ })).toBeNull();
    // 코스 카드 배지도 "✓ 완주"라 화면 전체로는 둘이다 — 히어로 문장으로 좁힌다(단언 의도 그대로)
    expect(document.querySelector(".hero-resume").textContent).toMatch(/완주/);
    home.unmount();

    stubAll(progress);
    renderAt("/mypage", <MyPage />, "/mypage");
    const myLink = await screen.findByRole("link", { name: /다음 코스.*왕초보/ });
    expect(myLink).toHaveAttribute("href", "/courses/2");
    expect(screen.queryByRole("link", { name: /이어서 학습하기/ })).toBeNull();
  });
});

describe("순서대로 가는 사용자에게 '이어서'와 '다음 유닛'은 같은 유닛이다 (AC-R-7)", () => {
  it("1·2 완료, 3을 보던 중 → 홈 [이어서 학습하기]와 코스 상세 주 버튼이 둘 다 유닛 3", async () => {
    const progress = { completedUnits: done(2, 1, 2), lastPosition: { courseId: 2, unitNo: 3, stepKey: "dialog", updatedAt: "2026-09-01T00:00:00" } };

    stubAll(progress);
    const home = renderAt("/", <HomePage />, "/");
    expect(await homeCta()).toHaveAttribute("href", "/courses/2/units/3");
    home.unmount();

    stubAll(progress);
    renderAt("/courses/2", <CourseDetailPage />, "/courses/:courseId");
    const primary = await screen.findByRole("link", { name: /유닛 3 학습하기/ });
    expect(primary).toHaveAttribute("href", "/courses/2/units/3");
  });
});
