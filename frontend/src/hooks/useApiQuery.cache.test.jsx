// TDD Red — senior-dev 작성 (2026-09-16, 기술설계_2026-09_SPA_상태복원 §1)
//
// **조회 훅의 캐시 계약 — stale-while-revalidate.**
// 뒤로가기·재방문에서 같은 주소가 다시 마운트되면 "스켈레톤 → 데이터"를 또 겪는 것이 SSR 사이트와 다르게
// 느껴지는 첫 번째 원인이다. 캐시가 있으면 **첫 렌더에서 곧바로 데이터**를 내고, 뒤에서 조용히 다시 불러
// 결과로 갈아끼운다(설계/05 §8 "부분 교체" — 캐시된 화면 위에 스켈레톤·흐림을 얹지 않는다).
//
// 캐시는 "무엇이 참인가"가 아니라 "무엇을 먼저 보여줄까"만 정한다 — 마운트마다 재요청하므로
// 낡은 값은 한 왕복 안에 스스로 고쳐진다(08 C-1의 우려였던 무효화 규칙이 거의 필요 없는 이유).
//
// 기존 계약(`useApiQuery.test.jsx` — 첫 로딩·에러·reload·URL 변경 시 이전 응답 폐기)은 그대로다.
// 이 파일은 **캐시가 있을 때의 동작**만 고정한다(08 C-11 — 한 규칙은 한 파일).
//
// 이 테스트를 수정하지 말 것 — 계약 변경은 senior-dev 경유 (CLAUDE.md TDD 규칙 2).
import { act, render, renderHook, screen, waitFor } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { apiError, apiSuccess, stubFetch } from "../test/helpers.jsx";
import { AuthProvider } from "../context/AuthContext.jsx";
import { useAuth } from "../context/authStore.js";
import { QUERY_CACHE_MAX, clearQueryCache, invalidateQueries, useApiQuery } from "./useApiQuery.js";

/** 한 번 마운트해 응답을 받고 내린다 — 캐시를 채우는 가장 짧은 길 */
async function warm(url) {
  const { result, unmount } = renderHook(() => useApiQuery(url));
  await waitFor(() => expect(result.current.loading).toBe(false));
  unmount();
  return result;
}

