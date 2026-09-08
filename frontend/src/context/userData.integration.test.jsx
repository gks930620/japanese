import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it } from "vitest";
import { apiError, apiSuccess, jsonResponse, stubFetch } from "../test/helpers.jsx";
import { AuthProvider } from "./AuthContext.jsx";
import { UserDataProvider } from "./UserDataContext.jsx";
import { useUserData } from "./userDataStore.js";
import { MergeBanner } from "../components/MergeBanner.jsx";
import { BookmarkStar } from "../components/BookmarkStar.jsx";
import { readGuestBookmarks, setGuestUnitCompleted, toggleGuestBookmark } from "../lib/guestStore.js";

/**
 * 진도·보관함 상태의 분기 검증 (설계/05 §8).
 * ★ 낙관적 갱신·실패 되돌림과 병합 배너 3선택은 컨텍스트가 책임진다.
 */
function Harness() {
  const { isBookmarked, toggleBookmark, alert } = useUserData();
  return (
    <>
      <MergeBanner />
      <BookmarkStar
        name="人"
        on={isBookmarked("kanji", 11)}
        onToggle={(next) => toggleBookmark("kanji", 11, next)}
      />
      {alert && <p data-testid="alert">{alert.message}</p>}
    </>
  );
}

function renderHarness({ authenticated, handler }) {
  const fetchMock = stubFetch((url, options) => {
    if (url.includes("/api/users/me")) {
      return authenticated
        ? apiSuccess({ username: "u", nickname: "n" })
        : apiError(401, "NOT_AUTHENTICATED");
    }
    return handler ? handler(url, options) : apiSuccess(null);
  });
  render(
    <MemoryRouter>
      <AuthProvider>
        <UserDataProvider>
          <Harness />
        </UserDataProvider>
      </AuthProvider>
    </MemoryRouter>,
  );
  return fetchMock;
}

beforeEach(() => {
  window.localStorage.clear();
});

describe("★ 토글 (AC-B-01·24, AC-G-06)", () => {
  it("게스트가 담으면 즉시 ★가 되고 localStorage에 남는다", async () => {
    const user = userEvent.setup();
    renderHarness({ authenticated: false });

    await user.click(await screen.findByRole("button", { name: /人/ }));

    expect(screen.getByRole("button", { name: /人/ })).toHaveAttribute("aria-pressed", "true");
    expect(readGuestBookmarks().kanji).toEqual([11]);
  });

  it("회원 저장이 실패하면 별이 원래 상태로 되돌아가고 알림이 뜬다", async () => {
    const user = userEvent.setup();
    renderHarness({
      authenticated: true,
      handler: (url) => (url.includes("/api/bookmarks/kanji/11") ? apiError(500, "INTERNAL_ERROR") : apiSuccess({ kanji: [], grammar: [], vocabulary: [] })),
    });

    await user.click(await screen.findByRole("button", { name: /人/ }));

    await waitFor(() => expect(screen.getByRole("button", { name: /人/ })).toHaveAttribute("aria-pressed", "false"));
    expect(screen.getByTestId("alert")).toHaveTextContent("저장하지 못했어요.");
  });

  it("게스트 상한을 넘기면 별이 켜지지 않고 상한 안내가 뜬다 (깜빡임 없음)", async () => {
    const user = userEvent.setup();
    for (let i = 100; i < 300; i += 1) toggleGuestBookmark("kanji", i, true);
    renderHarness({ authenticated: false });

    await user.click(await screen.findByRole("button", { name: /人/ }));

    expect(screen.getByRole("button", { name: /人/ })).toHaveAttribute("aria-pressed", "false");
    expect(screen.getByTestId("alert")).toHaveTextContent("200개까지 담을 수 있어요");
    expect(readGuestBookmarks().kanji).not.toContain(11);
  });
});

