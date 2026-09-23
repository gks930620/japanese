// frontend-dev 작성 — 진단 배너 위치·분기(화면정의서 판정 B). 선작성 테스트가 덮지 않는 부분.
// senior-dev 보강 2026-09-23 (Red) — 유입 배너 **문구 금지 규칙**: 기획 §19-2-D의 AC-4·AC-5·AC-7·AC-9 / 설계/05 §15-2.
import { render as rtlRender, screen, waitFor } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { beforeEach, describe, expect, it } from "vitest";
import { apiError, apiSuccess, stubFetch } from "../test/helpers.jsx";
import { AuthProvider } from "../context/AuthContext.jsx";
import { UserDataProvider } from "../context/UserDataContext.jsx";
import { setGuestUnitCompleted, setGuestLastPosition } from "../lib/guestStore.js";
import { HomePage } from "./HomePage.jsx";
import { CoursesPage } from "./CoursesPage.jsx";

/**
 * ★ 이 파일이 고정하는 것은 **문구가 아니라 금지와 구조**다.
 *
 * 확정 문구 전문을 단언에 박으면 다음 문구 수정마다 테스트가 깨진다(기획 §19-2-E).
 * 그래서 ① 배너가 **말하면 안 되는 것**(총량·자동 진행)과 ② **구조**(버튼 라벨·목적지·띠 하나)만 본다.
 * 진단 시작 화면에만 걸려 있던 `/3분/` 금지(`DiagnosisPage.levels.test.jsx`)를 **유입 배너 세 곳까지 넓힌 것**이 이 보강의 핵심이다 —
 * 규칙이 방 안에서만 지켜지고 문간에서 새던 자리다.
 *
 * ⚠️ **검사 범위는 배너 요소다.** `document.body`로 훑으면 홈 본문의
 * *"입문 코스에는 한자가 없어 다섯 단계로 진행돼요"* — 진단과 무관한 정당한 문장 — 이 `/단계/`에 걸려 엉뚱하게 빨개진다.
 *
 * ⚠️ **배너를 문구로 찾지 않는다.** [내 시작점 찾기]를 담은 `.k-alert`가 배너다(사라질 낱말로 배너를 찾으면 문구가 바뀔 때 테스트가 먼저 죽는다).
 *
 * DOM 계약: 진단 배너 = `.k-alert` + 안쪽에 `<a>내 시작점 찾기</a>`(→ `/diagnosis`) ·
 * 코스 목록의 상단 안내 띠 = `.courses-start-notice`(세 상태 통틀어 **언제나 하나**).
 *
 * 이 테스트를 수정하지 말 것 — 계약 변경은 senior-dev 경유.
 */

const COURSES = [
  { id: 2, courseNo: 1, levelLabel: "JLPT N5", title: "왕초보", status: "AVAILABLE", unitCount: 2 },
  { id: 3, courseNo: 2, levelLabel: "JLPT N4", title: "초급", status: "AVAILABLE", unitCount: 2 },
];

/** AC-4 — 총량(시간·판 수·문항 수)을 약속하지 않는다. 몇 판을 칠지는 사용자가 정하므로 화면이 약속할 총량이 없다(09 §3-1) */
const TOTAL_PROMISE = [/\d\s*(분|초|문항|문제|단계|판)/, /최대/];
/** AC-5 — 자동 진행을 암시하지 않는다. 진단은 한 판을 치고 결과에서 멈춘다(기획 D10) */
const AUTO_PROGRESS = [/차례대로/, /순서대로 올라/, /끝까지/, /계속 올라/];