describe("useApiQuery — 캐시 히트 (재방문·뒤로가기)", () => {
  it("두 번째 마운트는 첫 렌더에서 곧바로 data를 내고 loading은 false다", async () => {
    stubFetch(() => apiSuccess({ id: 2, title: "왕초보" }));
    await warm("/api/courses/2");

    const { result } = renderHook(() => useApiQuery("/api/courses/2"));

    // 첫 렌더 — 기다리지 않는다(스켈레톤이 한 프레임도 나오지 않아야 한다)
    expect(result.current.loading).toBe(false);
    expect(result.current.data).toEqual({ id: 2, title: "왕초보" });
    expect(result.current.error).toBeNull();
  });

  it("캐시를 보여주는 동안 뒤에서 다시 불러(재검증) 새 결과로 갈아끼운다", async () => {
    let version = 1;
    const fetchMock = stubFetch(() => apiSuccess({ version }));
    await warm("/api/courses");
    version = 2;

    const { result } = renderHook(() => useApiQuery("/api/courses"));
    expect(result.current.data).toEqual({ version: 1 }); // 먼저 캐시

    await waitFor(() => expect(result.current.data).toEqual({ version: 2 })); // 뒤에서 온 결과로 교체
    expect(fetchMock).toHaveBeenCalledTimes(2); // 첫 마운트 1 + 재검증 1
    expect(result.current.loading).toBe(false);
  });

  it("재검증이 실패하면 캐시를 버리고 에러를 그대로 보인다 (지워진 글은 404 카드가 맞다)", async () => {
    let fail = false;
    stubFetch(() => (fail ? apiError(404, "NOT_FOUND", "없음") : apiSuccess({ id: 7 })));
    await warm("/api/communities/7");
    fail = true;

    const { result, unmount } = renderHook(() => useApiQuery("/api/communities/7"));
    expect(result.current.data).toEqual({ id: 7 });

    await waitFor(() => expect(result.current.error).toMatchObject({ status: 404 }));
    expect(result.current.data).toBeNull();
    unmount();

    // 실패한 항목은 캐시에서도 사라졌다 — 다음 마운트는 처음처럼 로딩이다
    const again = renderHook(() => useApiQuery("/api/communities/7"));
    expect(again.result.current.loading).toBe(true);
    expect(again.result.current.data).toBeNull();
  });

  it("같은 URL을 동시에 마운트하면 요청은 한 번만 나간다 (in-flight 합류)", async () => {
    const fetchMock = stubFetch(() => apiSuccess([{ id: 1 }]));

    const a = renderHook(() => useApiQuery("/api/en/courses"));
    const b = renderHook(() => useApiQuery("/api/en/courses"));

    await waitFor(() => expect(a.result.current.data).toEqual([{ id: 1 }]));
    await waitFor(() => expect(b.result.current.data).toEqual([{ id: 1 }]));
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("URL이 바뀌었는데 그 URL이 캐시에 있으면 로딩 없이 바로 그 데이터다", async () => {
    stubFetch((url) => apiSuccess({ url }));
    await warm("/api/courses/3");

    const { result, rerender } = renderHook(({ url }) => useApiQuery(url), {
      initialProps: { url: "/api/courses/2" },
    });
    await waitFor(() => expect(result.current.data).toEqual({ url: "/api/courses/2" }));

    rerender({ url: "/api/courses/3" });

    expect(result.current.loading).toBe(false);
    expect(result.current.data).toEqual({ url: "/api/courses/3" });
  });
});

describe("useApiQuery — 옵션 keepPreviousData (목록의 갱신 로딩, 설계/05 §8)", () => {
  it("URL이 바뀌고 캐시가 없으면 이전 데이터를 유지한 채 loading=true — 스켈레톤으로 갈아끼우지 않는다", async () => {
    let release = null;
    stubFetch((url) => {
      if (url.includes("page=1")) return new Promise((resolve) => (release = () => resolve(apiSuccess({ page: 1 }))));
      return apiSuccess({ page: 0 });
    });

    const { result, rerender } = renderHook(({ url }) => useApiQuery(url, { keepPreviousData: true }), {
      initialProps: { url: "/api/library/kanji?page=0" },
    });
    await waitFor(() => expect(result.current.data).toEqual({ page: 0 }));

    rerender({ url: "/api/library/kanji?page=1" });

    expect(result.current.loading).toBe(true);
    expect(result.current.data).toEqual({ page: 0 }); // 옛 목록이 흐린 채 남아 있을 재료

    act(() => release());
    await waitFor(() => expect(result.current.data).toEqual({ page: 1 }));
    expect(result.current.loading).toBe(false);
  });

  it("옵션이 없으면 기존 계약 그대로 이전 데이터를 버린다 (회귀 — useApiQuery.test.jsx가 기준)", async () => {
    stubFetch((url) => apiSuccess({ url }));
    const { result, rerender } = renderHook(({ url }) => useApiQuery(url), {
      initialProps: { url: "/api/courses/2" },
    });
    await waitFor(() => expect(result.current.data).toEqual({ url: "/api/courses/2" }));

    rerender({ url: "/api/courses/3" });

    expect(result.current.data).toBeNull();
  });
});

describe("useApiQuery — 무효화·초기화·상한", () => {
  it("invalidateQueries(prefix)는 접두사가 맞는 항목을 버리고, 떠 있는 훅은 데이터를 유지한 채 다시 부른다", async () => {
    let version = 1;
    const fetchMock = stubFetch(() => apiSuccess({ version }));
    const { result } = renderHook(() => useApiQuery("/api/communities?page=0&size=10"));
    await waitFor(() => expect(result.current.data).toEqual({ version: 1 }));
    version = 2;

    act(() => invalidateQueries("/api/communities"));

    // 다시 부르는 동안에도 화면은 비지 않는다 — 부분 교체(설계/05 §8)
    expect(result.current.data).toEqual({ version: 1 });
    expect(result.current.loading).toBe(false);
    await waitFor(() => expect(result.current.data).toEqual({ version: 2 }));
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("invalidateQueries는 접두사가 다른 항목을 건드리지 않는다", async () => {
    stubFetch((url) => apiSuccess({ url }));
    await warm("/api/courses");
    await warm("/api/communities?page=0");

    act(() => invalidateQueries("/api/communities"));

    const courses = renderHook(() => useApiQuery("/api/courses"));
    expect(courses.result.current.loading).toBe(false); // 살아 있다
    courses.unmount();
    const posts = renderHook(() => useApiQuery("/api/communities?page=0"));
    expect(posts.result.current.loading).toBe(true); // 버려졌다
  });

  it("clearQueryCache()는 전부 비운다 — 다음 마운트는 처음처럼 로딩이다", async () => {
    stubFetch(() => apiSuccess({ ok: true }));
    await warm("/api/courses");

    clearQueryCache();

    const { result } = renderHook(() => useApiQuery("/api/courses"));
    expect(result.current.loading).toBe(true);
    expect(result.current.data).toBeNull();
  });

  it("상한(QUERY_CACHE_MAX)을 넘으면 가장 오래된 항목부터 버린다", async () => {
    stubFetch((url) => apiSuccess({ url }));
    expect(typeof QUERY_CACHE_MAX).toBe("number");
    expect(QUERY_CACHE_MAX).toBeGreaterThan(0);

    for (let i = 0; i <= QUERY_CACHE_MAX; i += 1) {
      await warm(`/api/library/kanji?page=${i}`);
    }

    const oldest = renderHook(() => useApiQuery("/api/library/kanji?page=0"));
    expect(oldest.result.current.loading).toBe(true); // 밀려났다
    oldest.unmount();
    const newest = renderHook(() => useApiQuery(`/api/library/kanji?page=${QUERY_CACHE_MAX}`));
    expect(newest.result.current.loading).toBe(false); // 남아 있다
  });

  it("reload()는 캐시가 있으면 데이터를 유지한 채 다시 부른다 (에러 후 reload는 기존 계약 그대로)", async () => {
    let version = 1;
    stubFetch(() => apiSuccess({ version }));
    const { result } = renderHook(() => useApiQuery("/api/courses"));
    await waitFor(() => expect(result.current.data).toEqual({ version: 1 }));
    version = 2;

    act(() => result.current.reload());

    expect(result.current.data).toEqual({ version: 1 });
    await waitFor(() => expect(result.current.data).toEqual({ version: 2 }));
  });
});

/** 로그인·로그아웃 버튼만 있는 최소 화면 — AuthProvider의 login/logout이 캐시를 비우는지 본다 */
function AuthButtons() {
  const { login, logout, status } = useAuth();
  return (
    <div>
      <span data-testid="status">{status}</span>
      <button type="button" onClick={() => login({ username: "u", password: "p" })}>
        login
      </button>
      <button type="button" onClick={() => logout()}>
        logout
      </button>
    </div>
  );
}

describe("useApiQuery — 인증 상태가 바뀌면 캐시를 비운다", () => {
  function stubAuth(me) {
    return stubFetch((url) => {
      if (url.includes("/api/users/me")) return me ? apiSuccess(me) : apiError(401, "NOT_AUTHENTICATED");
      if (url.includes("/api/login") || url.includes("/api/logout")) return apiSuccess(null);
      return apiSuccess({ ok: true });
    });
  }

  it("로그아웃하면 다음 마운트는 처음처럼 로딩이다", async () => {
    stubAuth({ id: 3, username: "u", nickname: "한창희" });
    render(
      <AuthProvider>
        <AuthButtons />
      </AuthProvider>,
    );
    await screen.findByText("authenticated");
    await warm("/api/courses");
    // 전제 확인 — 캐시가 실제로 차 있다(이 줄이 없으면 캐시가 없을 때도 통과하는 공허한 테스트가 된다)
    const cached = renderHook(() => useApiQuery("/api/courses"));
    expect(cached.result.current.loading).toBe(false);
    cached.unmount();

    await act(async () => {
      screen.getByRole("button", { name: "logout" }).click();
    });
    await screen.findByText("guest");

    const { result } = renderHook(() => useApiQuery("/api/courses"));
    expect(result.current.loading).toBe(true);
  });

  it("로그인하면 다음 마운트는 처음처럼 로딩이다", async () => {
    stubAuth(null);
    render(
      <AuthProvider>
        <AuthButtons />
      </AuthProvider>,
    );
    await screen.findByText("guest");
    await warm("/api/courses");
    // 전제 확인 — 캐시가 실제로 차 있다
    const cached = renderHook(() => useApiQuery("/api/courses"));
    expect(cached.result.current.loading).toBe(false);
    cached.unmount();

    // 로그인 이후의 /api/users/me 는 사용자다
    stubFetch((url) => {
      if (url.includes("/api/users/me")) return apiSuccess({ id: 3, username: "u", nickname: "한창희" });
      return apiSuccess(null);
    });
    await act(async () => {
      screen.getByRole("button", { name: "login" }).click();
    });
    await screen.findByText("authenticated");

    const { result } = renderHook(() => useApiQuery("/api/courses"));
    expect(result.current.loading).toBe(true);
  });
});
