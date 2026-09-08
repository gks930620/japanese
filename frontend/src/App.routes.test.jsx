// TDD Red — senior-dev 작성 (2026-09-03 판정 D-1 · 08 C-20)
//
// **App의 라우트 표 자체**를 통과시키는 테스트다. 퀴즈·상세 화면 테스트는 전부 컴포넌트를 직접 렌더해
// 라우트 표를 한 번도 보지 않았고, 그 사이 `/library/kanji/:kanjiId`가 `/library/:type/quiz`를 먹었다
// (React Router는 점수가 같으면 **선언 순서**가 이긴다 — 정적2+동적1 동점). 794건이 초록인 채로
// 자료실 한자·문법 퀴즈가 통째로 404였다. "주소 → 화면" 대응은 여기서만 고정한다(08 C-11).
//
// 이 테스트를 수정하지 말 것 — 라우트 계약 변경은 senior-dev 경유 (CLAUDE.md TDD 규칙 2).
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it } from "vitest";
import App from "./App.jsx";
import { AuthProvider } from "./context/AuthContext.jsx";
import { UserDataProvider } from "./context/UserDataContext.jsx";
import { EditorModeProvider } from "./components/EditorMode.jsx";
import { apiError, apiSuccess, stubFetch } from "./test/helpers.jsx";
import { kanjiItem, grammarItem, libraryPage } from "./test/libraryHelpers.jsx";

const KANJI_ROWS = Array.from({ length: 6 }, (_, i) => ({ ...kanjiItem(), id: 10 + i, letter: `字${i}` }));
const GRAMMAR_ROWS = Array.from({ length: 6 }, (_, i) => ({ ...grammarItem(), id: 30 + i, name: `文法${i}` }));

/** main.jsx와 같은 프로바이더 순서로 App을 그 주소에 띄운다 — 라우트 표는 App 그대로다 */
function renderApp(route) {
  const fetchMock = stubFetch((url) => {
    if (url.includes("/api/users/me")) return apiError(401, "NOT_AUTHENTICATED");
    if (url.includes("/api/editor/status")) return apiError(404, "NOT_FOUND");
    if (url.includes("/api/library/kanji/")) {
      return apiSuccess({ ...kanjiItem(), words: [], learnedIn: { courseId: 2, courseTitle: "왕초보", level: "N5", unitNo: 1, unitTitle: "유닛" } });
    }
    if (url.includes("/api/library/kanji")) return apiSuccess(libraryPage(KANJI_ROWS, { totalElements: 6, totalAll: 100 }));
    if (url.includes("/api/library/grammar")) return apiSuccess(libraryPage(GRAMMAR_ROWS, { totalElements: 6, totalAll: 100 }));
    return apiSuccess(null);
  });
  render(
    <MemoryRouter initialEntries={[route]}>
      <AuthProvider>
        <UserDataProvider>
          <EditorModeProvider>
            <App />
          </EditorModeProvider>
        </UserDataProvider>
      </AuthProvider>
    </MemoryRouter>,
  );
  return fetchMock;
}

describe("App 라우트 표 — /library/{type}/quiz 는 퀴즈 화면이다 (D-1)", () => {
  it.each([
    ["/library/kanji/quiz?level=N5", "/api/library/kanji/quiz"],
    ["/library/grammar/quiz", "/api/library/grammar/quiz"],
  ])("%s 는 상세 화면이 아니라 퀴즈 시작 화면을 그린다", async (route, wrongApi) => {
    const fetchMock = renderApp(route);

    // 퀴즈 시작 화면의 고정 요소 — [문제 풀기] 버튼
    expect(await screen.findByRole("button", { name: "문제 풀기" })).toBeInTheDocument();
    // 상세 화면이 "quiz"를 id로 알고 API를 부르는 일이 없어야 한다
    expect(screen.queryByText("찾을 수 없는 항목이에요")).not.toBeInTheDocument();
    const calledWrongDetail = fetchMock.mock.calls.some(([url]) => String(url).includes(wrongApi));
    expect(calledWrongDetail).toBe(false);
  });

  it("어휘 퀴즈도 같은 라우트로 열린다 (회귀 가드 — 지금은 상세 라우트가 없어 우연히 살아 있는 쪽)", async () => {
    stubFetch((url) => {
      if (url.includes("/api/users/me")) return apiError(401, "NOT_AUTHENTICATED");
      if (url.includes("/api/editor/status")) return apiError(404, "NOT_FOUND");
      if (url.includes("/api/library/vocabulary")) {
        return apiSuccess(libraryPage(
          Array.from({ length: 6 }, (_, i) => ({
            id: 100 + i, word: `単語${i}`, kana: `たんご${i}`, partOfSpeech: "NOUN", levels: ["N5"],
            senses: [{ meaningKo: `뜻${i}`, vocabularyIds: [100 + i], learnedIn: [] }],
          })),
          { totalElements: 6, totalAll: 100 },
        ));
      }
      return apiSuccess(null);
    });
    render(
      <MemoryRouter initialEntries={["/library/vocabulary/quiz"]}>
        <AuthProvider>
          <UserDataProvider>
            <EditorModeProvider>
              <App />
            </EditorModeProvider>
          </UserDataProvider>
        </AuthProvider>
      </MemoryRouter>,
    );
    expect(await screen.findByRole("button", { name: "문제 풀기" })).toBeInTheDocument();
  });

  it("숫자 id 상세 주소는 여전히 상세 화면이다 — 퀴즈 라우트를 앞세워도 상세를 잃지 않는다", async () => {
    const fetchMock = renderApp("/library/kanji/11");

    // 상세 화면의 고정 요소 — 글자 + "어디서 배우나" 역링크
    expect(await screen.findByRole("link", { name: /이 유닛에서 배우기/ })).toBeInTheDocument();
    expect(fetchMock.mock.calls.some(([url]) => String(url).includes("/api/library/kanji/11"))).toBe(true);
    expect(screen.queryByRole("button", { name: "문제 풀기" })).not.toBeInTheDocument();
  });
});
