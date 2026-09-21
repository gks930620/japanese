import { useCallback, useEffect, useState } from "react";
import { callPublicApi } from "../lib/http.js";

/**
 * 조회 캐시 상한 — 넘으면 가장 오래된 항목부터 버린다 (기술설계 SPA_상태복원 §1-2).
 * 코스 6 + 자료실 몇 페이지 + 상세 몇 개면 충분한 크기다.
 */
export const QUERY_CACHE_MAX = 50;

/** url -> { data } — "무엇이 참인가"가 아니라 "무엇을 먼저 보여줄까"만 담는다 */
const queryCache = new Map();
/** url -> Promise<{ data, error }> — 같은 URL의 동시 요청을 하나로 합친다 */
const inflight = new Map();
/** { url, notify } — invalidateQueries가 깨울, 지금 떠 있는 훅들 */
const watchers = new Set();

function writeCache(url, data) {
  queryCache.delete(url); // 다시 넣어 삽입 순서를 갱신한다(가장 오래된 것부터 밀려나게)
  queryCache.set(url, { data });
  while (queryCache.size > QUERY_CACHE_MAX) {
    const oldest = queryCache.keys().next().value;
    queryCache.delete(oldest);
  }
}

/**
 * URL 하나에 요청 하나. 이미 떠 있는 요청이 있으면 그 Promise에 합류한다.
 * 결과는 항상 { data, error } — 실패도 거절이 아니라 값으로 돌려준다(호출부가 분기하기 쉽게).
 */
function requestQuery(url) {
  const joined = inflight.get(url);
  if (joined) return joined;

  let promise = null;
  const settle = (result) => {
    // 무효화·초기화로 밀려난 옛 요청은 캐시에 쓰지 않는다(뒤늦은 응답이 새 진실을 덮지 않게)
    if (inflight.get(url) === promise) {
      inflight.delete(url);
      if (result.error) queryCache.delete(url);
      else writeCache(url, result.data);
    }
    return result;
  };

  promise = callPublicApi(url).then(
    (body) => settle({ data: body?.data ?? null, error: null }),
    (error) => settle({ data: null, error }),
  );
  inflight.set(url, promise);
  return promise;
}

/**
 * 접두사가 맞는 캐시 항목을 버리고, 그 URL로 떠 있는 훅에 재요청을 시킨다.
 * 떠 있는 훅은 **데이터를 유지한 채** 다시 부른다 — 부분 교체(설계/05 §8).
 * 쓰기(작성·수정·삭제) 직후처럼 "내가 방금 쓴 것"이 보여야 하는 화면에서만 쓴다.
 *
 * @param {string} prefix 예: "/api/communities"
 */
export function invalidateQueries(prefix) {
  queryCache.forEach((_value, url) => {
    if (url.startsWith(prefix)) queryCache.delete(url);
  });
  inflight.forEach((_value, url) => {
    if (url.startsWith(prefix)) inflight.delete(url);
  });
  watchers.forEach((watcher) => {
    if (watcher.url.startsWith(prefix)) watcher.notify();
  });
}

/**
 * 캐시를 전부 비운다(재요청 없음). 인증 상태가 바뀔 때 호출한다 —
 * 지금은 공개 GET만 캐시하지만, 인증에 따라 갈리는 응답이 훗날 들어와도 남의 화면이 새지 않게.
 */
export function clearQueryCache() {
  queryCache.clear();
  inflight.clear();
}

/**
 * GET 전용 조회 훅 — 반복되는 fetch/loading/error 패턴 일원화 (컨벤션 §7).
 * 공개 API(코스·유닛 등 인증 불필요 GET)에 쓴다. url이 바뀌면 다시 불러온다.
 *
 * 캐시는 stale-while-revalidate다: 캐시가 있으면 **첫 렌더에서 곧바로** 그 값을 내고(loading=false)
 * 뒤에서 조용히 다시 불러 결과로 갈아끼운다. 재검증이 실패하면 캐시를 버리고 error를 그대로 낸다.
 *
 * @param {string} url 호출할 API 경로 (예: "/api/courses"). null이면 조회하지 않는다
 * @param {{ keepPreviousData?: boolean }} [options]
 *        keepPreviousData: URL이 바뀌고 새 URL이 캐시에 없을 때 이전 데이터를 유지한 채 loading=true.
 *        목록의 갱신 로딩(기존 목록을 흐리게 — 설계/05 §8)에 쓴다. 상세 화면은 켜지 않는다
 * @returns {{ data: any, loading: boolean, error: object|null, reload: () => void }}
 *          error는 lib/http.js 표준 에러 객체({ status, message, errorCode, errors })
 */
export function useApiQuery(url, { keepPreviousData = false } = {}) {
  const [attempt, setAttempt] = useState(0);
  // { url, attempt, data, error } — 이 훅이 내놓은 마지막 응답. 캐시가 있으면 그것으로 시작한다(첫 렌더부터 데이터)
  const [outcome, setOutcome] = useState(() => {
    const hit = url ? queryCache.get(url) : undefined;
    return hit ? { url, attempt: 0, data: hit.data, error: null } : null;
  });

  useEffect(() => {
    // url이 없으면 조회 자체를 하지 않는다 — 조건부 조회(과정별 목록 등)를 위한 자리
    if (!url) return undefined;
    let cancelled = false;

    const run = () => {
      requestQuery(url).then((result) => {
        if (!cancelled) setOutcome({ url, attempt, data: result.data, error: result.error });
      });
    };

    // 무효화는 화면을 새로 그리는 일이 아니라 **다시 부르는 일**이다 —
    // 렌더를 한 번 끼워 넣지 않는다(쓰기 직후의 화면 이동과 뒤엉키지 않게)
    const watcher = { url, notify: run };
    watchers.add(watcher);
    run();

    return () => {
      cancelled = true;
      watchers.delete(watcher);
    };
  }, [url, attempt]);

  const reload = useCallback(() => setAttempt((n) => n + 1), []);

  const mine = outcome && outcome.url === url && outcome.attempt === attempt ? outcome : null;
  const cached = url ? queryCache.get(url) : undefined;

  let data = null;
  let error = null;
  let loading = false;
  if (mine) {
    data = mine.error ? null : mine.data;
    error = mine.error;
  } else if (cached) {
    data = cached.data; // 캐시 히트 — 기다리지 않는다. 재검증은 뒤에서 조용히
  } else {
    // 미스 — 옵션을 켠 목록만 **직전 URL의 응답**을 그대로 들고 기다린다(흐린 채 남을 재료)
    data = keepPreviousData && outcome && !outcome.error ? outcome.data : null;
    loading = true;
  }

  return { data, loading, error, reload };
}
