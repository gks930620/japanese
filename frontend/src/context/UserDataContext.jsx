import { useCallback, useEffect, useMemo, useState } from "react";
import { useAuth } from "./authStore.js";
import { UserDataContext } from "./userDataStore.js";
import * as userData from "../lib/userData.js";

/**
 * 진도·보관함 상태의 단일 보관처.
 * 게스트/회원 분기는 lib/userData.js가 이미 가두고 있고, 여기서는 **화면이 공유하는 상태**만 다룬다:
 *   - 진도(완료 유닛·마지막 위치) · ★ id 집합 · 종류별 개수
 *   - ★ / 완료 토글의 낙관적 갱신과 실패 되돌림 (설계/05 §8)
 *   - 인라인 알림 1개(§4-3) · 병합 배너 상태(§4-4)
 *
 * 조회 실패는 조용히 "기록 없음"으로 떨어진다 — 진도 때문에 에러 카드를 만들지 않는다(AC-P-28).
 */

const EMPTY_PROGRESS = { completedUnits: [], lastPosition: null };
const EMPTY_IDS = { kanji: [], grammar: [], vocabulary: [] };
const EMPTY_COUNTS = { kanji: 0, grammar: 0, vocabulary: 0, total: 0 };

function countsOf(ids) {
  const counts = {
    kanji: ids.kanji.length,
    grammar: ids.grammar.length,
    vocabulary: ids.vocabulary.length,
  };
  return { ...counts, total: counts.kanji + counts.grammar + counts.vocabulary };
}

const LIMIT_MESSAGE = `로그인하지 않으면 종류별 ${userData.GUEST_BOOKMARK_LIMIT}개까지 담을 수 있어요.`;

