import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { describe, expect, it } from "vitest";
import { apiError, apiSuccess, stubFetch } from "../test/helpers.jsx";
import {
  coursesFixture,
  grammarListItemFixture,
  libraryPageFixture,
  vocabularyEntryFixture,
} from "../test/apiFixtures.js";
import { answerStage, diagnosisCards, submitButton } from "../test/diagnosisHelpers.js";
import { DiagnosisPage } from "./DiagnosisPage.jsx";

/**
 * 진단 — **재료를 못 만들었을 때의 출구** (설계/09 §3-6 — TDD Red, senior-dev 2026-09-10)
 *
 * 기획 예외 **E2·E3·E4** / 인수 조건 **A20**.
 * 핵심은 하나다: **진단이 안 돼도 학습으로 가는 길을 막지 않는다.** 진단은 목적이 아니라 수단이다(05 §15-2).
 *
 * 갈림길이 둘이라는 점이 이 파일의 요지다:
 *  · **첫 단계**가 비면 판단할 근거가 하나도 없다 → 실패 카드 + [일단 {첫 코스}부터 시작하기]
 *  · **2단계 이후**가 비면 이미 근거가 있다 → **지금까지의 결과로 결론**을 내고 그 사유를 한 줄로 말한다
 *    (조용히 끝내면 사용자는 "왜 갑자기 끝났지?"를 묻는다)
 *  · **호출 자체가 실패**한 것(네트워크)은 재료 부족과 다르다 → 같은 단계를 **다시 시도**할 수 있어야 한다
 *
 * 이 테스트를 수정하지 말 것 — 계약 변경은 senior-dev 경유.
 */

const COURSES = coursesFixture();

const VOCAB = libraryPageFixture(
  Array.from({ length: 8 }, (_, i) =>
    vocabularyEntryFixture({ id: 100 + i, word: `たんご${i + 1}`, kana: `たんご${i + 1}`, meanings: [`뜻${i + 1}`] }),
  ),
);
const GRAMMAR = libraryPageFixture(
  Array.from({ length: 8 }, (_, i) =>
    grammarListItemFixture({
      id: 300 + i,
      name: `〜ぶんぽう${i + 1}`,
      nameKo: `문법뜻${i + 1}`,
      examples: [{ jp: `これは ぶんぽう${i + 1}です。`, meaningKo: `예문뜻${i + 1}` }],
    }),
  ),
);
const EMPTY = libraryPageFixture([]);

/**
 * @param handleLibrary (url, level) => 응답. null을 주면 정상 재료
 */
function renderPage(handleLibrary = () => null) {
  const fetchMock = stubFetch((url) => {
    if (url.includes("/api/users/me")) return apiError(401, "NOT_AUTHENTICATED");
    if (url.includes("/api/courses")) return apiSuccess(COURSES);
    if (url.includes("/api/library/")) {
      const level = new URL(url, "http://x").searchParams.get("level");
      const custom = handleLibrary(url, level);
      if (custom) return custom;
      return apiSuccess(url.includes("/grammar") ? GRAMMAR : VOCAB);
    }
    return apiSuccess(null);
  });

  render(
    <MemoryRouter initialEntries={["/diagnosis"]}>
      <Routes>
        <Route element={<DiagnosisPage />} path="/diagnosis" />
      </Routes>
    </MemoryRouter>,
  );
  return fetchMock;
}

const cards = diagnosisCards;

async function passStage(user) {
  await answerStage(user, { correct: true });
  await user.click(submitButton());
}

async function start(user) {
  await user.click(await screen.findByRole("button", { name: "시작하기" }));
}

