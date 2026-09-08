import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { afterEach, describe, expect, it, vi } from "vitest";
import { apiSuccess, stubFetch } from "../test/helpers.jsx";
import { kanjiItem, libraryPage } from "../test/libraryHelpers.jsx";
import { LibraryQuizPage } from "./LibraryQuizPage.jsx";

/**
 * 자료실 퀴즈의 **꼬리 창** — 범위가 충분한데 못 여는 일이 없어야 한다 (2026-08-25 판정 A-H3)
 *
 * 무작위 창 뽑기 자체는 옳다 — 늘 앞쪽 100개만 쓰면 "102개 중에서 출제합니다"라는 문장이 거짓이 된다(이전 QA 지적).
 * 문제는 **꼬리 창을 뽑았을 때**다: `q=하` 어휘는 102건·2페이지이고 마지막 창은 **2건**이라,
 * 그 창이 뽑히면 `content.length < 4`에 걸려 "이 조건으로는 문제를 낼 수 없어요"가 뜬다. **약 50% 확률이다.**
 * 조건에 맞는 항목 수가 `100k+1 ~ 100k+3`이면 언제든 재현되고, 콘텐츠가 늘수록 조합이 늘어난다.
 *
 * 계약(둘 다 지켜야 한다):
 *   ① **"문제를 낼 수 없어요"는 `totalElements < 4`일 때만** 나온다 — 창의 길이로 판정하지 않는다.
 *   ② 무작위 창은 유지하되 **4건 이상이 보장되는 창에서만** 뽑는다(꼬리 창을 뽑았으면 쓰지 않는다).
 *
 * 이 테스트를 수정하지 말 것 — 계약 변경은 senior-dev 경유.
 */

const HEAD = Array.from({ length: 100 }, (_, i) => ({
  ...kanjiItem(), id: 1000 + i, letter: `字${i}`, meaningKo: `훈음${i}`, onyomi: `オン${i}`, kunyomi: null,
}));
const TAIL = Array.from({ length: 2 }, (_, i) => ({
  ...kanjiItem(), id: 2000 + i, letter: `尾${i}`, meaningKo: `꼬리훈음${i}`, onyomi: `ビ${i}`, kunyomi: null,
}));

/** 실측(`q=하` 어휘)과 같은 모양 — 총 102건 · 2페이지 · 마지막 창 2건 */
function pageFor(url) {
  // 자료실 API의 page 파라미터는 **0-based**다(실측: 첫 창 page=0, 꼬리 창 page=1)
  const requested = Number(new URL(url, "http://x").searchParams.get("page") ?? 0);
  const tail = requested >= 1;
  return libraryPage(tail ? TAIL : HEAD, {
    page: tail ? 1 : 0,
    size: 100,
    totalElements: 102,
    totalAll: 1734,
    totalPages: 2,
    first: !tail,
    last: tail,
  });
}

function renderQuiz({ random, handler } = {}) {
  vi.spyOn(Math, "random").mockReturnValue(random ?? 0.99); // 꼬리 창이 뽑히는 뽑기
  const fetchMock = stubFetch(handler ?? ((url) => apiSuccess(pageFor(url))));
  render(
    <MemoryRouter initialEntries={["/library/kanji/quiz?level=N5"]}>
      <Routes>
        <Route element={<LibraryQuizPage />} path="/library/:type/quiz" />
        <Route element={<div>자료실 목록</div>} path="/library/kanji" />
      </Routes>
    </MemoryRouter>,
  );
  return fetchMock;
}

afterEach(() => {
  vi.restoreAllMocks();
});

describe("꼬리 창을 뽑아도 퀴즈가 열린다 (A-H3)", () => {
  it("102건 중 마지막 창(2건)이 뽑혀도 '문제를 낼 수 없어요'가 뜨지 않는다", async () => {
    renderQuiz({ random: 0.99 });

    expect(await screen.findByRole("button", { name: "문제 풀기" })).toBeInTheDocument();
    expect(screen.queryByText(/문제를 낼 수 없어요/)).not.toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "자료실로 돌아가기" })).not.toBeInTheDocument();
  });

  it("어떤 뽑기 값이어도 결과가 같다 — 운에 갈리지 않는다", async () => {
    for (const random of [0.0, 0.49, 0.5, 0.999]) {
      renderQuiz({ random });
      expect(await screen.findByRole("button", { name: "문제 풀기" })).toBeInTheDocument();
      cleanup();
      vi.restoreAllMocks();
    }
  });

  it("꼬리 창을 뽑았어도 실제로 4지선다 문항이 만들어진다", async () => {
    renderQuiz({ random: 0.99 });
    const user = userEvent.setup();

    await user.click(await screen.findByRole("button", { name: "문제 풀기" }));

    expect(await screen.findByText(/1 \/ \d+/)).toBeInTheDocument();
    expect(document.querySelectorAll(".quiz-choice")).toHaveLength(4);
  });

  it("범위가 정말로 4개 미만일 때만 '낼 수 없어요'다 (그 경로는 유지)", async () => {
    const three = Array.from({ length: 3 }, (_, i) => ({ ...kanjiItem(), id: 30 + i, letter: `少${i}` }));
    renderQuiz({
      handler: () => apiSuccess(libraryPage(three, { totalElements: 3, totalPages: 1, last: true })),
    });

    expect(await screen.findByText(/문제를 낼 수 없어요/)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "자료실로 돌아가기" })).toBeInTheDocument();
  });
});
