import { useCallback, useMemo } from "react";
import { useLocation, useNavigate, useSearchParams } from "react-router-dom";
import { useApiQuery } from "./useApiQuery.js";
import { buildLibraryApiUrl, buildLibrarySearch, parseLibraryParams } from "../lib/libraryQuery.js";

/**
 * 자료실 목록 공통 훅 — 주소(쿼리스트링)를 단일 출처로 삼아 목록을 조회한다 (설계/05 §9).
 *
 * @param {string} endpoint API 경로 (예: "/api/library/kanji")
 * @param {number} size 페이지 크기 (자료실별 고정)
 * @returns {{
 *   params: object, page: object|null, loading: boolean, error: object|null,
 *   reload: () => void, setParams: (patch: object, options?: {replace?: boolean}) => void, reset: () => void
 * }}
 */
export function useLibraryList(endpoint, size) {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { pathname } = useLocation();

  const search = searchParams.toString();
  const params = useMemo(() => parseLibraryParams(search), [search]);
  // 페이지·필터가 바뀌어도 옛 목록을 버리지 않는다 — 새 응답이 올 때까지 흐린 채로 남는다(설계/05 §8 갱신 로딩)
  const { data, loading, error, reload } = useApiQuery(buildLibraryApiUrl(endpoint, params, size), {
    keepPreviousData: true,
  });

  /**
   * 조건 변경 — page를 함께 주지 않으면 1페이지로 되돌린다 (인수 7).
   * 검색어 디바운스처럼 히스토리를 쌓지 말아야 할 때는 { replace: true }.
   */
  const setParams = useCallback(
    (patch, { replace = false } = {}) => {
      const next = { ...params, ...patch };
      if (!("page" in patch)) next.page = 1;
      navigate(`${pathname}${buildLibrarySearch(next)}`, { replace });
    },
    [navigate, params, pathname],
  );

  /** [초기화] — 쿼리 없는 기본 주소로 (인수 33) */
  const reset = useCallback(() => navigate(pathname), [navigate, pathname]);

  return { params, page: data, loading, error, reload, setParams, reset };
}
