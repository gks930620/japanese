import { render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { apiError, apiSuccess, stubFetch } from "../test/helpers.jsx";
import { EditorModeProvider, EditorModeBar, EditButton } from "./EditorMode.jsx";

/**
 * 편집 모드 게이트 (설계/04 §9 · 기획 A1·A2·C4 — TDD Red, senior-dev 작성)
 *
 * 프론트의 유일한 판단 근거는 `GET /api/editor/status`다 — 200이면 켜짐, 404/실패면 꺼짐.
 * 꺼진 환경에서는 띠·[고치기]·안내가 **전부 미렌더**다(없는 기능을 사과하지 않는다 — 설계/05 §12).
 *
 * 이 테스트를 수정하지 말 것 — 계약 변경은 senior-dev 경유.
 */

function renderWithStatus(statusResponse) {
  const fetchMock = stubFetch((url) => {
    if (url.includes("/api/editor/status")) return statusResponse;
    return apiSuccess(null);
  });

  render(
    <EditorModeProvider>
      <EditorModeBar />
      <EditButton label="한자 — 遵" onClick={() => {}} />
      <main>본문</main>
    </EditorModeProvider>,
  );
  return fetchMock;
}

describe("켜진 환경 (A2)", () => {
  it("상단 띠가 보이고 휘발성을 고지한다", async () => {
    renderWithStatus(apiSuccess({ enabled: true }));

    expect(await screen.findByText(/편집 모드/)).toBeInTheDocument();
    // "서버를 다시 시작하면 사라진다" — 이걸 모르면 반드시 사고가 난다(설계/05 §15-4)
    expect(screen.getByText(/다시 시작하면 사라/)).toBeInTheDocument();
  });

  it("[고치기] 버튼이 렌더된다 (A3)", async () => {
    renderWithStatus(apiSuccess({ enabled: true }));

    expect(await screen.findByRole("button", { name: /고치기/ })).toBeInTheDocument();
  });
});

describe("꺼진 환경 (A1·C4)", () => {
  it("404면 띠도 [고치기]도 안내도 전부 없다 — 화면이 현재와 100% 같다", async () => {
    const fetchMock = renderWithStatus(apiError(404, "NOT_FOUND"));

    // status 호출이 끝난 뒤에도 아무 흔적이 없어야 한다
    await waitFor(() =>
      expect(fetchMock.mock.calls.some(([url]) => String(url).includes("/api/editor/status"))).toBe(true),
    );
    expect(screen.queryByText(/편집 모드/)).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /고치기/ })).not.toBeInTheDocument();
    expect(screen.queryByText(/관리자/)).not.toBeInTheDocument();
  });

  it("네트워크 실패도 꺼짐과 동일하게 취급한다", async () => {
    const fetchMock = renderWithStatus(apiError(500, "INTERNAL_SERVER_ERROR"));

    await waitFor(() =>
      expect(fetchMock.mock.calls.some(([url]) => String(url).includes("/api/editor/status"))).toBe(true),
    );
    expect(screen.queryByText(/편집 모드/)).not.toBeInTheDocument();
  });

  it("status는 한 번만 묻는다 — 화면마다 다시 묻지 않는다", async () => {
    const fetchMock = renderWithStatus(apiSuccess({ enabled: true }));
    await screen.findByText(/편집 모드/);

    const statusCalls = fetchMock.mock.calls.filter(([url]) => String(url).includes("/api/editor/status"));
    expect(statusCalls).toHaveLength(1);
  });
});
