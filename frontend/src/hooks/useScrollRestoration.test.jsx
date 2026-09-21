// TDD Red — senior-dev 작성 (2026-09-16, 기술설계_2026-09_SPA_상태복원 §2)
//
// **스크롤 복원 — 새 주소(PUSH)는 맨 위, 뒤로/앞으로(POP)는 보던 위치, replace는 그대로.**
// SPA는 화면을 갈아끼워도 문서가 하나라 브라우저가 스크롤을 대신 맞춰 주지 않는다. 그래서 목록에서 상세로
// 갔다가 돌아오면 맨 위(또는 엉뚱한 곳)에 떨어진다 — SSR 사이트에서 되던 것이 안 되는 두 번째 원인이다.
//
// 핵심 난점: 뒤로가기의 콘텐츠는 비동기로 온다(스켈레톤 → 데이터). 문서가 아직 짧을 때 스크롤을 옮기면
// 브라우저가 끝에서 잘라 버리므로, **문서가 목표 높이에 닿을 때까지 기다렸다가** 옮겨야 한다.
// 그 사이 사용자가 직접 스크롤하면 복원을 포기한다(사용자의 손을 이기지 않는다).
//
// 저장소는 `sessionStorage["jp.scroll.v1"]`(location.key → y)다 — 새로고침에도 살아남고 탭을 닫으면 사라진다.
// React Router는 key를 history.state에 넣어 두므로 새로고침 뒤에도 같은 key로 돌아온다.
// `<BrowserRouter>`를 유지하고 훅 하나로 푼다(데이터 라우터의 <ScrollRestoration/>은 "콘텐츠 준비"를 기다릴 수 없다).
//
// jsdom에는 레이아웃이 없다 — 문서 높이·scrollY는 여기서 손으로 정의한다(프로덕션 코드의 문제가 아니라 환경 한계).
//
// 이 테스트를 수정하지 말 것 — 계약 변경은 senior-dev 경유 (CLAUDE.md TDD 규칙 2).
import { act, fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Link, MemoryRouter, Route, Routes, useNavigate } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { apiError, apiSuccess, stubFetch } from "../test/helpers.jsx";
import { AuthProvider } from "../context/AuthContext.jsx";
import { Layout } from "../components/Layout.jsx";
import { SCROLL_STORAGE_KEY, useScrollRestoration } from "./useScrollRestoration.js";

/* ── jsdom 보조: 레이아웃 값을 흉내 낸다 ── */

const originalScrollY = Object.getOwnPropertyDescriptor(window, "scrollY");

function setScrollY(y) {
  Object.defineProperty(window, "scrollY", { configurable: true, get: () => y });
  Object.defineProperty(window, "pageYOffset", { configurable: true, get: () => y });
}

function setDocumentHeight(height) {
  Object.defineProperty(document.documentElement, "scrollHeight", { configurable: true, get: () => height });
  Object.defineProperty(document.body, "scrollHeight", { configurable: true, get: () => height });
}

/** scrollTo(x, y)든 scrollTo({top}) 이든 y만 뽑는다 — 호출 형태는 계약이 아니다 */
function scrolledYs(spy) {
  return spy.mock.calls.map(([a, b]) => (a != null && typeof a === "object" ? a.top : b));
}

async function frames(n = 3) {
  for (let i = 0; i < n; i += 1) {
    await act(() => new Promise((resolve) => requestAnimationFrame(() => resolve())));
  }
}

let scrollSpy;

beforeEach(() => {
  scrollSpy = vi.spyOn(window, "scrollTo").mockImplementation(() => {});
  window.innerHeight = 800;
  setDocumentHeight(0); // 아직 아무것도 그려지지 않은 문서
  setScrollY(0);
});

afterEach(() => {
  delete document.documentElement.scrollHeight;
  delete document.body.scrollHeight;
  if (originalScrollY) Object.defineProperty(window, "scrollY", originalScrollY);
});

/* ── 최소 화면: 훅 하나 + 링크·뒤로가기·replace 버튼 ── */

function Host({ children }) {
  useScrollRestoration();
  return children;
}

function PageA() {
  const navigate = useNavigate();
  return (
    <div>
      <h1>A</h1>
      <Link to="/b">go b</Link>
      <button type="button" onClick={() => navigate("/a?q=x", { replace: true })}>
        replace
      </button>
    </div>
  );
}

function PageB() {
  const navigate = useNavigate();
  return (
    <div>
      <h1>B</h1>
      <button type="button" onClick={() => navigate(-1)}>
        back
      </button>
    </div>
  );
}

function renderPages(initialEntries = ["/a"]) {
  return render(
    <MemoryRouter initialEntries={initialEntries}>
      <Host>
        <Routes>
          <Route element={<PageA />} path="/a" />
          <Route element={<PageB />} path="/b" />
        </Routes>
      </Host>
    </MemoryRouter>,
  );
}

describe("useScrollRestoration — PUSH · REPLACE", () => {
  it("새 주소로 가면(PUSH) 맨 위로 간다", async () => {
    renderPages();
    setScrollY(480);
    fireEvent.scroll(window);
    scrollSpy.mockClear();

    await userEvent.setup().click(screen.getByRole("link", { name: "go b" }));

    await screen.findByRole("heading", { name: "B" });
    expect(scrolledYs(scrollSpy)).toContain(0);
  });

  it("replace는 스크롤을 건드리지 않는다 (검색 디바운스 · 탭 기본값 보정이 화면을 튀게 하면 안 된다)", async () => {
    renderPages();
    await frames();
    setScrollY(480);
    fireEvent.scroll(window);
    scrollSpy.mockClear();

    await userEvent.setup().click(screen.getByRole("button", { name: "replace" }));
    await frames();

    expect(scrollSpy).not.toHaveBeenCalled();
  });
});