describe("병합 배너 3선택 (AC-G-07~11)", () => {
  const guestRecord = () => {
    setGuestUnitCompleted(2, 1, true);
    toggleGuestBookmark("kanji", 12, true);
  };

  it("브라우저 기록이 없으면 배너가 뜨지 않는다 (AC-G-11)", async () => {
    renderHarness({ authenticated: true });

    await screen.findByRole("button", { name: /人/ });
    expect(screen.queryByText(/이 브라우저에 저장된 학습 기록이 있어요/)).toBeNull();
  });

  it("기록이 있으면 숫자와 함께 배너가 뜨고 [합치기]는 primary가 아니다", async () => {
    guestRecord();
    renderHarness({ authenticated: true });

    expect(await screen.findByText(/완료 1유닛 · 보관함 1개/)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "합치기" }).className).not.toContain("primary");
  });

  it("[합치기] 성공이면 병합 API를 부르고 브라우저 기록을 지운다 (AC-G-08)", async () => {
    const user = userEvent.setup();
    guestRecord();
    const fetchMock = renderHarness({
      authenticated: true,
      handler: (url) =>
        url.includes("/api/me/merge")
          ? apiSuccess({ completedUnitCount: 3, bookmarkCounts: { kanji: 1, grammar: 0, vocabulary: 0, total: 1 } })
          : apiSuccess({ completedUnits: [], lastPosition: null, kanji: [], grammar: [], vocabulary: [] }),
    });

    await user.click(await screen.findByRole("button", { name: "합치기" }));

    await waitFor(() => expect(screen.getByText(/합쳤어요/)).toBeInTheDocument());
    expect(fetchMock.mock.calls.some(([url]) => String(url).includes("/api/me/merge"))).toBe(true);
    expect(window.localStorage.getItem("jp.guest.v1")).toBeNull();
  });

  it("[합치기] 실패면 배너가 남고 브라우저 기록도 남는다", async () => {
    const user = userEvent.setup();
    guestRecord();
    renderHarness({
      authenticated: true,
      handler: (url) => (url.includes("/api/me/merge") ? apiError(500, "INTERNAL_ERROR") : apiSuccess(null)),
    });

    await user.click(await screen.findByRole("button", { name: "합치기" }));

    expect(await screen.findByText(/합치지 못했어요/)).toBeInTheDocument();
    expect(window.localStorage.getItem("jp.guest.v1")).not.toBeNull();
  });

  it("[내 기록 아니에요]는 서버를 부르지 않고 기록만 지운다 (AC-G-09)", async () => {
    const user = userEvent.setup();
    guestRecord();
    const fetchMock = renderHarness({ authenticated: true });

    await user.click(await screen.findByRole("button", { name: "내 기록 아니에요" }));

    expect(await screen.findByText(/이 브라우저 기록을 지웠어요/)).toBeInTheDocument();
    expect(window.localStorage.getItem("jp.guest.v1")).toBeNull();
    expect(fetchMock.mock.calls.some(([url]) => String(url).includes("/api/me/merge"))).toBe(false);
  });

  it("[✕]는 아무것도 지우지 않는다 — 다음 로그인에 다시 뜬다 (AC-G-10)", async () => {
    const user = userEvent.setup();
    guestRecord();
    renderHarness({ authenticated: true });

    await user.click(await screen.findByRole("button", { name: "닫기" }));

    await waitFor(() => expect(screen.queryByText(/이 브라우저에 저장된 학습 기록이 있어요/)).toBeNull());
    expect(window.localStorage.getItem("jp.guest.v1")).not.toBeNull();
  });
});

/** helpers.jsx의 jsonResponse를 쓰는 경로가 있는지 확인용(계약 외 회귀 방지) */
describe("스텁 형태", () => {
  it("jsonResponse는 ok/status/json을 갖춘다", async () => {
    const response = jsonResponse({ a: 1 }, 200);
    expect(response.ok).toBe(true);
    await expect(response.json()).resolves.toEqual({ a: 1 });
  });
});

describe("어휘 대표 id 정규화 (설계/04 §6-4, 코드리뷰 Minor 4)", () => {
  function VocabHarness() {
    const { isBookmarked, toggleBookmark } = useUserData();
    return (
      <>
        <BookmarkStar name="応援" on={isBookmarked("vocabulary", 3024)} onToggle={() => toggleBookmark("vocabulary", 3024, true)} />
        <p data-testid="entry">{isBookmarked("vocabulary", 1217) ? "대표 1217 담김" : "대표 미담김"}</p>
      </>
    );
  }

  it("서버가 돌려준 targetId(대표 id)로 상태를 갱신한다 — 요청값(3024)이 아니다", async () => {
    const user = userEvent.setup();
    stubFetch((url) => {
      if (url.includes("/api/users/me")) return apiSuccess({ username: "u", nickname: "n" });
      if (url.includes("/api/bookmarks/vocabulary/3024")) {
        return apiSuccess({
          type: "VOCABULARY",
          targetId: 1217,
          bookmarked: true,
          counts: { kanji: 0, grammar: 0, vocabulary: 1, total: 1 },
        });
      }
      return apiSuccess({ kanji: [], grammar: [], vocabulary: [] });
    });
    render(
      <MemoryRouter>
        <AuthProvider>
          <UserDataProvider>
            <VocabHarness />
          </UserDataProvider>
        </AuthProvider>
      </MemoryRouter>,
    );

    await user.click(await screen.findByRole("button", { name: /応援/ }));

    await waitFor(() => expect(screen.getByTestId("entry")).toHaveTextContent("대표 1217 담김"));
    expect(screen.getByRole("button", { name: /応援/ })).toHaveAttribute("aria-pressed", "false");
  });
});