function renderPage(element, path) {
  stubFetch((url) => {
    if (url.includes("/api/users/me")) return apiError(401, "NOT_AUTHENTICATED");
    if (url.includes("/api/courses")) return apiSuccess(COURSES);
    return apiSuccess(null);
  });
  rtlRender(
    <MemoryRouter initialEntries={[path]}>
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

/** 진단 배너 = [내 시작점 찾기]를 담은 안내 띠. **문구가 아니라 구조로** 찾는다 */
function diagnosisBanner() {
  const link = screen.getByRole("link", { name: "내 시작점 찾기" });
  const banner = link.closest(".k-alert");
  expect(banner).not.toBeNull();
  return banner;
}

/** 배너 **안쪽** 텍스트만 읽는다 — 범위를 넓히면 배너 밖 정당한 문장이 금지 규칙에 걸린다 */
const bannerText = () => diagnosisBanner().textContent.replace(/\s+/g, " ").trim();

/** 코스 목록 상단 안내 띠 — 세 상태(진도 없음 / 진도 있음 / 전부 완주)를 통틀어 하나뿐이어야 한다(05 §8) */
const startNotices = () => document.querySelectorAll(".courses-start-notice");

/**
 * 띠가 **하나** 서고 그 내용이 조건을 만족할 때까지 기다린다.
 *
 * 코스 목록과 진도는 따로 도착해 **중간 상태**(진도가 아직 없는 것처럼 보이는 한 프레임)가 잠깐 지나간다.
 * 링크 하나만 기다리면 세 상태의 띠가 모두 같은 링크를 갖고 있어 **엉뚱한 상태를 붙잡는다**(플레이키).
 * 그래서 "띠는 하나"(AC-9)와 상태 판별을 **한 번에** 기다린다.
 */
async function waitForSingleNotice(check) {
  await waitFor(() => {
    const notices = startNotices();
    expect(notices).toHaveLength(1);
    check(notices[0]);
  });
}

/** AC-4 + AC-5 — 배너가 약속해서는 안 되는 것 */
function expectPromisesNothing(text) {
  for (const pattern of TOTAL_PROMISE) expect(text).not.toMatch(pattern);
  for (const pattern of AUTO_PROGRESS) expect(text).not.toMatch(pattern);
}

beforeEach(() => {
  window.localStorage.clear();
});

describe("홈 배너 (판정 B — 히어로 바로 아래, 항상 노출)", () => {
  it("[내 시작점 찾기]가 /diagnosis로 간다", async () => {
    renderPage(<HomePage />, "/");

    expect(await screen.findByRole("link", { name: "내 시작점 찾기" })).toHaveAttribute("href", "/diagnosis");
  });

  it("총량도 자동 진행도 약속하지 않는다 (AC-4 · AC-5)", async () => {
    renderPage(<HomePage />, "/");
    await screen.findByRole("link", { name: "내 시작점 찾기" });

    expectPromisesNothing(bannerText());
  });

  it("검사 범위는 배너 요소다 — 배너 밖 본문의 '단계'는 보지 않는다", async () => {
    renderPage(<HomePage />, "/");
    await screen.findByRole("link", { name: "내 시작점 찾기" });

    // 홈 본문에는 진단과 무관한 "다섯 단계로 진행돼요"가 있다. 배너 검사를 document.body로 넓히면 여기에 걸린다.
    const outside = document.body.textContent.replace(diagnosisBanner().textContent, "");
    expect(outside).toMatch(/단계/);
    expect(bannerText()).not.toMatch(/단계/);
  });
});

describe("코스 목록 배너 (기존 시작 안내 띠에 병합)", () => {
  it("진도 없음 — 기본값 문구와 병기된다", async () => {
    renderPage(<CoursesPage />, "/courses");

    await waitFor(() => expect(screen.getByText(/처음이면/)).toBeInTheDocument());
    expect(screen.getByRole("link", { name: "내 시작점 찾기" })).toHaveAttribute("href", "/diagnosis");
  });

  it("진도 없음 — 띠는 하나뿐이고, 총량도 자동 진행도 약속하지 않는다 (AC-4 · AC-5 · AC-9)", async () => {
    renderPage(<CoursesPage />, "/courses");
    await waitForSingleNotice((notice) => expect(notice.textContent).toMatch(/처음이면/));

    expectPromisesNothing(bannerText());
  });

  it("진도 있음 — 진도 없음 띠가 사라지고 링크는 유지된다", async () => {
    setGuestUnitCompleted(2, 1, true);
    setGuestLastPosition({ courseId: 2, unitNo: 2, stepKey: "kanji" }, new Date());
    renderPage(<CoursesPage />, "/courses");

    // 분기는 **문구가 아니라 구조**로 가려낸다 — 진도 있음 띠에는 앞절("처음이면")이 없고 [내 시작점 찾기]가 있다
    await waitForSingleNotice((notice) => expect(notice.textContent).not.toMatch(/처음이면/));
    expect(screen.getByRole("link", { name: "내 시작점 찾기" })).toHaveAttribute("href", "/diagnosis");
  });

  it("진도 있음 — 띠는 하나뿐이고, 총량도 자동 진행도 약속하지 않는다 (AC-4 · AC-5 · AC-9)", async () => {
    setGuestUnitCompleted(2, 1, true);
    setGuestLastPosition({ courseId: 2, unitNo: 2, stepKey: "kanji" }, new Date());
    renderPage(<CoursesPage />, "/courses");
    await waitForSingleNotice((notice) => expect(notice.textContent).not.toMatch(/처음이면/));

    expectPromisesNothing(bannerText());
  });

  it("전부 완주 — 진단 배너를 생략하고 완주 띠만 보인다", async () => {
    setGuestUnitCompleted(2, 1, true);
    setGuestUnitCompleted(2, 2, true);
    setGuestUnitCompleted(3, 1, true);
    setGuestUnitCompleted(3, 2, true);
    renderPage(<CoursesPage />, "/courses");

    await waitFor(() => expect(screen.getByText(/모두 마쳤어요/)).toBeInTheDocument());
    expect(screen.queryByRole("link", { name: "내 시작점 찾기" })).not.toBeInTheDocument();
  });

  it("전부 완주 — 남는 띠 하나에는 진단으로 가는 문이 없다 (AC-8 · AC-9)", async () => {
    setGuestUnitCompleted(2, 1, true);
    setGuestUnitCompleted(2, 2, true);
    setGuestUnitCompleted(3, 1, true);
    setGuestUnitCompleted(3, 2, true);
    renderPage(<CoursesPage />, "/courses");

    // 완주 띠는 링크가 없다는 것으로 가려낸다 — 문구가 아니라 구조다
    await waitForSingleNotice((notice) => expect(notice.querySelector("a")).toBeNull());
    expect(screen.queryByRole("link", { name: "내 시작점 찾기" })).not.toBeInTheDocument();
  });
});
