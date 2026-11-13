// TDD Red — senior-dev 작성 (2026-11-14, qa 결함 1·2)
//
// ── 무엇이 문제였나 ──────────────────────────────────────────────────
// E2(계획 20 중 일부 공개) 코스 상세의 **한 화면 안에서** 두 말이 갈렸다:
//   ✎ "앞 유닛부터 순서대로 채우는 중이에요"   (course.notice — 사람이 쓴 문구)
//   ✓ "이 코스를 완주했어요" + [처음부터 다시 보기]  (ctaState — summary.unitCount만 보고 판정)
//   진도 막대 5 / 5 = 100%                     (분모가 열린 유닛 수)
// 응답에 계획 수가 없어 화면이 판정할 재료가 없었다.
//
// ── 계약 (senior-dev, 작업자(AI)_문서/04 §2-3-B · §6-1) ───────────────
// 코스 상세 응답 루트에 `plannedUnitCount`가 실린다(null = 계획 없음 = 지금 있는 유닛이 전부).
//   · moreUnitsComing(summary.unitCount, plannedUnitCount) 이면 **완주를 주장하지 않는다**
//   · 진도 막대의 분모는 courseUnitTotal(course) = plannedUnitCount ?? unitCount
//   · 판정식은 lib/progressView.js 한 곳 — 이 화면이 다시 쓰지 않는다(progressView.plannedUnits.test.js)
//
// **문구는 고정하지 않는다.** 이 파일이 고정하는 것은 ① 완주 주장 금지 ② 분모 ③ 주 버튼은 여전히 하나(05 §3-2)다.
// 어떤 말을 대신 둘지는 planner·designer의 것이다.
//
// 이 테스트를 수정하지 말 것 — 계약 변경은 senior-dev 경유 (CLAUDE.md TDD 규칙 2).
import { render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { beforeEach, describe, expect, it } from "vitest";
import { apiError, apiSuccess, stubFetch } from "../test/helpers.jsx";
import { AsyncProbe } from "../test/AsyncProbe.jsx";
import { USER_DATA_TIMEOUT, waitForGuestProgress } from "../test/userDataWait.js";
import { AuthProvider } from "../context/AuthContext.jsx";
import { UserDataProvider } from "../context/UserDataContext.jsx";
import { setGuestUnitCompleted } from "../lib/guestStore.js";
import { CourseDetailPage } from "./CourseDetailPage.jsx";

const PARTLY_PUBLISHED_ID = 102;
const OPEN_UNITS = 5;
const PLANNED_UNITS = 20;

/** GET /api/en/courses/102 — 열린 5 / 계획 20 (2026-11-14 실제 상태) */
function partlyPublishedDetail(overrides = {}) {
  return {
    id: PARTLY_PUBLISHED_ID,
    courseNo: 2,
    levelCode: "E2",
    levelLabel: "E2",
    title: "일상 말하기",
    targetAudience: "대상",
    goal: "도달점",
    notice: "앞 유닛부터 순서대로 채우는 중이에요 — 열려 있는 유닛까지는 지금 그대로 학습하면 됩니다",
    description: "소개",
    status: "AVAILABLE",
    plannedUnitCount: PLANNED_UNITS,
    summary: { unitCount: OPEN_UNITS, grammarCount: 15, expressionCount: 35, vocabCount: 80 },
    units: Array.from({ length: OPEN_UNITS }, (_, i) => ({
      unitNo: i + 1,
      title: `유닛 ${i + 1}`,
      grammarCount: 3,
      expressionCount: 7,
      vocabCount: 16,
    })),
    ...overrides,
  };
}

/** GET /api/courses/2 — 계획을 선언한 적 없는 일본어 코스(회귀 방어선) */
function japaneseDetail() {
  return {
    id: 2,
    courseNo: 1,
    levelCode: "N5",
    levelLabel: "JLPT N5",
    title: "왕초보",
    targetAudience: "대상",
    goal: "도달점",
    notice: null,
    description: "소개",
    status: "AVAILABLE",
    plannedUnitCount: null,
    summary: { unitCount: 2, grammarCount: 4, kanjiCount: 10, vocabCount: 30 },
    units: [
      { unitNo: 1, title: "유닛 1", grammarCount: 2, kanjiCount: 5, vocabCount: 15 },
      { unitNo: 2, title: "유닛 2", grammarCount: 2, kanjiCount: 5, vocabCount: 15 },
    ],
  };
}

// 진도 도착 탐침은 `test/AsyncProbe.jsx`로 옮겼다 — 같은 탐침을 파일마다 다시 쓰면 조용히 갈린다(08 E-4).
async function renderDetail(payload, { lang = "en" } = {}) {
  const base = lang === "en" ? "/en/courses" : "/courses";
  stubFetch((url) => {
    if (url.includes("/api/users/me")) return apiError(401, "NOT_AUTHENTICATED");
    if (url.includes("/courses/")) return apiSuccess(payload);
    return apiSuccess([]);
  });
  const { container } = render(
    <MemoryRouter initialEntries={[`${base}/${payload.id}`]}>
      <AuthProvider>
        <UserDataProvider>
          <Routes>
            <Route element={<CourseDetailPage lang={lang} />} path={`${base}/:courseId`} />
          </Routes>
          <AsyncProbe />
        </UserDataProvider>
      </AuthProvider>
    </MemoryRouter>,
  );
  // 심어 둔 완료 유닛이 **그대로** 화면에 실릴 때까지 기다린다(거짓 통과·거짓 실패 양쪽을 막는다)
  await waitForGuestProgress({ container });
  // 진도가 반영된 화면인지까지 확인한다 — 진도 막대는 완료 유닛이 있을 때만 그려진다(05 §8)
  await waitFor(() => expect(container.querySelector(".statusbar-progress")).not.toBeNull(), {
    timeout: USER_DATA_TIMEOUT,
  });
}

/** 그 코스의 유닛 1~n을 마친 상태로 둔다(게스트 저장소 = 회원과 같은 계산 — 작업자(AI)_문서/04 §6-3) */
function completeUnits(courseId, count) {
  for (let unitNo = 1; unitNo <= count; unitNo += 1) setGuestUnitCompleted(courseId, unitNo, true);
}

beforeEach(() => {
  window.localStorage.clear();
});

describe("코스 상세 — 부분 공개 코스는 완주가 아니다 (qa 결함 1)", () => {
  it("열린 유닛을 다 마쳐도 완주를 주장하지 않는다", async () => {
    completeUnits(PARTLY_PUBLISHED_ID, OPEN_UNITS);
    await renderDetail(partlyPublishedDetail());

    await screen.findByRole("heading", { name: "일상 말하기" });
    expect(screen.queryAllByText(/완주/)).toHaveLength(0);
    expect(screen.queryAllByText(/끝까지/)).toHaveLength(0);
  });

  it("✎ 안내와 CTA가 같은 말을 한다 — '채우는 중' 아래에 '완주'가 서지 않는다", async () => {
    completeUnits(PARTLY_PUBLISHED_ID, OPEN_UNITS);
    await renderDetail(partlyPublishedDetail());

    await screen.findByText(/채우는 중이에요/);
    const note = document.querySelector(".cta-note");
    if (note) expect(note.textContent).not.toMatch(/완주|끝까지|다 봤/);
  });

  it("주 버튼은 여전히 하나다 — 말이 바뀌어도 화면 구조는 그대로다 (05 §3-2)", async () => {
    completeUnits(PARTLY_PUBLISHED_ID, OPEN_UNITS);
    await renderDetail(partlyPublishedDetail());

    await screen.findByRole("heading", { name: "일상 말하기" });
    expect(document.querySelectorAll(".course-cta-row a")).toHaveLength(1);
  });

  it("계획을 채운 코스는 지금 그대로 완주라고 말한다 — 개수가 같아지는 순간 저절로 넘어간다", async () => {
    completeUnits(PARTLY_PUBLISHED_ID, OPEN_UNITS);
    // notice도 함께 비운다 — 계획을 채운 코스는 안내 문구를 남기지 않는 것이 계약이다(04 §2-3-A · 06 §11-12 ③ R4)
    await renderDetail(partlyPublishedDetail({ plannedUnitCount: OPEN_UNITS, notice: null }));

    await screen.findByRole("heading", { name: "일상 말하기" });
    expect(document.querySelector(".cta-note").textContent).toMatch(/완주/);
  });

  it("계획이 없는 코스(일본어)는 한 줄도 바뀌지 않는다 — 회귀 방어선", async () => {
    completeUnits(2, 2);
    await renderDetail(japaneseDetail(), { lang: "ja" });

    await screen.findByRole("heading", { name: /왕초보/ });
    expect(document.querySelector(".cta-note").textContent).toMatch(/완주/);
  });
});

describe("코스 상세 — 진도 막대의 분모는 계획 수다 (qa 결함 2 · 작업자(AI)_문서/04 §6-1)", () => {
  it("열린 5유닛을 다 마쳐도 100%가 아니다 — 20 중 5다", async () => {
    completeUnits(PARTLY_PUBLISHED_ID, OPEN_UNITS);
    await renderDetail(partlyPublishedDetail());

    await screen.findByRole("heading", { name: "일상 말하기" });
    const fill = document.querySelector(".statusbar-progress .progress-fill");
    expect(fill, "진도 막대가 없다").not.toBeNull();
    expect(fill.style.width).toBe(`${(OPEN_UNITS / PLANNED_UNITS) * 100}%`);
    // 숫자 라벨도 같은 분모를 읽는다 — 막대와 라벨이 다른 말을 하면 결함이 자리만 옮긴 것이다
    expect(document.querySelector(".statusbar-progress .progress-label").textContent)
      .toMatch(new RegExp(`\\b${PLANNED_UNITS}\\b`));
  });

  it("계획이 없는 코스는 열린 유닛 수가 분모다 — 일본어는 지금과 같다", async () => {
    completeUnits(2, 2);
    await renderDetail(japaneseDetail(), { lang: "ja" });

    await screen.findByRole("heading", { name: /왕초보/ });
    expect(document.querySelector(".statusbar-progress .progress-fill").style.width).toBe("100%");
  });
});
