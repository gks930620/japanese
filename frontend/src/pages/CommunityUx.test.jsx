import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { apiError, apiSuccess, jsonResponse, stubFetch } from "../test/helpers.jsx";
import { LocationProbe } from "../test/LocationProbe.jsx";
import { AuthProvider } from "../context/AuthContext.jsx";
import { CommunityDetailPage } from "./CommunityDetailPage.jsx";
import { CommunityEditPage } from "./CommunityEditPage.jsx";
import { CommunityWritePage } from "./CommunityWritePage.jsx";

/**
 * 커뮤니티 UX 네 건 (2026-08-25 판정 B-M6 · B-M7 · B-L4 · B-L9)
 *
 * - B-M6: 본문 저장(POST)은 성공했는데 그 뒤 첨부 업로드만 실패하면 같은 catch로 떨어져
 *   "게시글 작성에 실패했습니다"만 뜨고 화면도 그대로다. 사용자가 다시 누르면 글이 하나 더 생긴다
 *   (서버에 중복 방지가 없다 — 감사가 같은 제목 5건 동시 POST로 확인). 저장된 것을 실패라고 부르지 않는다.
 * - B-M7: 댓글 버튼에 disabled가 없다. 같은 저장소의 글쓰기 버튼은 이미 disabled={loading}이다.
 * - B-L4: "최소 5자 이상 작성해주세요"라는 없는 규칙을 약속한다(1자도 201로 저장된다) — 08 C-12 ②.
 * - B-L9: 상세 실패 화면에 나갈 링크가 없다 — 08 C-12 ④. 학습 쪽은 NotFoundCard로 이미 해결했다.
 *
 * 이 테스트를 수정하지 말 것 — 계약 변경은 senior-dev 경유.
 */

const ME = { id: 3, username: "gks930620", nickname: "한창희", provider: "LOCAL" };
const FILE_INPUT = "input[type=file]";
const POST = {
  id: 1004, title: "글", content: "본문", userId: 99,
  nickname: "남", viewCount: 1, createdAt: "2026-08-25T00:00:00",
};

beforeEach(() => {
  vi.restoreAllMocks();
  vi.spyOn(window, "alert").mockImplementation(() => {});
});

function renderWrite(handler) {
  const fetchMock = stubFetch(handler);
  render(
    <MemoryRouter initialEntries={["/community/write"]}>
      <LocationProbe />
      <AuthProvider>
        <Routes>
          <Route element={<CommunityWritePage />} path="/community/write" />
          <Route element={<div>상세 화면</div>} path="/community/detail" />
        </Routes>
      </AuthProvider>
    </MemoryRouter>,
  );
  return fetchMock;
}

/** 본문 POST는 성공, 파일 업로드만 실패하는 서버 */
function attachmentFails(url) {
  const target = String(url);
  if (target.includes("/api/users/me")) return apiSuccess(ME);
  if (target.includes("/api/files")) {
    return jsonResponse({ success: false, message: "업로드 실패", errorCode: "INTERNAL_SERVER_ERROR" }, 500);
  }
  if (target.includes("/api/communities")) return apiSuccess(1004);
  return apiSuccess(null);
}

async function submitWithAttachment(user) {
  await user.type(await screen.findByLabelText(/제목/), "첨부 있는 글");
  await user.type(screen.getByLabelText(/내용/), "본문입니다");
  const file = new File(["hello"], "note.txt", { type: "text/plain" });
  await user.upload(document.querySelector(FILE_INPUT), file);
  await user.click(screen.getByRole("button", { name: /등록|작성|저장/ }));
}

describe("첨부만 실패했을 때 (B-M6)", () => {
  it("글은 저장됐다고 말한다 — 작성 실패라고 하지 않는다", async () => {
    renderWrite(attachmentFails);
    const user = userEvent.setup();

    await submitWithAttachment(user);

    await waitFor(() => expect(window.alert).toHaveBeenCalled());
    const said = window.alert.mock.calls.map(([text]) => String(text)).join(" ");
    expect(said).not.toMatch(/게시글 작성에 실패/);
    expect(said).toMatch(/저장|등록/);
    expect(said).toMatch(/첨부/);
  });

  it("저장된 글의 상세로 넘어간다 — 같은 화면에 남겨 두면 다시 누르게 된다", async () => {
    renderWrite(attachmentFails);
    const user = userEvent.setup();

    await submitWithAttachment(user);

    await waitFor(() => expect(screen.getByTestId("location")).toHaveTextContent("/community/detail"));
    expect(screen.getByTestId("location")).toHaveTextContent("id=1004");
  });

  it("본문 저장 자체가 실패하면 지금 그대로 실패라고 말한다 (회귀)", async () => {
    renderWrite((url) => {
      const target = String(url);
      if (target.includes("/api/users/me")) return apiSuccess(ME);
      return jsonResponse({ success: false, message: "저장 실패", errorCode: "INTERNAL_SERVER_ERROR" }, 500);
    });
    const user = userEvent.setup();

    await user.type(await screen.findByLabelText(/제목/), "글");
    await user.type(screen.getByLabelText(/내용/), "본문");
    await user.click(screen.getByRole("button", { name: /등록|작성|저장/ }));

    await waitFor(() => expect(window.alert).toHaveBeenCalled());
    expect(screen.getByTestId("location")).toHaveTextContent("/community/write");
  });
});

