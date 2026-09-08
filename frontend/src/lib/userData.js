// 게스트 / 회원 분기의 **유일한 자리** (설계/04 §6-6).
// 화면 컴포넌트는 이 모듈만 보고, 기록이 서버에 있는지 localStorage에 있는지 알지 못한다.
//
// 규칙 두 가지가 여기서 강제된다:
//   ① 로그인 상태에서는 localStorage에 쓰지 않는다 (§7-3 — 쓰면 로그아웃 후 남의 기록이 되살아난다)
//   ② 자동 저장 실패는 조용히 삼키고, 손으로 누른 완료 토글 실패만 호출자에게 알린다 (설계/05 §8·AC-P-27)
import { callApi, callPublicApi } from "./http.js";
import {
  GUEST_BOOKMARK_LIMIT,
  clearGuestBookmarks,
  clearGuestData,
  clearGuestProgress,
  guestRecordCounts,
  hasGuestRecord as storeHasGuestRecord,
  readGuestBookmarks,
  readGuestProgress,
  setGuestLastPosition,
  setGuestUnitCompleted,
  toggleGuestBookmark,
} from "./guestStore.js";

const EMPTY_PROGRESS = { completedUnits: [], lastPosition: null };
const EMPTY_IDS = { kanji: [], grammar: [], vocabulary: [] };

function emptyPage(size) {
  return { content: [], page: 0, size, totalElements: 0, totalAll: 0, totalPages: 0, first: true, last: true };
}

/** 자동 저장·조회처럼 "실패해도 학습을 막지 않는" 호출용 래퍼 */
async function quiet(request, fallback) {
  try {
    return await request();
  } catch {
    return fallback;
  }
}

/* ── 진도 ─────────────────────────────────────── */

/** 내 진도 전체. 게스트/회원의 응답 모양이 같아 화면은 구분하지 않는다. */
export async function fetchProgress(isAuthenticated) {
  if (!isAuthenticated) return readGuestProgress();
  const body = await quiet(() => callApi("/api/progress"), null);
  return body?.data ?? EMPTY_PROGRESS;
}

/**
 * 마지막 위치 저장 — **자동 저장**이라 실패를 알리지 않는다(스피너·토스트 금지).
 * @param {Date} now 게스트 저장에 쓰는 시각(주입). 회원은 서버 시각을 쓴다.
 */
export async function saveLastPosition(isAuthenticated, { courseId, unitNo, stepKey }, now) {
  if (!isAuthenticated) {
    setGuestLastPosition({ courseId, unitNo, stepKey }, now);
    return { ok: true };
  }
  return quiet(
    async () => {
      await callApi("/api/progress/last-position", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ courseId, unitNo, stepKey }),
      });
      return { ok: true };
    },
    { ok: false },
  );
}

/**
 * 완료 켜기/끄기 — **손으로 누른 동작**이라 실패를 그대로 돌려준다(화면이 토글을 되돌린다).
 * 정리 스텝 도달 자동 완료도 이 함수를 쓰되, 호출은 **도달 전환 시점 1회**여야 한다(설계/04 §6-3).
 */
export async function setUnitCompleted(isAuthenticated, courseId, unitNo, completed) {
  if (!isAuthenticated) {
    setGuestUnitCompleted(courseId, unitNo, completed);
    return { ok: true };
  }
  try {
    const body = await callApi(`/api/progress/units/${courseId}/${unitNo}/completion`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ completed }),
    });
    return { ok: true, data: body?.data ?? null };
  } catch (error) {
    return { ok: false, error };
  }
}

/** 학습 기록 초기화 — 보관함은 남는다 (AC-P-30). 사용자가 누른 동작이라 실패를 알린다. */
export async function clearProgress(isAuthenticated) {
  if (!isAuthenticated) {
    clearGuestProgress();
    return { ok: true };
  }
  try {
    const body = await callApi("/api/progress", { method: "DELETE" });
    return { ok: true, data: body?.data ?? null };
  } catch (error) {
    return { ok: false, error };
  }
}

/* ── 보관함 ───────────────────────────────────── */

/* 개수(summary)는 별도로 조회하지 않는다 — ids 길이와 담기/빼기 응답의 counts로 유지된다.
   같은 사실의 두 번째 출처를 두면 두 값이 어긋난다(설계/04 §6-4가 counts를 함께 내리는 이유). */

/** ★ 판정용 id 집합 3종 — 화면은 `ids[type].includes(id)` 하나로 판정한다(설계/04 §6-4). */
export async function fetchBookmarkIds(isAuthenticated) {
  if (!isAuthenticated) return readGuestBookmarks();
  const body = await quiet(() => callApi("/api/bookmarks/ids"), null);
  return body?.data ?? EMPTY_IDS;
}


