// frontend-dev 작성 — QA 치명 1·2 재발 방지: **실제 응답 shape**으로 진단 배선을 고정한다.
// (levelLabel "JLPT N5" → 자료실 필터 "N5", 어휘 표제어의 senses[] 구조)
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { describe, expect, it, vi } from "vitest";
import { apiSuccess } from "../test/helpers.jsx";
import { REAL_COURSES, realGrammarItem, realKanjiItem, realLibraryPage, realVocabEntry } from "../test/realShapes.js";
import { DiagnosisPage } from "./DiagnosisPage.jsx";

const VOCAB = realLibraryPage(
  Array.from({ length: 6 }, (_, i) => realVocabEntry(100 + i, `単語${i}`, `たんご${i}`, `뜻${i}`)),
);
const KANJI = realLibraryPage(Array.from({ length: 6 }, (_, i) => realKanjiItem(200 + i, `字${i}`, `훈음${i}`)));
const GRAMMAR = realLibraryPage(Array.from({ length: 6 }, (_, i) => realGrammarItem(300 + i, `〜文法${i}`, `문법뜻${i}`)));

function renderPage() {
  const fetchMock = vi.fn(async (url) => {
    const target = String(url);
    if (target.includes("/api/courses")) return apiSuccess(REAL_COURSES);
    // 자료실은 N5|N4|N3|N2만 받는다 — 라벨을 그대로 넘기면 400이다(실제 서버 동작)
    const level = new URL(target, "http://x").searchParams.get("level");
    if (level && !/^N[1-5](,N[1-5])*$/.test(level)) {
      return { ok: false, status: 400, json: async () => ({ errorCode: "BUSINESS_RULE_VIOLATION" }), clone() { return this; } };
    }
    if (target.includes("/api/library/kanji")) return apiSuccess(KANJI);
    if (target.includes("/api/library/grammar")) return apiSuccess(GRAMMAR);
    if (target.includes("/api/library/vocabulary")) return apiSuccess(VOCAB);
    return apiSuccess(null);
  });
  vi.stubGlobal("fetch", fetchMock);

  render(
    <MemoryRouter initialEntries={["/diagnosis"]}>
      <Routes>
        <Route element={<DiagnosisPage />} path="/diagnosis" />
      </Routes>
    </MemoryRouter>,
  );
  return fetchMock;
}

describe("진단 재료 조회 (QA 치명 1)", () => {
  it("코스 레벨 라벨이 아니라 자료실 필터 값으로 묻는다", async () => {
    const fetchMock = renderPage();
    const user = userEvent.setup();

    await user.click(await screen.findByRole("button", { name: "시작하기" }));

    await waitFor(() => {
      const libraryCalls = fetchMock.mock.calls
        .map(([url]) => String(url))
        .filter((url) => url.includes("/api/library/"));
      expect(libraryCalls.length).toBeGreaterThan(0);
      libraryCalls.forEach((url) => {
        expect(url).toContain("level=N5");
        expect(url).not.toContain("JLPT");
      });
    });
  });

  it("문제 화면이 뜬다 — 실패 화면이 아니다 (P3)", async () => {
    renderPage();
    const user = userEvent.setup();

    await user.click(await screen.findByRole("button", { name: "시작하기" }));

    expect(await screen.findByText(/1번째 문제/)).toBeInTheDocument();
    expect(screen.queryByText(/문제를 준비하지 못했어요/)).not.toBeInTheDocument();
  });
});

describe("어휘 문항 (QA 치명 2)", () => {
  it("표제어 DTO(senses[])로도 지문이 비지 않는다", async () => {
    renderPage();
    const user = userEvent.setup();
    await user.click(await screen.findByRole("button", { name: "시작하기" }));
    await screen.findByText(/1번째 문제/);

    // 세 문항(어휘·한자·문법)을 모두 지나가는 동안 지문과 보기가 항상 채워져 있다
    for (let i = 0; i < 3; i += 1) {
      const choices = await screen.findAllByRole("button", { name: /보기/ });
      expect(choices).toHaveLength(4);
      choices.forEach((choice) => expect(choice.textContent.trim()).not.toBe(""));
      expect(document.querySelector(".quiz-prompt").textContent.trim()).not.toBe("");
      await user.click(choices[0]);
    }
  });
});