describe("useScrollRestoration — POP 복원은 콘텐츠가 준비된 뒤다", () => {
  it("뒤로가기는 보던 위치로 — 문서가 그 높이에 닿을 때까지 기다렸다가 옮긴다", async () => {
    renderPages();
    const user = userEvent.setup();
    setDocumentHeight(3000);
    setScrollY(1200);
    fireEvent.scroll(window); // A에서 1200까지 내려 봤다

    await user.click(screen.getByRole("link", { name: "go b" }));
    await screen.findByRole("heading", { name: "B" });
    setScrollY(0);
    setDocumentHeight(600); // B는 짧다

    scrollSpy.mockClear();
    await user.click(screen.getByRole("button", { name: "back" }));
    await screen.findByRole("heading", { name: "A" });

    // A가 다시 떴지만 아직 스켈레톤(짧은 문서) — 1200으로 옮기면 잘리므로 아직 옮기지 않는다
    await frames(3);
    expect(scrolledYs(scrollSpy)).not.toContain(1200);

    // 데이터가 와서 문서가 길어졌다 → 이제 옮긴다
    setDocumentHeight(3000);
    await frames(4);
    expect(scrolledYs(scrollSpy)).toContain(1200);
  });

  it("기다리는 동안 사용자가 스크롤(wheel)하면 복원을 포기한다", async () => {
    renderPages();
    const user = userEvent.setup();
    setDocumentHeight(3000);
    setScrollY(1200);
    fireEvent.scroll(window);

    await user.click(screen.getByRole("link", { name: "go b" }));
    await screen.findByRole("heading", { name: "B" });
    setDocumentHeight(600);

    scrollSpy.mockClear();
    await user.click(screen.getByRole("button", { name: "back" }));
    await screen.findByRole("heading", { name: "A" });
    await frames(2);

    fireEvent.wheel(window, { deltaY: 40 }); // 사용자가 손을 댔다
    setDocumentHeight(3000);
    await frames(4);

    expect(scrolledYs(scrollSpy)).not.toContain(1200);
  });

  it("저장된 위치가 없으면(밀려남·첫 방문) 맨 위다", async () => {
    renderPages();
    const user = userEvent.setup();
    setDocumentHeight(3000);

    await user.click(screen.getByRole("link", { name: "go b" }));
    await screen.findByRole("heading", { name: "B" });
    scrollSpy.mockClear();
    await user.click(screen.getByRole("button", { name: "back" }));
    await screen.findByRole("heading", { name: "A" });
    await frames(2);

    expect(scrolledYs(scrollSpy)).toContain(0);
    expect(scrolledYs(scrollSpy).filter((y) => y > 0)).toHaveLength(0);
  });
});

describe("useScrollRestoration — 새로고침(같은 key로 재마운트)", () => {
  it("보던 위치는 sessionStorage['jp.scroll.v1']에 location.key로 남는다", async () => {
    renderPages();
    setScrollY(480);
    fireEvent.scroll(window);

    await userEvent.setup().click(screen.getByRole("link", { name: "go b" }));
    await screen.findByRole("heading", { name: "B" });

    expect(SCROLL_STORAGE_KEY).toBe("jp.scroll.v1");
    const stored = JSON.parse(window.sessionStorage.getItem(SCROLL_STORAGE_KEY) ?? "{}");
    // MemoryRouter의 첫 항목 key는 "default"다 — 브라우저에서는 history.state.key가 새로고침을 견딘다
    expect(stored.default).toBe(480);
  });

  it("같은 key로 다시 마운트되면(새로고침) 저장된 위치로 — 역시 콘텐츠가 준비된 뒤다", async () => {
    window.sessionStorage.setItem(SCROLL_STORAGE_KEY, JSON.stringify({ default: 900 }));

    renderPages(["/a"]);
    await frames(3);
    expect(scrolledYs(scrollSpy)).not.toContain(900); // 문서 높이 0 — 아직

    setDocumentHeight(2400);
    await frames(4);
    expect(scrolledYs(scrollSpy)).toContain(900);
  });

  it("브라우저의 자동 복원을 끈다 — 우리가 옮기기 전에 브라우저가 먼저 튀게 두지 않는다", () => {
    Object.defineProperty(window.history, "scrollRestoration", { configurable: true, writable: true, value: "auto" });

    renderPages();

    expect(window.history.scrollRestoration).toBe("manual");
    delete window.history.scrollRestoration;
  });
});

describe("Layout이 이 훅을 켠다 (배선)", () => {
  it("Layout 안에서 링크로 이동하면 맨 위로 간다", async () => {
    stubFetch((url) =>
      String(url).includes("/api/users/me") ? apiError(401, "NOT_AUTHENTICATED") : apiSuccess(null),
    );
    render(
      <MemoryRouter initialEntries={["/a"]}>
        <AuthProvider>
          <Routes>
            <Route element={<Layout />}>
              <Route element={<PageA />} path="/a" />
              <Route element={<PageB />} path="/b" />
            </Route>
          </Routes>
        </AuthProvider>
      </MemoryRouter>,
    );
    setScrollY(480);
    fireEvent.scroll(window);
    scrollSpy.mockClear();

    await userEvent.setup().click(screen.getByRole("link", { name: "go b" }));
    await screen.findByRole("heading", { name: "B" });

    expect(scrolledYs(scrollSpy)).toContain(0);
  });
});
