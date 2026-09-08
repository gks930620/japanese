// frontend-dev 작성 — 코드리뷰 Major 1: 어휘 [고치기]가 **그 줄의** 코스 행을 수정해야 한다.
// SenseDTO의 vocabularyIds와 learnedIn은 같은 소스·같은 순서라 인덱스로 짝지을 수 있다(설계/04 §3-7).
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { apiSuccess } from "../../test/helpers.jsx";
import { EditorModeContext } from "../editorModeStore.js";
import { resetEditorForTest } from "../editorPanelStore.js";
import { VocabTable } from "./ListItems.jsx";

/** 한 뜻이 두 코스(N4·N3)에서 나오는 병합 행 — 원본 어휘 id가 줄마다 다르다 */
const ITEM = {
  id: 812,
  word: "応援",
  kana: "おうえん",
  partOfSpeech: "NOUN",
  levels: ["N4", "N3"],
  senses: [
    {
      meaningKo: "응원",
      vocabularyIds: [1217, 2375],
      learnedIn: [
        { courseId: 3, courseTitle: "초급", level: "N4", unitNo: 14, unitTitle: "명령형" },
        { courseId: 4, courseTitle: "중급", level: "N3", unitNo: 25, unitTitle: "N3 총정리" },
      ],
    },
  ],
};

function renderTable() {
  const fetchMock = vi.fn(async (url, options) => {
    if (String(url).includes("/api/editor/vocabulary/") && options?.method === "PUT") {
      return apiSuccess({ id: 2375, meaningKo: "성원", kana: "おうえん", partOfSpeech: "NOUN" });
    }
    return apiSuccess(null);
  });
  vi.stubGlobal("fetch", fetchMock);

  render(
    <MemoryRouter>
      <EditorModeContext.Provider value={{ enabled: true }}>
        <table>
          <tbody />
        </table>
        <VocabTable items={[ITEM]} listKey="k" />
      </EditorModeContext.Provider>
    </MemoryRouter>,
  );
  return fetchMock;
}

beforeEach(() => {
  resetEditorForTest();
});

describe("어휘 편집 대상 (Major 1)", () => {
  it("두 번째 코스 줄에서 누르면 그 줄의 어휘 id로 저장한다", async () => {
    const fetchMock = renderTable();
    const user = userEvent.setup();

    await user.click(screen.getByRole("button", { name: /応援 자세히 보기/ }));
    const editButtons = screen.getAllByRole("button", { name: /고치기/ });
    expect(editButtons).toHaveLength(2); // 코스 줄마다 하나

    // 두 번째 줄(N3, 원본 어휘 2375)
    await user.click(editButtons[1]);
    await user.clear(screen.getByLabelText("뜻"));
    await user.type(screen.getByLabelText("뜻"), "성원");
    await user.click(screen.getByRole("button", { name: "저장" }));

    const put = fetchMock.mock.calls.find(([, o]) => o?.method === "PUT");
    expect(String(put[0])).toContain("/api/editor/vocabulary/2375");
  });

  it("패널 제목에 어느 코스·유닛인지 들어간다 (A4)", async () => {
    renderTable();
    const user = userEvent.setup();

    await user.click(screen.getByRole("button", { name: /応援 자세히 보기/ }));
    await user.click(screen.getAllByRole("button", { name: /고치기/ })[1]);

    expect(screen.getByRole("heading", { name: /유닛 25/ })).toBeInTheDocument();
  });
});

describe("편집 대상 id 폴백 (QA 낮음 5)", () => {
  it("그 줄의 원본 어휘 id를 모르면 [고치기]를 아예 렌더하지 않는다", async () => {
    const noIds = {
      ...ITEM,
      senses: [{ meaningKo: "응원", learnedIn: ITEM.senses[0].learnedIn }], // vocabularyIds 없음
    };
    const user = userEvent.setup();
    vi.stubGlobal("fetch", vi.fn(async () => apiSuccess(null)));
    render(
      <MemoryRouter>
        <EditorModeContext.Provider value={{ enabled: true }}>
          <VocabTable items={[noIds]} listKey="k" />
        </EditorModeContext.Provider>
      </MemoryRouter>,
    );

    await user.click(screen.getByRole("button", { name: /応援 자세히 보기/ }));

    // 엉뚱한 대역(표제어 id)으로 다른 행을 고치느니 버튼을 숨긴다
    expect(screen.queryByRole("button", { name: /고치기/ })).not.toBeInTheDocument();
  });
});
