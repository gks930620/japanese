import { renderHook, waitFor, act } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { apiError, apiSuccess, stubFetch } from "../test/helpers.jsx";
import { useApiQuery } from "./useApiQuery.js";

describe("useApiQuery", () => {
  it("로딩 → 성공: ApiResponse의 data만 꺼내 준다", async () => {
    stubFetch(() => apiSuccess({ id: 2, title: "왕초보" }));

    const { result } = renderHook(() => useApiQuery("/api/courses/2"));
    expect(result.current.loading).toBe(true);
    expect(result.current.data).toBeNull();

    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.data).toEqual({ id: 2, title: "왕초보" });
    expect(result.current.error).toBeNull();
  });

  it("실패하면 표준 에러 객체(status·errorCode)를 준다", async () => {
    stubFetch(() => apiError(404, "NOT_FOUND", "없음"));

    const { result } = renderHook(() => useApiQuery("/api/courses/999"));

    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.data).toBeNull();
    expect(result.current.error).toMatchObject({ status: 404, errorCode: "NOT_FOUND" });
  });

  it("reload()는 같은 URL을 다시 호출한다 (오류 화면의 '다시 시도')", async () => {
    let attempt = 0;
    const fetchMock = stubFetch(() => {
      attempt += 1;
      return attempt === 1 ? apiError(500, "INTERNAL_ERROR") : apiSuccess({ ok: true });
    });

    const { result } = renderHook(() => useApiQuery("/api/courses"));
    await waitFor(() => expect(result.current.error).not.toBeNull());

    act(() => result.current.reload());

    await waitFor(() => expect(result.current.data).toEqual({ ok: true }));
    expect(result.current.error).toBeNull();
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("URL이 바뀌면 이전 URL의 응답을 버린다 (경쟁 상태 방지)", async () => {
    stubFetch((url) => apiSuccess({ url }));

    const { result, rerender } = renderHook(({ url }) => useApiQuery(url), {
      initialProps: { url: "/api/courses/2" },
    });
    await waitFor(() => expect(result.current.data).toEqual({ url: "/api/courses/2" }));

    rerender({ url: "/api/courses/3" });
    // 새 URL의 결과가 오기 전에는 이전 데이터를 노출하지 않는다
    expect(result.current.loading).toBe(true);
    expect(result.current.data).toBeNull();

    await waitFor(() => expect(result.current.data).toEqual({ url: "/api/courses/3" }));
  });
});
