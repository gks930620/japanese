// frontend-dev 작성 — 관리자 편집 패널(설계/05 §15-4). editorMode.test(게이트)가 덮지 않는 부분.
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it } from "vitest";
import { apiSuccess, stubFetch } from "../test/helpers.jsx";
import { EditorModeContext } from "./editorModeStore.js";
import { EditorLauncher } from "./EditorLauncher.jsx";
import { resetEditorForTest } from "./editorPanelStore.js";

const KANJI = {
  id: 12,
  letter: "遵",
  meaningKo: "좇을 준",
  onyomi: "ジュン",
  kunyomi: null,
  words: [{ id: 34, word: "遵守", kana: "じゅんしゅ", meaningKo: "준수" }],
};

const GRAMMAR = {
  id: 7,
  name: "〜てから",
  nameKo: "~하고 나서",
  explanation: "순서 표현이에요.",
  examples: [{ id: 101, jp: "食べてから行く。", kana: "たべてからいく。", meaningKo: "먹고 나서 간다." }],
  rules: [{ groupLabel: "동사", pattern: "て형", exampleBefore: "食べる", exampleAfter: "食べてから" }],
};

function renderLauncher(props, { enabled = true } = {}) {
  const fetchMock = stubFetch((url, options) => {
    if (String(url).includes("/api/editor/") && options?.method === "PUT") {
      return apiSuccess({ ...props.target, ...JSON.parse(options.body) });
    }
    return apiSuccess(null);
  });
  render(
    <EditorModeContext.Provider value={{ enabled }}>
      <EditorLauncher {...props} />
    </EditorModeContext.Provider>,
  );
  return fetchMock;
}

beforeEach(() => {
  resetEditorForTest();
});

describe("게이트 (A1)", () => {
  it("꺼진 환경이면 [고치기]가 아예 없다", () => {
    renderLauncher({ kind: "kanji", target: KANJI, title: `한자 고치기 — 遵` }, { enabled: false });
    expect(screen.queryByRole("button", { name: /고치기/ })).not.toBeInTheDocument();
  });
});

describe("한자 폼 (A3·A4·A5)", () => {
  it("[고치기] → 제목에 대상이 있고 현재 값이 채워진 폼이 펼쳐진다", async () => {
    renderLauncher({ kind: "kanji", target: KANJI, title: "한자 고치기 — 遵" });
    const user = userEvent.setup();

    await user.click(screen.getByRole("button", { name: /고치기/ }));

    expect(screen.getByText("한자 고치기 — 遵")).toBeInTheDocument();
    expect(screen.getByLabelText("훈음(뜻)")).toHaveValue("좇을 준");
    expect(screen.getByLabelText("음독")).toHaveValue("ジュン");
    // 예시 단어는 수정만 — 행 추가·삭제 버튼이 없다(A5)
    expect(screen.queryByRole("button", { name: /행 추가/ })).not.toBeInTheDocument();
  });

  it("저장하면 PUT 페이로드가 설계/04 §9 모양이고 변경 요약이 보인다 (A9·A11)", async () => {
    const fetchMock = renderLauncher({ kind: "kanji", target: KANJI, title: "한자 고치기 — 遵" });
    const user = userEvent.setup();
    await user.click(screen.getByRole("button", { name: /고치기/ }));

    await user.clear(screen.getByLabelText("음독"));
    await user.type(screen.getByLabelText("음독"), "シュン");
    await user.click(screen.getByRole("button", { name: "저장" }));

    await waitFor(() => {
      const put = fetchMock.mock.calls.find(([u, o]) => String(u).includes("/api/editor/kanji/12") && o?.method === "PUT");
      expect(put).toBeTruthy();
      expect(JSON.parse(put[1].body)).toEqual({
        meaningKo: "좇을 준",
        onyomi: "シュン",
        kunyomi: null,
        words: [{ id: 34, word: "遵守", kana: "じゅんしゅ", meaningKo: "준수" }],
      });
    });
    // 저장 결과 카드 — 휘발 고지 + 전→후 요약
    expect(await screen.findByText(/다시 시작하면 원래 내용으로/)).toBeInTheDocument();
    expect(screen.getByText(/ジュン → シュン/)).toBeInTheDocument();
  });

  it("변경 없이 저장하면 요청 없이 닫힌다 (A12)", async () => {
    const fetchMock = renderLauncher({ kind: "kanji", target: KANJI, title: "한자 고치기 — 遵" });
    const user = userEvent.setup();
    await user.click(screen.getByRole("button", { name: /고치기/ }));

    await user.click(screen.getByRole("button", { name: "저장" }));

    expect(fetchMock.mock.calls.filter(([, o]) => o?.method === "PUT")).toHaveLength(0);
    expect(screen.queryByLabelText("훈음(뜻)")).not.toBeInTheDocument();
  });

  it("고친 상태로 [취소]하면 버릴지 확인한다 (dirty 확인)", async () => {
    renderLauncher({ kind: "kanji", target: KANJI, title: "한자 고치기 — 遵" });
    const user = userEvent.setup();
    await user.click(screen.getByRole("button", { name: /고치기/ }));
    await user.type(screen.getByLabelText("훈음(뜻)"), "!");

    await user.click(screen.getByRole("button", { name: "취소" }));

    expect(screen.getByText(/버릴까요/)).toBeInTheDocument();
    // 버리기 → 패널 닫힘
    await user.click(screen.getByRole("button", { name: "버리기" }));
    await waitFor(() => expect(screen.queryByLabelText("훈음(뜻)")).not.toBeInTheDocument());
  });
});

describe("문법 폼 — 활용표 행 편집 (판정 ④)", () => {
  it("행 추가·삭제가 되고 저장 페이로드는 전체 교체다", async () => {
    const fetchMock = renderLauncher({ kind: "grammar", target: GRAMMAR, title: "문법 고치기 — 〜てから" });
    const user = userEvent.setup();
    await user.click(screen.getByRole("button", { name: /고치기/ }));

    await user.click(screen.getByRole("button", { name: "+ 행 추가" }));
    const rows = screen.getAllByLabelText(/구분/);
    expect(rows).toHaveLength(2);
    await user.type(rows[1], "형용사");
    await user.type(screen.getAllByLabelText(/형태/)[1], "くて형");
    await user.type(screen.getAllByLabelText(/변환 전/)[1], "高い");
    await user.type(screen.getAllByLabelText(/변환 후/)[1], "高くてから");
    await user.click(screen.getByRole("button", { name: "저장" }));

    await waitFor(() => {
      const put = fetchMock.mock.calls.find(([u, o]) => String(u).includes("/api/editor/grammar/7") && o?.method === "PUT");
      expect(put).toBeTruthy();
      const body = JSON.parse(put[1].body);
      expect(body.rules).toHaveLength(2);
      expect(body.rules[1]).toEqual({ groupLabel: "형용사", pattern: "くて형", exampleBefore: "高い", exampleAfter: "高くてから" });
      // 예문은 id 고정 수정
      expect(body.examples[0].id).toBe(101);
    });
  });

  it("행 삭제는 즉시다 (저장 전까지 반영되지 않으므로 확인 없음)", async () => {
    renderLauncher({ kind: "grammar", target: GRAMMAR, title: "문법 고치기 — 〜てから" });
    const user = userEvent.setup();
    await user.click(screen.getByRole("button", { name: /고치기/ }));

    await user.click(screen.getByRole("button", { name: "행 삭제" }));

    expect(screen.queryByLabelText(/구분/)).not.toBeInTheDocument();
  });
});
