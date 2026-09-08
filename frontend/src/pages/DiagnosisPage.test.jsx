import { render as rtlRender, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { describe, expect, it } from "vitest";
import { apiError, apiSuccess, stubFetch } from "../test/helpers.jsx";
import { DiagnosisPage } from "./DiagnosisPage.jsx";
import { coursesFixture, libraryPageFixture } from "../test/apiFixtures.js";
import { stagePlan } from "../lib/diagnosis.js";

/**
 * 실력 진단 화면 (설계/05 §15-2 · 기획 P2·P6·P7·P8·P11·P13 — TDD Red, senior-dev 작성)
 *
 * 계단 진행·추천 판정은 lib/diagnosis 테스트가 고정한다. 이 파일은 화면 동작만 본다 —
 * 특히 **진단 중 정오 미표시(P6)**: 문제 데이터에 정답이 있으므로 "보여주지 않는 것"이 화면 계약이다.
 *
 * 이 테스트를 수정하지 말 것 — 계약 변경은 senior-dev 경유.
 */

// ★ 픽스처는 실제 응답 shape에서 온다(설계/08 C-9) — levelLabel은 "JLPT N5"다.
// 픽스처는 실제 코스 상태다(08 C-9) — 입문은 계단에서 빠지므로 stagePlan으로 계단 길이를 구한다
const COURSES = coursesFixture().filter((c) => c.status === "AVAILABLE");
const STAGE_COUNT = stagePlan(COURSES).length;

const libraryPage = libraryPageFixture;

const VOCAB = Array.from({ length: 6 }, (_, i) => ({
  id: 100 + i, word: `単語${i}`, kana: `たんご${i}`, meaningKo: `뜻${i}`, partOfSpeech: "NOUN",
}));
const KANJI = Array.from({ length: 6 }, (_, i) => ({
  id: 200 + i, letter: `字${i}`, onyomi: `オン${i}`, kunyomi: null, meaningKo: `훈음${i}`, words: [],
}));
const GRAMMAR = Array.from({ length: 6 }, (_, i) => ({
  id: 300 + i, name: `〜文法${i}`, nameKo: `문법뜻${i}`, explanation: "설명", examples: [], rules: [],
}));

function renderPage({ failLibrary = false } = {}) {
  const fetchMock = stubFetch((url) => {
    if (url.includes("/api/users/me")) return apiError(401, "NOT_AUTHENTICATED");
    if (url.includes("/api/courses")) return apiSuccess(COURSES);
    if (failLibrary) return apiError(500, "INTERNAL_SERVER_ERROR");
    if (url.includes("/api/library/kanji")) return apiSuccess(libraryPage(KANJI));
    if (url.includes("/api/library/grammar")) return apiSuccess(libraryPage(GRAMMAR));
    if (url.includes("/api/library/vocabulary")) return apiSuccess(libraryPage(VOCAB));
    return apiSuccess(null);
  });

  rtlRender(
    <MemoryRouter initialEntries={["/diagnosis"]}>
      <Routes>
        <Route element={<DiagnosisPage />} path="/diagnosis" />
      </Routes>
    </MemoryRouter>,
  );
  return fetchMock;
}

/** 결과 화면이 나올 때까지 아무 보기나 계속 고른다 — 계단은 어느 답이든 언젠가 끝난다(최대 12문항) */
async function clickThrough(user) {
  for (let i = 0; i < 12; i++) {
    if (screen.queryByText(/부터 시작하세요/)) return;
    const choices = await screen.findAllByRole("button", { name: /보기/ });
    await user.click(choices[0]);
  }
  await screen.findByText(/부터 시작하세요/);
}

describe("시작 화면 (P2)", () => {
  it("소요 안내와 [시작하기]가 먼저 보이고, 문제는 아직 없다", async () => {
    renderPage();

    expect(await screen.findByRole("button", { name: "시작하기" })).toBeInTheDocument();
    // 문항 수는 계단 길이에서 파생된다 — 숫자를 적으면 코스가 열릴 때마다 깨진다
    expect(screen.getByText(new RegExp(`${STAGE_COUNT * 3}문제`))).toBeInTheDocument();
    expect(screen.getByText(/저장되지 않아요/)).toBeInTheDocument();
    expect(screen.queryByText(/1 \/ /)).not.toBeInTheDocument();
  });
});

describe("배선 — 자료실 조회 (3단계 qa 치명 ① 회귀 방지)", () => {
  /**
   * 계단의 레벨을 **코드**로 넘겨야 한다. `levelLabel`("JLPT N5")을 그대로 넘기면
   * 자료실이 400을 주거나 빈 결과가 되어 **전 단계가 0문항**이 된다.
   * lib 테스트만으로는 못 잡는 지점이라 배선을 직접 본다.
   */
  it("자료실 요청의 level은 코드(N5)다 — 표시 문구를 넘기지 않는다", async () => {
    const fetchMock = renderPage();
    const user = userEvent.setup();
    await user.click(await screen.findByRole("button", { name: "시작하기" }));

    await screen.findAllByRole("button", { name: /보기/ });
    const libraryCalls = fetchMock.mock.calls
      .map(([url]) => decodeURIComponent(String(url)))
      .filter((url) => url.includes("/api/library/"));

    expect(libraryCalls.length).toBeGreaterThan(0);
    libraryCalls.forEach((url) => {
      expect(url).toMatch(/level=N[2-5](&|$)/);
      expect(url).not.toContain("JLPT");
    });
  });
});

describe("문제 진행 (P6·P7)", () => {
  it("보기를 골라도 정오가 표시되지 않고 다음 문제로 넘어간다 (P6)", async () => {
    renderPage();
    const user = userEvent.setup();
    await user.click(await screen.findByRole("button", { name: "시작하기" }));

    const choices = await screen.findAllByRole("button", { name: /보기/ });
    await user.click(choices[0]);

    expect(screen.queryByText(/정답/)).not.toBeInTheDocument();
    expect(screen.queryByText(/오답/)).not.toBeInTheDocument();
  });

  it("진행 표시가 항상 보인다 (P7)", async () => {
    renderPage();
    const user = userEvent.setup();
    await user.click(await screen.findByRole("button", { name: "시작하기" }));

    expect(await screen.findByText(/1번째 문제/)).toBeInTheDocument();
  });
});

describe("결과 화면 (P8·P9·P11·P13)", () => {
  it("추천 코스 한 줄 + 단계별 정답 수 + 저장 안 됨 안내가 보인다", async () => {
    renderPage();
    const user = userEvent.setup();
    await user.click(await screen.findByRole("button", { name: "시작하기" }));
    await clickThrough(user);

    // 단계가 2개 이상이면 셀도 2개 이상이다(약 15%) — 표는 정의서대로이므로 "있는가"만 본다 (P9)
    expect(screen.getAllByText(/\d\s*\/\s*3/).length).toBeGreaterThan(0);
    expect(screen.getByText(/저장되지 않아요/)).toBeInTheDocument(); // P13
  });

  it("주 버튼이 추천 코스 상세를 가리킨다 (P11)", async () => {
    renderPage();
    const user = userEvent.setup();
    await user.click(await screen.findByRole("button", { name: "시작하기" }));
    await clickThrough(user);

    const primary = screen.getByRole("link", { name: /코스 시작하기/ });
    expect(primary.getAttribute("href")).toMatch(/^\/courses\/\d+$/);
  });

  it("[다시 진단하기]가 있다 (P12)", async () => {
    renderPage();
    const user = userEvent.setup();
    await user.click(await screen.findByRole("button", { name: "시작하기" }));
    await clickThrough(user);

    expect(screen.getByRole("button", { name: "다시 진단하기" })).toBeInTheDocument();
  });
});

describe("실패 대체 동선 (설계/05 §15-2)", () => {
  it("재료를 못 불러오면 [다시 시도]와 [일단 왕초보부터 시작하기]가 보인다", async () => {
    renderPage({ failLibrary: true });
    const user = userEvent.setup();
    await user.click(await screen.findByRole("button", { name: "시작하기" }));

    expect(await screen.findByRole("button", { name: "다시 시도" })).toBeInTheDocument();
    // 진단이 안 돼도 학습으로 갈 길을 막지 않는다 — 첫 공개 코스로 가는 링크
    const fallback = screen.getByRole("link", { name: /일단.*시작하기/ });
    expect(fallback.getAttribute("href")).toMatch(/^\/courses\/\d+$/);
  });
});