describe("댓글 연타 (B-M7)", () => {
  it("응답 전에 다시 눌러도 댓글은 한 번만 올라간다", async () => {
    let resolveComment = null;
    const fetchMock = stubFetch((url) => {
      const target = String(url);
      if (target.includes("/api/users/me")) return apiSuccess(ME);
      if (target.includes("/comments")) {
        return new Promise((resolve) => {
          resolveComment = () => resolve(apiSuccess({ content: [], totalElements: 0 }));
        });
      }
      if (target.includes("/api/files")) return apiSuccess([]);
      if (target.includes("/api/communities/")) return apiSuccess(POST);
      return apiSuccess(null);
    });
    render(
      <MemoryRouter initialEntries={["/community/detail?id=1004"]}>
        <AuthProvider>
          <Routes>
            <Route element={<CommunityDetailPage />} path="/community/detail" />
          </Routes>
        </AuthProvider>
      </MemoryRouter>,
    );
    const user = userEvent.setup();

    const box = await screen.findByPlaceholderText(/댓글을 입력하세요/);
    await user.type(box, "같은 댓글");
    const button = screen.getByRole("button", { name: /댓글 작성/ });
    await user.click(button);
    await user.click(button);
    await user.click(button);

    // 첫 목록 조회 1회 + 작성 1회까지만 — 연타분이 그대로 나가면 안 된다
    const commentCalls = fetchMock.mock.calls.filter(([url]) => String(url).includes("/comments"));
    expect(commentCalls.length).toBeLessThanOrEqual(2);
    expect(button).toBeDisabled();
    if (resolveComment) resolveComment();
  });
});

describe("없는 규칙을 약속하지 않는다 (B-L4)", () => {
  it("글 수정 폼에 최소 5자 안내가 없다", async () => {
    stubFetch((url) => {
      const target = String(url);
      if (target.includes("/api/users/me")) return apiSuccess(ME);
      if (target.includes("/api/files")) return apiSuccess([]);
      if (target.includes("/api/communities/")) return apiSuccess({ ...POST, userId: ME.id });
      return apiSuccess(null);
    });
    render(
      <MemoryRouter initialEntries={["/community/edit?id=1004"]}>
        <AuthProvider>
          <Routes>
            <Route element={<CommunityEditPage />} path="/community/edit" />
          </Routes>
        </AuthProvider>
      </MemoryRouter>,
    );

    await waitFor(() => expect(screen.getByDisplayValue("본문")).toBeInTheDocument());
    expect(screen.queryByText(/최소 5자/)).not.toBeInTheDocument();
  });
});

describe("상세 실패 화면에서 나가는 길 (B-L9)", () => {
  const TYPE_MISMATCH = jsonResponse(
    { success: false, message: "파라미터 타입이 올바르지 않습니다: communityId", errorCode: "TYPE_MISMATCH" },
    400,
  );

  function renderDetailAt(route, handler) {
    stubFetch(handler);
    render(
      <MemoryRouter initialEntries={[route]}>
        <AuthProvider>
          <Routes>
            <Route element={<CommunityDetailPage />} path="/community/detail" />
          </Routes>
        </AuthProvider>
      </MemoryRouter>,
    );
  }

  it("목록으로 돌아가는 링크가 있다", async () => {
    renderDetailAt("/community/detail?id=abc", (url) =>
      String(url).includes("/api/users/me") ? apiError(401, "NOT_AUTHENTICATED") : TYPE_MISMATCH,
    );

    // 400(비숫자 id)은 "없는 주소"다 — 코스 상세와 같은 선례이고, 2026-09 판정 D-5로 문구가 갈렸다.
    // 이 테스트의 본뜻(나가는 길이 있다)은 그대로다.
    await waitFor(() => expect(screen.getByText(/찾을 수 없는 글/)).toBeInTheDocument());
    expect(screen.getByRole("link", { name: /목록/ })).toHaveAttribute("href", "/community");
  });

  it("id 없이 들어와도 나갈 길이 있다", async () => {
    renderDetailAt("/community/detail", (url) =>
      String(url).includes("/api/users/me") ? apiError(401, "NOT_AUTHENTICATED") : apiSuccess(null),
    );

    await waitFor(() => expect(screen.getByText(/잘못된 접근입니다/)).toBeInTheDocument());
    expect(screen.getByRole("link", { name: /목록/ })).toHaveAttribute("href", "/community");
  });
});
