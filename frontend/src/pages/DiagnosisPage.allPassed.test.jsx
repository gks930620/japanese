import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { describe, expect, it } from "vitest";
import { apiError, apiSuccess, stubFetch } from "../test/helpers.jsx";
import { coursesFixture, libraryPageFixture } from "../test/apiFixtures.js";
import { DiagnosisPage } from "./DiagnosisPage.jsx";

/**
 * 진단 결과의 "그 위 코스" 안내 — **오지 않을 약속을 하지 않는다** (2026-08-25 판정 M4)
 *
 * 지금 화면은 `verdict.allPassed`만 보고 "그 위 코스는 지금 준비하고 있어요."를 그린다.
 * N1이 열리기 전에는 참이었지만 N1은 **JLPT 최상위이자 마지막 코스**다 —
 * 그 위에는 코스가 없고, 준비 중인 것도 없다. 5단계를 전부 통과한 사람에게만 보이는 문구가
 * 하필 **사실이 아닌 약속**이다.
 *
 * 판정: 이 안내는 **실제로 PREPARING 코스가 있을 때만** 그린다. 없으면 아무 말도 하지 않는다
 * (없는 것을 사과하지 않는다 — J-1·M2와 같은 원칙의 반대편: 없는 것을 약속하지도 않는다).
 *
 * 이 테스트를 수정하지 말 것 — 계약 변경은 senior-dev 경유.
 */

const ITEM_COUNT = 6;
const VOCAB = Array.from({ length: ITEM_COUNT }, (_, i) => ({
  id: 100 + i, word: `単語${i}`, kana: `たんご${i}`, meaningKo: `뜻${i}`, partOfSpeech: "NOUN",
}));
const KANJI = Array.from({ length: ITEM_COUNT }, (_, i) => ({
  id: 200 + i, letter: `字${i}`, onyomi: `オン${i}`, kunyomi: null, meaningKo: `훈음${i}`, words: [],
}));
const GRAMMAR = Array.from({ length: ITEM_COUNT }, (_, i) => ({
  id: 300 + i, name: `〜文法${i}`, nameKo: `문법뜻${i}`, explanation: "설명", examples: [], rules: [],
}));

function renderPage(courses) {
  stubFetch((url) => {
    if (url.includes("/api/users/me")) return apiError(401, "NOT_AUTHENTICATED");
    if (url.includes("/api/courses")) return apiSuccess(courses);
    if (url.includes("/api/library/kanji")) return apiSuccess(libraryPageFixture(KANJI));
    if (url.includes("/api/library/grammar")) return apiSuccess(libraryPageFixture(GRAMMAR));
    if (url.includes("/api/library/vocabulary")) return apiSuccess(libraryPageFixture(VOCAB));
    return apiSuccess(null);
  });
  render(
    <MemoryRouter initialEntries={["/diagnosis"]}>
      <Routes>
        <Route element={<DiagnosisPage />} path="/diagnosis" />
      </Routes>
    </MemoryRouter>,
  );
}

/**
 * 전 단계를 **정답으로** 통과시킨다.
 * 픽스처의 항목은 전부 같은 번호로 짝지어져 있다(単語3 ↔ 뜻3 ↔ たんご3, 字3 ↔ 훈음3/オン3, 〜文法3 ↔ 문법뜻3).
 * 그래서 문제 지문의 번호와 같은 번호를 가진 보기가 정답이다 — 무작위 출제에도 흔들리지 않는다.
 */
async function passEveryStage(user) {
  for (let i = 0; i < 30; i++) {
    if (screen.queryByText(/부터 시작하세요/)) return;
    const prompt = document.querySelector(".quiz-prompt");
    const n = String(prompt.textContent).match(/\d+/)[0];
    const choices = await screen.findAllByRole("button", { name: /보기/ });
    const correct = choices.find((btn) => new RegExp(`${n}$`).test(btn.getAttribute("aria-label")));
    await user.click(correct ?? choices[0]);
  }
  await screen.findByText(/부터 시작하세요/);
}

describe("전체 통과 안내 (M4)", () => {
  it("준비중 코스가 하나도 없으면 '그 위 코스는 준비 중' 안내를 하지 않는다", async () => {
    const courses = coursesFixture(); // 실제 상태 — 6개 전부 AVAILABLE, N1이 마지막이다
    expect(courses.every((course) => course.status === "AVAILABLE")).toBe(true);

    renderPage(courses);
    const user = userEvent.setup();
    await user.click(await screen.findByRole("button", { name: "시작하기" }));
    await passEveryStage(user);

    // 전 단계를 통과했다 = 가장 높은 코스(N1)를 추천받은 상태
    expect(screen.getByRole("link", { name: /고급\(JLPT N1\) 코스 시작하기/ })).toBeInTheDocument();
    expect(screen.queryByText(/준비하고 있어요/)).not.toBeInTheDocument();
  });

  it("정말로 준비중인 코스가 있으면 그때는 안내한다", async () => {
    // N1만 준비중으로 되돌린다 — 계단은 N5~N2 네 단계가 되고, 그 위(N1)는 실제로 준비 중이다
    const courses = coursesFixture().map((course) =>
      course.courseNo === 5 ? { ...course, status: "PREPARING", unitCount: 0 } : course,
    );

    renderPage(courses);
    const user = userEvent.setup();
    await user.click(await screen.findByRole("button", { name: "시작하기" }));
    await passEveryStage(user);

    expect(await screen.findByText(/준비하고 있어요/)).toBeInTheDocument();
  });
});
