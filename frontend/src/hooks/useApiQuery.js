import { useCallback, useEffect, useState } from "react";
import { callPublicApi } from "../lib/http.js";

/**
 * GET 전용 조회 훅 — 반복되는 fetch/loading/error 패턴 일원화 (컨벤션 §7).
 * 공개 API(코스·유닛 등 인증 불필요 GET)에 쓴다. url이 바뀌면 다시 불러온다.
 * loading은 "현재 key의 결과가 아직 없음"으로 파생 계산한다 (effect에서 동기 setState 없음).
 *
 * @param {string} url 호출할 API 경로 (예: "/api/courses")
 * @returns {{ data: any, loading: boolean, error: object|null, reload: () => void }}
 *          error는 lib/http.js 표준 에러 객체({ status, message, errorCode, errors })
 */
export function useApiQuery(url) {
  const [attempt, setAttempt] = useState(0);
  const [result, setResult] = useState(null); // { key, data, error }
  const key = `${url}#${attempt}`;

  useEffect(() => {
    // url이 없으면 조회 자체를 하지 않는다 — 조건부 조회(과정별 목록 등)를 위한 자리
    if (!url) return undefined;
    let cancelled = false;

    callPublicApi(url)
      .then((body) => {
        if (!cancelled) setResult({ key, data: body?.data ?? null, error: null });
      })
      .catch((e) => {
        if (!cancelled) setResult({ key, data: null, error: e });
      });

    return () => {
      cancelled = true;
    };
  }, [key, url]);

  const reload = useCallback(() => setAttempt((n) => n + 1), []);

  const current = result && result.key === key ? result : null;
  return {
    data: current?.data ?? null,
    loading: current == null,
    error: current?.error ?? null,
    reload,
  };
}