export function UserDataProvider({ children }) {
  const { isAuthenticated, status } = useAuth();
  const [progress, setProgress] = useState(EMPTY_PROGRESS);
  const [bookmarkIds, setBookmarkIds] = useState(EMPTY_IDS);
  const [counts, setCounts] = useState(EMPTY_COUNTS);
  const [alert, setAlert] = useState(null); // {tone: "warn"|"plain", message}
  const [merge, setMerge] = useState({ state: null, counts: null, result: null });
  // 첫 조회가 끝났는지 — 개수에 따라 기본 탭이 갈리는 화면(보관함)이 값을 기다려야 한다
  const [ready, setReady] = useState(false);

  // 인증 상태가 정해진 뒤(또는 바뀐 뒤) 진도·보관함을 읽는다.
  // 로그인 직후 브라우저에 기록이 있으면 병합 배너를 띄운다(AC-G-07·11).
  useEffect(() => {
    if (status === "loading") return undefined;
    let cancelled = false;

    Promise.all([userData.fetchProgress(isAuthenticated), userData.fetchBookmarkIds(isAuthenticated)])
      .then(([nextProgress, nextIds]) => {
        if (cancelled) return;
        const ids = nextIds ?? EMPTY_IDS;
        setProgress(nextProgress ?? EMPTY_PROGRESS);
        setBookmarkIds(ids);
        setCounts(countsOf(ids));
        setReady(true);
        if (isAuthenticated && userData.hasGuestRecord()) {
          setMerge({ state: "ASK", counts: userData.guestCounts(), result: null });
        }
      })
      .catch(() => {
        if (cancelled) return;
        setProgress(EMPTY_PROGRESS);
        setBookmarkIds(EMPTY_IDS);
        setCounts(EMPTY_COUNTS);
        setReady(true);
      });

    return () => {
      cancelled = true;
    };
  }, [isAuthenticated, status]);

  const showAlert = useCallback((message, tone = "plain") => {
    setAlert({ message, tone });
    setTimeout(() => setAlert(null), 5000);
  }, []);

  const isBookmarked = useCallback(
    (type, targetId) => (bookmarkIds[type] ?? []).includes(targetId),
    [bookmarkIds],
  );

  /**
   * ★ 토글.
   * - **게스트**: 저장이 동기라 낙관적 갱신이 필요 없다. `userData.toggleBookmark`가 돌려준
   *   `ids`를 그대로 세팅한다 — 상한(200) 판정이 guestStore 한 곳에만 남고 깜빡임도 없다(AC-G-06).
   * - **회원**: 낙관적으로 즉시 바꾸고, 실패하면 되돌린 뒤 인라인 알림을 띄운다(AC-B-24).
   *   성공 응답의 `targetId`는 **서버가 정규화한 값**이므로 요청값이 아니라 응답값으로 갱신한다(설계/04 §6-4).
   */
  const toggleBookmark = useCallback(
    async (type, targetId, nextOn) => {
      const before = bookmarkIds;

      if (!isAuthenticated) {
        const result = await userData.toggleBookmark(false, type, targetId, nextOn);
        if (!result.ok) {
          showAlert(result.reason === "LIMIT" ? LIMIT_MESSAGE : "저장하지 못했어요.", result.reason === "LIMIT" ? "warn" : "plain");
          return result;
        }
        setBookmarkIds(result.ids);
        setCounts(countsOf(result.ids));
        return result;
      }

      const current = before[type] ?? [];
      const optimistic = {
        ...before,
        [type]: nextOn
          ? [targetId, ...current.filter((id) => id !== targetId)]
          : current.filter((id) => id !== targetId),
      };
      setBookmarkIds(optimistic);
      setCounts(countsOf(optimistic));

      const result = await userData.toggleBookmark(true, type, targetId, nextOn);
      if (!result.ok) {
        setBookmarkIds(before);
        setCounts(countsOf(before));
        showAlert("저장하지 못했어요.");
        return result;
      }

      // 어휘는 서버가 대표 id로 정규화한다(설계/04 §6-4) — 요청한 3024가 1217로 돌아올 수 있다
      const savedId = result.data?.targetId ?? targetId;
      if (savedId !== targetId) {
        const withoutRequested = optimistic[type].filter((id) => id !== targetId && id !== savedId);
        setBookmarkIds({
          ...optimistic,
          [type]: nextOn ? [savedId, ...withoutRequested] : withoutRequested,
        });
      }
      if (result.data?.counts) setCounts(result.data.counts);
      return result;
    },
    [bookmarkIds, isAuthenticated, showAlert],
  );

  /** 완료 토글 — 손으로 누른 동작이라 실패하면 되돌리고 호출자에게 알린다(AC-P-27) */
  const setUnitCompleted = useCallback(
    async (courseId, unitNo, completed) => {
      const before = progress;
      const rest = before.completedUnits.filter((unit) => !(unit.courseId === courseId && unit.unitNo === unitNo));
      setProgress({ ...before, completedUnits: completed ? [...rest, { courseId, unitNo }] : rest });

      const result = await userData.setUnitCompleted(isAuthenticated, courseId, unitNo, completed);
      if (!result.ok) setProgress(before);
      return result;
    },
    [isAuthenticated, progress],
  );

  /** 마지막 위치 — 자동 저장이라 실패해도 아무것도 알리지 않는다(AC-P-25·26) */
  const saveLastPosition = useCallback(
    (courseId, unitNo, stepKey) => {
      const now = new Date();
      setProgress((prev) => ({
        ...prev,
        lastPosition: { courseId, unitNo, stepKey, updatedAt: now.toISOString() },
      }));
      return userData.saveLastPosition(isAuthenticated, { courseId, unitNo, stepKey }, now);
    },
    [isAuthenticated],
  );

  const clearBookmarks = useCallback(
    async (type) => {
      const result = await userData.clearBookmarks(isAuthenticated, type);
      if (result.ok) {
        const next = { ...bookmarkIds, [type]: [] };
        setBookmarkIds(next);
        setCounts(countsOf(next));
      }
      return result;
    },
    [bookmarkIds, isAuthenticated],
  );

  const clearProgress = useCallback(async () => {
    const result = await userData.clearProgress(isAuthenticated);
    if (result.ok) setProgress(EMPTY_PROGRESS);
    return result;
  }, [isAuthenticated]);

  /** [이 브라우저 기록 지우기] — 비로그인 화면에서만 쓴다 */
  const discardGuestData = useCallback(() => {
    userData.discardGuestData();
    setProgress(EMPTY_PROGRESS);
    setBookmarkIds(EMPTY_IDS);
    setCounts(EMPTY_COUNTS);
  }, []);

  /* ── 병합 배너 3선택 (§4-4) ─────────────────── */

  const mergeGuest = useCallback(async () => {
    setMerge((prev) => ({ ...prev, state: "MERGING" }));
    const result = await userData.mergeGuestData();
    if (!result.ok) {
      setMerge((prev) => ({ ...prev, state: "FAILED" }));
      return result;
    }

    const [nextProgress, nextIds] = await Promise.all([
      userData.fetchProgress(true),
      userData.fetchBookmarkIds(true),
    ]);
    const ids = nextIds ?? EMPTY_IDS;
    setProgress(nextProgress ?? EMPTY_PROGRESS);
    setBookmarkIds(ids);
    setCounts(countsOf(ids));
    setMerge({
      state: "MERGED",
      counts: null,
      result: {
        completedUnitCount: result.data?.completedUnitCount ?? nextProgress?.completedUnits.length ?? 0,
        bookmarkCount: result.data?.bookmarkCounts?.total ?? countsOf(ids).total,
      },
    });
    setTimeout(() => setMerge({ state: null, counts: null, result: null }), 3000);
    return result;
  }, []);

  /** [내 기록 아니에요] — 서버 호출 없이 브라우저 기록만 버린다(AC-G-09) */
  const discardMerge = useCallback(() => {
    userData.discardGuestData();
    setMerge({ state: "DISCARDED", counts: null, result: null });
    setTimeout(() => setMerge({ state: null, counts: null, result: null }), 2000);
  }, []);

  /** [✕] — 아무것도 지우지 않는다. 다음 로그인에 다시 뜬다(AC-G-10) */
  const closeMerge = useCallback(() => setMerge({ state: null, counts: null, result: null }), []);

  const value = useMemo(
    () => ({
      ready,
      isAuthenticated,
      progress,
      bookmarkIds,
      bookmarkCounts: counts,
      alert,
      showAlert,
      dismissAlert: () => setAlert(null),
      isBookmarked,
      toggleBookmark,
      setUnitCompleted,
      saveLastPosition,
      clearBookmarks,
      clearProgress,
      discardGuestData,
      merge,
      mergeGuest,
      discardMerge,
      closeMerge,
    }),
    [
      alert,
      bookmarkIds,
      clearBookmarks,
      clearProgress,
      closeMerge,
      counts,
      discardGuestData,
      discardMerge,
      isAuthenticated,
      isBookmarked,
      merge,
      mergeGuest,
      progress,
      ready,
      saveLastPosition,
      setUnitCompleted,
      showAlert,
      toggleBookmark,
    ],
  );

  return <UserDataContext.Provider value={value}>{children}</UserDataContext.Provider>;
}