/**
 * 담기/빼기.
 * 게스트는 상한(200)에 걸리면 `{ok:false, reason:"LIMIT"}`,
 * 회원은 서버 응답(정규화된 targetId·counts)을 그대로 돌려준다 — 화면은 요청값이 아니라 응답값으로 갱신한다.
 */
export async function toggleBookmark(isAuthenticated, type, targetId, bookmarked) {
  if (!isAuthenticated) {
    const result = toggleGuestBookmark(type, targetId, bookmarked);
    return { ok: result.ok, reason: result.reason, ids: result.bookmarks };
  }
  try {
    const body = await callApi(`/api/bookmarks/${type}/${targetId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ bookmarked }),
    });
    return { ok: true, reason: null, data: body?.data ?? null };
  } catch (error) {
    return { ok: false, reason: "ERROR", error };
  }
}

/** 그 종류만 비우기 (AC-B-21) */
export async function clearBookmarks(isAuthenticated, type) {
  if (!isAuthenticated) {
    clearGuestBookmarks(type);
    return { ok: true };
  }
  try {
    const body = await callApi(`/api/bookmarks/${type}`, { method: "DELETE" });
    return { ok: true, data: body?.data ?? null };
  } catch (error) {
    return { ok: false, error };
  }
}

/**
 * 보관함 목록 — 회원은 `/api/bookmarks/{type}`, 게스트는 **자료실 + ids 필터**(설계/04 §6-7).
 * 게스트의 "최근 담은 순"은 저장 순서(맨 앞이 최근)라 `sort=GIVEN`으로 매핑한다.
 *
 * ⚠️ **여기만 예외를 그대로 올린다.** 진도 조회는 조용히 실패해야 하지만(AC-P-28),
 * 보관함 목록은 실패를 **에러 카드 + [다시 시도]** 로 알려야 한다(AC-B-25 · 설계/05 §8).
 * 삼키면 34개를 담아 둔 사용자가 "아직 담은 것이 없어요"를 보고 기록이 사라진 줄 안다.
 *
 * @param {{page?: number, size: number, sort?: "RECENT"|"LEARNING", q?: string, levels?: string[]}} params
 *        page는 화면과 같은 1-base로 받는다(API로 나갈 때 0-base로 변환).
 */
export async function fetchBookmarkList(isAuthenticated, type, params) {
  const { page = 1, size, sort = "RECENT", q = "", levels = [] } = params;
  const search = new URLSearchParams();
  search.set("page", String(Math.max(0, page - 1)));
  search.set("size", String(size));
  if (q) search.set("q", q);
  if (levels.length) search.set("level", levels.join(","));

  if (isAuthenticated) {
    search.set("sort", sort);
    const body = await callApi(`/api/bookmarks/${type}?${search.toString()}`);
    return body?.data ?? emptyPage(size);
  }

  const ids = readGuestBookmarks()[type] ?? [];
  if (ids.length === 0) return emptyPage(size); // 담은 것이 없으면 서버를 부를 이유가 없다
  search.set("ids", ids.join(","));
  search.set("sort", sort === "RECENT" ? "GIVEN" : sort);
  const body = await callPublicApi(`/api/library/${type}?${search.toString()}`);
  return body?.data ?? emptyPage(size);
}

/* ── 병합 (§7-3) ──────────────────────────────── */

/**
 * 브라우저 기록 → 계정 (POST /api/me/merge).
 * 요청 바디는 localStorage 문서 그대로다. **성공했을 때만** 게스트 기록을 지운다 —
 * 실패했는데 지우면 사용자가 잃은 것을 되찾을 방법이 없다.
 */
export async function mergeGuestData() {
  const payload = { progress: readGuestProgress(), bookmarks: readGuestBookmarks() };
  try {
    const body = await callApi("/api/me/merge", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    clearGuestData();
    return { ok: true, data: body?.data ?? null };
  } catch (error) {
    return { ok: false, error };
  }
}

/** [내 기록 아니에요] — 서버 호출 없이 브라우저 기록만 버린다 (AC-G-09) */
export function discardGuestData() {
  clearGuestData();
}

/* ── 게스트 저장소 재노출 ─────────────────────────
   화면·컨텍스트는 guestStore를 직접 import하지 않는다 — "브라우저에 저장한다"는 사실을
   이 모듈 밖으로 새지 않게 하기 위해서다(분기의 유일한 자리 규칙). */

/** 병합 배너 노출 조건 (AC-G-07·11) */
export function hasGuestRecord() {
  return storeHasGuestRecord();
}

/** 병합 배너 문구의 숫자 — 호출 전 localStorage 값(설계/04 §6-5). 서버에 미리 묻지 않는다. */
export function guestCounts() {
  return guestRecordCounts();
}

export { GUEST_BOOKMARK_LIMIT };