describe("첫 단계를 못 만들었을 때 (E2 · A20)", () => {
  it("실패를 말하고 **학습으로 가는 길**을 주 버튼으로 준다", async () => {
    renderPage((url, level) => (level === "INTRO" ? apiSuccess(EMPTY) : null));
    const user = userEvent.setup();
    await start(user);

    expect(await screen.findByText(/문제를 준비하지 못했어요/)).toBeInTheDocument();
    // 첫 코스 = 입장 가능한 코스 중 첫 번째(지금은 입문) — 추천이 가리키는 코스와 같은 곳이다(09 §3-2)
    const fallback = screen.getByRole("link", { name: /일단 입문부터 시작하기/ });
    expect(fallback.getAttribute("href")).toBe("/courses/1");
    expect(screen.getByRole("button", { name: "다시 시도" })).toBeInTheDocument();
    // 결과 화면으로 넘어가 버리면 근거 없는 추천이 된다
    expect(screen.queryByText(/부터 시작하세요/)).not.toBeInTheDocument();
  });

});

describe("문항이 6개를 못 채웠을 때 (E5)", () => {
  /**
   * ★ 실제로 일어날 수 있는 일이다. N5 문법은 44개지만 **한자·가타카나를 뺀 지문 후보는 12개**뿐이고(09 §3-4),
   * 어휘 쪽도 가타카나를 빼면 후보가 20% 줄어든다. 재료가 모자란 단계를 **없는 척하지 않는다** —
   * 만들어진 수가 그 단계의 사실이고, 통과선은 그 수에서 계산된다(`ceil(3 × 2/3)` = 2).
   */
  it("3~5문항이면 만들어진 수만큼 내고, 진행 줄이 그 수를 말한다", async () => {
    // 어휘가 0건 → 단어 3문항이 빠지고 문법 2 + 문장 1 = 3문항만 남는다
    renderPage((url, level) => (level === "INTRO" && url.includes("/vocabulary") ? apiSuccess(EMPTY) : null));
    const user = userEvent.setup();
    await start(user);

    expect(await screen.findByText(/문자 단계 · 3문항/)).toBeInTheDocument();
    expect(cards()).toHaveLength(3);
    // 빈자리를 다른 유형으로 메우지 않는다 — 6문항인 척하지 않는다
    expect(screen.getAllByRole("radio")).toHaveLength(15);
  });
});

describe("2단계 이후를 못 만들었을 때 (E3)", () => {
  it("지금까지의 결과로 결론을 내고, 그 사유를 한 줄로 말한다", async () => {
    renderPage((url, level) => (level === "N5" ? apiSuccess(EMPTY) : null));
    const user = userEvent.setup();
    await start(user);
    await screen.findByRole("button", { name: /제출하고/ });
    await passStage(user);

    // 결과 화면이 나온다 — 조용히 끝내지 않는다
    expect(await screen.findByText(/부터 시작하세요/)).toBeInTheDocument();
    expect(screen.getByText(/JLPT N5 단계는 문제를 준비하지 못해/)).toBeInTheDocument();
    // 이미 제출한 입문 단계의 결과는 표에 남는다
    expect(screen.getByRole("row", { name: /문자/ })).toBeInTheDocument();
    expect(screen.queryByText(/다시 시도/)).not.toBeInTheDocument();
  });
});

describe("재료를 부르다 실패했을 때 (E4)", () => {
  it("같은 단계를 다시 시도할 수 있다 — 앞 단계 결과를 버리지 않는다", async () => {
    let failNext = true;
    const fetchMock = renderPage((url, level) => {
      if (level !== "N5") return null;
      if (!failNext) return null;
      return apiError(500, "INTERNAL_SERVER_ERROR");
    });
    const user = userEvent.setup();
    await start(user);
    await screen.findByRole("button", { name: /제출하고/ });
    await passStage(user);

    expect(await screen.findByText(/문제를 준비하지 못했어요/)).toBeInTheDocument();

    // 다시 시도 → **같은 단계(N5)** 를 다시 부른다. 처음(입문)으로 되돌아가지 않는다
    failNext = false;
    await user.click(screen.getByRole("button", { name: "다시 시도" }));

    expect(await screen.findByText(/JLPT N5 단계 · 6문항/)).toBeInTheDocument();
    const retried = fetchMock.mock.calls
      .map(([url]) => String(url))
      .filter((url) => url.includes("/api/library/") && url.includes("level=N5"));
    expect(retried.length).toBeGreaterThan(2); // 실패한 호출 + 재시도 호출
  });
});
