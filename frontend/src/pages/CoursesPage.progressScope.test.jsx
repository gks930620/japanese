// TDD Red — senior-dev 작성 (2026-11-14, qa 결함 3)
//
// ── 무엇이 문제였나 ──────────────────────────────────────────────────
// 영어만 공부한 사람이 **일본어** 코스 목록에서 "지금 코스가 너무 쉽거나 어렵나요?"(= 진도 있음 배너)를 본다.
// 같은 화면의 입문 카드는 "여기서 시작하세요"(= 진도 없음 판정)다 — **띠와 배지가 서로 다른 말을 한다.**
// `hasProgress`가 진도 문서 전체를 보는데, 배지 계산(`courseBadges`)은 **그 화면의 목록 안에서만** 판정하기 때문이다.
//
// ── 계약 (senior-dev, 작업자(AI)_문서/04 §6-1 "진도 배너 판정은 과정별이다") ──
// 한 화면의 진도 판정은 그 화면이 들고 있는 코스 목록 안에서 한다 — `hasProgressIn(progress, courses)`
// (순수 함수 계약은 `lib/progressView.scope.test.js`).
//
// ⚠️ **"마지막 위치는 사이트 전체에 하나"(01 §10-4)는 그대로다.** 홈·마이페이지의 이어보기는 두 과정 목록을
// 다 받아 영어든 일본어든 가리킨다. 여기서 다루는 것은 **한 과정만 보여주는 화면의 배너 판정**이다.
//
// **문구를 박지 않는다.** 단언은 "영어만 한 사람이 보는 띠 = 아무 진도도 없는 사람이 보는 띠"라는 **동치**다 —
// designer가 문구를 바꿔도 이 단언은 그대로 서고, 그 동치가 곧 결함의 정의다.
// 그 동치만으로는 "모든 띠를 하나로 합치기"라는 틀린 해법도 통과하므로, **일본어 진도가 있을 때는 달라야 한다**를
// 반대쪽에서 함께 고정한다.
//
// 이 테스트를 수정하지 말 것 — 계약 변경은 senior-dev 경유 (CLAUDE.md TDD 규칙 2).
import { render, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it } from "vitest";
import { apiError, apiSuccess, stubFetch } from "../test/helpers.jsx";
import { coursesFixture } from "../test/apiFixtures.js";
import { AuthProvider } from "../context/AuthContext.jsx";
import { UserDataProvider } from "../context/UserDataContext.jsx";
import { useUserData } from "../context/userDataStore.js";
import { setGuestLastPosition, setGuestUnitCompleted } from "../lib/guestStore.js";
import { CoursesPage } from "./CoursesPage.jsx";

const EN_COURSE_ID = 102; // 영어 코스 — 일본어 목록(`/api/courses`)에 절대 들어 있지 않다(04 §8)
const JA_COURSE_ID = 2;
const NOW = new Date("2026-11-14T10:00:00"); // 시각은 주입한다(컨벤션 §6 — 결정적 테스트)

/**
 * 진도가 **도착했는지**를 DOM으로 드러내는 탐침.
 *
 * 진도는 인증 판정(401) 뒤에 비동기로 온다 — 그 전에 띠를 읽으면 "진도 없음" 화면을 읽고
 * 테스트가 <b>거짓 초록</b>이 된다(이 결함의 증상이 정확히 "진도 없음 화면"이라 더 위험하다).
 */
function ProgressProbe() {
  const { ready, progress } = useUserData();
  return <i data-completed={progress.completedUnits.length} data-ready={String(ready)} />;
}

async function renderCourses() {
  stubFetch((url) => {
    if (url.includes("/api/users/me")) return apiError(401, "NOT_AUTHENTICATED");
    return apiSuccess(coursesFixture());
  });
  const { container } = render(
    <MemoryRouter initialEntries={["/courses"]}>
      <AuthProvider>
        <UserDataProvider>
          <CoursesPage />
          <ProgressProbe />
        </UserDataProvider>
      </AuthProvider>
    </MemoryRouter>,
  );
  await waitFor(() => expect(container.querySelector('[data-ready="true"]')).not.toBeNull());
  await waitFor(() => expect(container.querySelector(".courses-start-notice")).not.toBeNull());
  return container.querySelector(".courses-start-notice").textContent.replace(/\s+/g, " ").trim();
}

beforeEach(() => {
  window.localStorage.clear();
});

describe("코스 목록 안내 띠 — 진도 판정은 그 과정 안에서 (qa 결함 3)", () => {
  it("영어만 공부한 사람의 일본어 목록은 '진도 없음' 화면과 같은 띠를 본다", async () => {
    setGuestUnitCompleted(EN_COURSE_ID, 1, true);
    setGuestLastPosition({ courseId: EN_COURSE_ID, unitNo: 2, stepKey: "summary" }, NOW);
    const withEnglishOnly = await renderCourses();

    window.localStorage.clear();
    const withNothing = await renderCourses();

    expect(withEnglishOnly).toBe(withNothing);
  });

  it("일본어 진도가 있으면 띠가 달라진다 — 모든 띠를 하나로 합치는 것은 답이 아니다", async () => {
    setGuestUnitCompleted(JA_COURSE_ID, 1, true);
    setGuestLastPosition({ courseId: JA_COURSE_ID, unitNo: 2, stepKey: "summary" }, NOW);
    const withJapanese = await renderCourses();

    window.localStorage.clear();
    const withNothing = await renderCourses();

    expect(withJapanese).not.toBe(withNothing);
  });
});
