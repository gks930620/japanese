// 진단 **재료 배선** — 실제 응답 shape으로 고정한다 (QA 치명 1·2 재발 방지 + 2026-09-10 개편의 재료 조달)
// lib 테스트는 평평한 재료를 받아 초록인데 제품은 배선에서 깨진 적이 있다(08 C-9) — 그 자리를 여기서 막는다.
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { describe, expect, it, vi } from "vitest";
import { apiSuccess } from "../test/helpers.jsx";
import { REAL_COURSES, realGrammarItem, realLibraryPage, realVocabEntry } from "../test/realShapes.js";
import { DiagnosisPage } from "./DiagnosisPage.jsx";

const VOCAB = realLibraryPage(
  Array.from({ length: 8 }, (_, i) => realVocabEntry(100 + i, `たんご${i + 1}`, `たんご${i + 1}`, `뜻${i + 1}`)),
);
const GRAMMAR = realLibraryPage(
  Array.from({ length: 8 }, (_, i) => realGrammarItem(300 + i, `〜ぶんぽう${i + 1}`, `문법뜻${i + 1}`)),
);

function renderPage() {
  const fetchMock = vi.fn(async (url) => {
    const target = String(url);
    if (target.includes("/api/courses")) return apiSuccess(REAL_COURSES);
    // 자료실은 코드만 받는다 — 라벨("문자"·"JLPT N5")을 넘기면 400이다(실제 서버 동작)
    const level = new URL(target, "http://x").searchParams.get("level");
    if (level && !/^(INTRO|N[1-5])(,(INTRO|N[1-5]))*$/.test(level)) {
      return { ok: false, status: 400, json: async () => ({ errorCode: "BUSINESS_RULE_VIOLATION" }), clone() { return this; } };
    }
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

const libraryCalls = (fetchMock) =>
  fetchMock.mock.calls.map(([url]) => decodeURIComponent(String(url))).filter((url) => url.includes("/api/library/"));

describe("한 단계의 재료 조회 (QA 치명 1 · 08 B-7)", () => {
  it("코스 레벨 라벨이 아니라 자료실 코드로 묻는다 — 첫 단계는 입문이다", async () => {
    const fetchMock = renderPage();
    const user = userEvent.setup();

    await user.click(await screen.findByRole("button", { name: "시작하기" }));

    await waitFor(() => expect(libraryCalls(fetchMock).length).toBeGreaterThan(0));
    libraryCalls(fetchMock).forEach((url) => {
      expect(url).toContain("level=INTRO");
      expect(url).not.toContain("문자");
      expect(url).not.toContain("JLPT");
    });
  });

  /**
   * ★ 2026-09-10 개편: 진단은 **어휘와 문법 둘만** 부른다.
   * 한자 낱자 문항이 빠졌으므로(D2-1) 한자 자료실을 부를 이유가 없다 —
   * 부르면 입문 단계에서 **0건짜리 응답을 기다리는 순수 낭비**가 된다.
   */
  it("한 단계에 호출은 두 번뿐이다 — 한자 자료실을 부르지 않는다", async () => {
    const fetchMock = renderPage();
    const user = userEvent.setup();

    await user.click(await screen.findByRole("button", { name: "시작하기" }));
    await screen.findByRole("button", { name: /제출하고/ });

    const calls = libraryCalls(fetchMock);
    expect(calls.filter((url) => url.includes("/api/library/kanji"))).toHaveLength(0);
    expect(calls.filter((url) => url.includes("/api/library/vocabulary"))).toHaveLength(1);
    expect(calls.filter((url) => url.includes("/api/library/grammar"))).toHaveLength(1);
  });

  /**
   * ★ 블로커였던 지점(기획 §8 제약 3 · 08 B-12): 문장·빈칸 문항의 재료는 **문법 예문**이다.
   * 목록이 예문을 주므로 **상세를 따로 부르지 않는다** — 문법 수만큼(최대 69회) 왕복하면
   * 단계 전환 로딩이 재료 수에 비례해 길어진다.
   */
  it("문법 예문은 목록에서 받는다 — 문법 상세를 부르지 않는다", async () => {
    const fetchMock = renderPage();
    const user = userEvent.setup();

    await user.click(await screen.findByRole("button", { name: "시작하기" }));
    await screen.findByRole("button", { name: /제출하고/ });

    const calls = libraryCalls(fetchMock);
    // 레벨 전량이 한 페이지에 오도록 size 상한으로 한 번에 받는다(04 §3-5)
    expect(calls.some((url) => url.includes("/api/library/grammar") && url.includes("size=100"))).toBe(true);
    expect(calls.filter((url) => /\/api\/library\/grammar\/\d+/.test(url))).toHaveLength(0);
  });
});

describe("실제 응답으로 문항이 채워진다 (QA 치명 2)", () => {
  it("표제어 DTO(senses[])·목록 DTO(examples[])로도 지문과 보기가 비지 않는다", async () => {
    renderPage();
    const user = userEvent.setup();
    await user.click(await screen.findByRole("button", { name: "시작하기" }));
    await screen.findByRole("button", { name: /제출하고/ });

    const cards = screen.getAllByRole("group");
    expect(cards).toHaveLength(6);
    cards.forEach((card) => {
      expect(card.querySelector(".quiz-prompt").textContent.trim()).not.toBe("");
      const radios = within(card).getAllByRole("radio");
      expect(radios).toHaveLength(5);
      // 보기에 글자가 없으면 화면은 멀쩡한데 고를 수가 없다 — 접근 가능한 이름이 곧 보기 문구다
      radios.forEach((radio) => expect(radio).toHaveAccessibleName());
    });
  });

  it("문장 문항이 실제로 만들어진다 — 예문이 목록에 실려 있기 때문이다", async () => {
    renderPage();
    const user = userEvent.setup();
    await user.click(await screen.findByRole("button", { name: "시작하기" }));
    await screen.findByRole("button", { name: /제출하고/ });

    const prompts = screen
      .getAllByRole("group")
      .map((card) => card.querySelector(".quiz-prompt").textContent.trim());
    // realGrammarItem의 예문은 "これは {표현}です。" 꼴이다
    expect(prompts.some((prompt) => prompt.startsWith("これは"))).toBe(true);
  });
});
