// frontend-dev 작성 — QA 치명 2·중간 4: 자료실 어휘 퀴즈는 **실제 표제어 DTO**(senses[])로 들어온다.
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { describe, expect, it, vi } from "vitest";
import { apiSuccess } from "../test/helpers.jsx";
import { realLibraryPage, realVocabEntry } from "../test/realShapes.js";
import { LibraryQuizPage } from "./LibraryQuizPage.jsx";

function renderQuiz({ totalElements = 8, route = "/library/vocabulary/quiz" } = {}) {
  const items = Array.from({ length: 8 }, (_, i) =>
    realVocabEntry(100 + i, `単語${i}`, `たんご${i}`, `뜻${i}`),
  );
  const fetchMock = vi.fn(async (url) => {
    if (String(url).includes("/api/library/vocabulary")) return apiSuccess(realLibraryPage(items, totalElements));
    return apiSuccess(null);
  });
  vi.stubGlobal("fetch", fetchMock);

  render(
    <MemoryRouter initialEntries={[route]}>
      <Routes>
        <Route element={<LibraryQuizPage />} path="/library/:type/quiz" />
        <Route element={<div>자료실</div>} path="/library/vocabulary" />
      </Routes>
    </MemoryRouter>,
  );
  return fetchMock;
}

describe("자료실 어휘 퀴즈 (QA 치명 2)", () => {
  it("표제어 DTO로 시작해도 지문·보기가 비지 않는다 (크래시 없음)", async () => {
    renderQuiz();
    const user = userEvent.setup();

    await user.click(await screen.findByRole("button", { name: "문제 풀기" }));

    const prompt = await screen.findByText(/\d+ \/ \d+/);
    expect(prompt).toBeInTheDocument();
    expect(document.querySelector(".quiz-prompt").textContent.trim()).not.toBe("");
    screen.getAllByRole("button", { name: /보기/ }).forEach((choice) => {
      expect(choice.textContent.trim()).not.toBe("");
    });
  });

  it("뜻 유형(VOCAB_MEANING)도 출제된다 — 표제어에서 뜻이 사라지지 않는다", async () => {
    // ★ 화면은 Math.random을 직접 쓴다(rng 주입 없음). 유형 배분이 무작위라 "8문항 중 한 번은 뜻 유형"이
    //   확률적으로 실패했다(전체 실행 1/N flaky — 2026-09-15). 시드 고정 LCG로 갈아끼워 결정적으로 만든다.
    let seed = 7;
    vi.spyOn(Math, "random").mockImplementation(() => {
      seed = (seed * 9301 + 49297) % 233280;
      return seed / 233280;
    });
    renderQuiz();
    const user = userEvent.setup();
    await user.click(await screen.findByRole("button", { name: "문제 풀기" }));

    // 8문항을 지나가는 동안 한 번이라도 '뜻은?' 유형이 나온다
    let sawMeaning = false;
    for (let i = 0; i < 8; i += 1) {
      if (screen.queryByText("이 단어의 뜻은?")) sawMeaning = true;
      const next = screen.queryAllByRole("button", { name: /보기/ });
      if (next.length === 0) break;
      await user.click(next[0]);
      const advance = screen.queryByRole("button", { name: /다음 문제|결과 보기/ });
      if (advance) await user.click(advance);
    }
    expect(sawMeaning).toBe(true);
  });
});

describe("범위 문장 (QA 중간 4)", () => {
  it("실제로 출제하는 모집단 크기를 말한다", async () => {
    renderQuiz({ totalElements: 1239 });

    // 재료를 200개만 가져온다면 "1239개 중"이라고 말하지 않는다 — 문장과 모집단이 일치해야 한다
    const sentence = (await screen.findByRole("heading")).textContent;
    const claimed = Number(/([\d,]+)개/.exec(sentence)?.[1]?.replace(/,/g, ""));
    expect(claimed).toBe(1239);
  });
});
