// frontend-dev 작성 — QA 높음 3: 유닛 문법은 2~3개뿐이라 오답 후보가 모자란다.
// 오답 풀(같은 코스 전체 등 — 설계/05 §15-1)을 주지 않으면 문법 문제가 전량 폐기된다.
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { apiError, apiSuccess, unitStudyPayload } from "../test/helpers.jsx";
import { realGrammarItem, realLibraryPage } from "../test/realShapes.js";
import { AuthProvider } from "../context/AuthContext.jsx";
import { UserDataProvider } from "../context/UserDataContext.jsx";
import { UnitStudyPage } from "./UnitStudyPage.jsx";

/** 실제 유닛 응답: 문법 2 · 한자 4 · 어휘 4 (문법 오답은 유닛 안에서 못 채운다) */
const PAYLOAD = unitStudyPayload({
  courseId: 2,
  unitNo: 4,
  grammars: [
    { id: 1, name: "〜てから", nameKo: "~하고 나서", explanation: "설명", examples: [{ jp: "食べてから行く。", kana: null, meaningKo: "먹고 나서" }], rules: [] },
    { id: 2, name: "〜ながら", nameKo: "~하면서", explanation: "설명", examples: [{ jp: "歩きながら話す。", kana: null, meaningKo: "걸으면서" }], rules: [] },
  ],
  kanjis: [
    { id: 11, letter: "人", meaningKo: "사람 인", onyomi: "ジン", kunyomi: "ひと", words: [] },
    { id: 12, letter: "山", meaningKo: "메 산", onyomi: "サン", kunyomi: "やま", words: [] },
    { id: 13, letter: "川", meaningKo: "내 천", onyomi: "セン", kunyomi: "かわ", words: [] },
    { id: 14, letter: "水", meaningKo: "물 수", onyomi: "スイ", kunyomi: "みず", words: [] },
  ],
  vocabularies: [
    { id: 21, word: "学生", kana: "がくせい", meaningKo: "학생", partOfSpeech: "NOUN" },
    { id: 22, word: "先生", kana: "せんせい", meaningKo: "선생님", partOfSpeech: "NOUN" },
    { id: 23, word: "会社", kana: "かいしゃ", meaningKo: "회사", partOfSpeech: "NOUN" },
    { id: 24, word: "電車", kana: "でんしゃ", meaningKo: "전철", partOfSpeech: "NOUN" },
  ],
});

/** 자료실 문법 목록(실제 shape) — 오답 풀 */
const GRAMMAR_POOL = realLibraryPage(
  Array.from({ length: 10 }, (_, i) => realGrammarItem(100 + i, `〜文法${i}`, `문법뜻${i}`)),
);

/** 문법 문제의 보기에 나올 수 있는 값 — 명칭(빈칸형)과 한국어 뜻(뜻형) 양쪽 */
const GRAMMAR_LABELS = new Set([
  ...PAYLOAD.grammars.flatMap((g) => [g.name, g.nameKo]),
  ...GRAMMAR_POOL.content.flatMap((g) => [g.name, g.nameKo]),
]);

function renderUnit() {
  const fetchMock = vi.fn(async (url) => {
    const target = String(url);
    if (target.includes("/api/users/me")) return apiError(401, "NOT_AUTHENTICATED");
    if (target.includes("/api/editor/status")) return apiError(404, "NOT_FOUND");
    if (target.includes("/api/library/grammar")) return apiSuccess(GRAMMAR_POOL);
    return apiSuccess(PAYLOAD);
  });
  vi.stubGlobal("fetch", fetchMock);

  render(
    <MemoryRouter initialEntries={["/courses/2/units/4"]}>
      <AuthProvider>
        <UserDataProvider>
          <Routes>
            <Route element={<UnitStudyPage />} path="/courses/:courseId/units/:unitNo" />
          </Routes>
        </UserDataProvider>
      </AuthProvider>
    </MemoryRouter>,
  );
  return fetchMock;
}

beforeEach(() => {
  window.localStorage.clear();
});

describe("유닛 확인 문제의 오답 풀 (QA 높음 3)", () => {
  it("문법 오답을 코스 밖 풀에서 채워 10문항을 만든다", async () => {
    renderUnit();
    const user = userEvent.setup();

    await user.click(await screen.findByRole("button", { name: "확인 문제" }));

    // 풀이 도착하면 문항 수가 10이 된다(문법 2 + 한자 4 + 어휘 4)
    await waitFor(() => expect(screen.getByRole("heading", { name: /10문제/ })).toBeInTheDocument());
  });

  it("문법 문제가 실제로 출제된다 (전량 폐기 금지)", async () => {
    renderUnit();
    const user = userEvent.setup();
    await user.click(await screen.findByRole("button", { name: "확인 문제" }));
    await waitFor(() => expect(screen.getByRole("heading", { name: /10문제/ })).toBeInTheDocument());
    await user.click(screen.getByRole("button", { name: "문제 풀기" }));

    let sawGrammar = false;
    for (let i = 0; i < 10; i += 1) {
      const labels = screen.queryAllByRole("button", { name: /보기/ }).map((b) => b.textContent);
      if (labels.some((label) => GRAMMAR_LABELS.has(label))) sawGrammar = true;
      const choices = screen.queryAllByRole("button", { name: /보기/ });
      if (choices.length === 0) break;
      await user.click(choices[0]);
      const advance = screen.queryByRole("button", { name: /다음 문제|결과 보기/ });
      if (advance) await user.click(advance);
    }
    expect(sawGrammar).toBe(true);
  });
});
