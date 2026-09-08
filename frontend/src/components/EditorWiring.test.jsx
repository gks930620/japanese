// frontend-dev 작성 — [고치기] 배선(설계/05 §15-4): 붙는 자리마다
// ①꺼진 환경 미렌더 ②저장 성공 시 화면이 응답값으로 갱신되는지를 고정한다.
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { apiError, apiSuccess } from "../test/helpers.jsx";
import { AuthProvider } from "../context/AuthContext.jsx";
import { UserDataProvider } from "../context/UserDataContext.jsx";
import { unitStudyPayload } from "../test/helpers.jsx";
import { resetEditorForTest } from "./editorPanelStore.js";
import { EditorModeProvider } from "./EditorMode.jsx";
import { LibraryKanjiDetailPage } from "../pages/LibraryKanjiDetailPage.jsx";
import { UnitStudyPage } from "../pages/UnitStudyPage.jsx";

const KANJI_DETAIL = {
  id: 11,
  letter: "人",
  meaningKo: "사람 인",
  onyomi: "ジン",
  kunyomi: "ひと",
  level: "N5",
  words: [{ id: 34, word: "日本人", kana: "にほんじん", meaningKo: "일본인" }],
  learnedIn: { courseId: 2, courseTitle: "왕초보", level: "N5", unitNo: 3, unitTitle: "유닛" },
};

/** 메서드까지 보는 지역 스텁 — 공용 stubFetch는 핸들러에 url만 넘긴다 */
function stubFetchWithMethod(handler) {
  const mock = vi.fn(async (url, options) => handler(String(url), options));
  vi.stubGlobal("fetch", mock);
  return mock;
}

function renderKanjiDetail({ editorEnabled }) {
  const fetchMock = stubFetchWithMethod((url, options) => {
    if (url.includes("/api/editor/status")) {
      return editorEnabled ? apiSuccess({ enabled: true }) : apiError(404, "NOT_FOUND");
    }
    if (url.includes("/api/editor/kanji/11") && options?.method === "PUT") {
      return apiSuccess({ ...KANJI_DETAIL, ...JSON.parse(options.body) });
    }
    if (url.includes("/api/library/kanji/11")) return apiSuccess(KANJI_DETAIL);
    return apiSuccess(null);
  });

  render(
    <MemoryRouter initialEntries={["/library/kanji/11"]}>
      <EditorModeProvider>
        <Routes>
        <Route element={<LibraryKanjiDetailPage />} path="/library/kanji/:kanjiId" />
        </Routes>
      </EditorModeProvider>
    </MemoryRouter>,
  );
  return fetchMock;
}

beforeEach(() => {
  window.localStorage.clear();
  resetEditorForTest();
});

describe("자료실 한자 상세 배선 (A1·A9)", () => {
  it("편집 모드가 꺼져 있으면 [고치기]가 없다", async () => {
    renderKanjiDetail({ editorEnabled: false });

    expect(await screen.findByText("사람 인")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /고치기/ })).not.toBeInTheDocument();
  });

  it("켜져 있으면 [고치기]가 있고, 저장하면 화면 값이 응답으로 갱신된다", async () => {
    renderKanjiDetail({ editorEnabled: true });
    const user = userEvent.setup();

    await user.click(await screen.findByRole("button", { name: /고치기/ }));
    await user.clear(screen.getByLabelText("훈음(뜻)"));
    await user.type(screen.getByLabelText("훈음(뜻)"), "사람 인2");
    await user.click(screen.getByRole("button", { name: "저장" }));

    // 패널이 닫히고 화면(제목)이 새 값으로 바뀐다 — 응답이 진실(A9)
    await waitFor(() => expect(screen.getByText("사람 인2")).toBeInTheDocument());
  });
});

describe("유닛 학습 배선 (A1)", () => {
  function renderUnit({ editorEnabled }) {
    stubFetchWithMethod((url) => {
      if (url.includes("/api/editor/status")) {
        return editorEnabled ? apiSuccess({ enabled: true }) : apiError(404, "NOT_FOUND");
      }
      if (url.includes("/api/users/me")) return apiError(401, "NOT_AUTHENTICATED");
      return apiSuccess(unitStudyPayload());
    });
    render(
      <MemoryRouter initialEntries={["/courses/2/units/1"]}>
        <AuthProvider>
          <UserDataProvider>
            <EditorModeProvider>
            <Routes>
              <Route element={<UnitStudyPage />} path="/courses/:courseId/units/:unitNo" />
            </Routes>
            </EditorModeProvider>
          </UserDataProvider>
        </AuthProvider>
      </MemoryRouter>,
    );
  }

  it("꺼진 환경에서는 문법 스텝에 [고치기]가 없다", async () => {
    renderUnit({ editorEnabled: false });

    expect(await screen.findByText("名詞+です")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /고치기/ })).not.toBeInTheDocument();
  });

  it("켜진 환경에서는 문법·회화·한자·어휘 스텝마다 [고치기]가 있다", async () => {
    renderUnit({ editorEnabled: true });
    const user = userEvent.setup();

    // 문법 스텝
    expect(await screen.findByRole("button", { name: /고치기/ })).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "회화" }));
    expect(screen.getByRole("button", { name: /고치기/ })).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "한자" }));
    expect(screen.getAllByRole("button", { name: /고치기/ }).length).toBeGreaterThan(0);

    await user.click(screen.getByRole("button", { name: "어휘" }));
    expect(screen.getAllByRole("button", { name: /고치기/ }).length).toBeGreaterThan(0);
  });
});
