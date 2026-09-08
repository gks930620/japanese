// frontend-dev 작성 — 게스트/회원 분기의 유일한 자리(설계/04 §6-6)를 고정하는 테스트.
// senior-dev의 guestStore.test.js·progressView.test.js와 달리 이 파일은 내 구현 세부 계약이다.
import { beforeEach, describe, expect, it } from "vitest";
import { apiError, apiSuccess, stubFetch } from "../test/helpers.jsx";
import { readGuestBookmarks, readGuestProgress, setGuestUnitCompleted, toggleGuestBookmark } from "./guestStore.js";
import {
  clearProgress,
  fetchBookmarkIds,
  fetchBookmarkList,
  fetchProgress,
  mergeGuestData,
  saveLastPosition,
  setUnitCompleted,
  toggleBookmark,
} from "./userData.js";

// 설계/04 §6-6: 게스트 updatedAt은 오프셋 없는 **로컬 벽시계** 문자열이다(서버가 LocalDateTime으로 읽는다)
const NOW = new Date(2026, 7, 14, 9, 0, 0);
const NOW_LOCAL = "2026-08-14T09:00:00";
const GUEST = false;
const MEMBER = true;

beforeEach(() => {
  window.localStorage.clear();
});

describe("userData — 진도 읽기", () => {
  it("게스트는 localStorage에서 읽고 서버를 부르지 않는다", async () => {
    setGuestUnitCompleted(2, 1, true);
    const fetchMock = stubFetch(() => apiSuccess(null));

    expect(await fetchProgress(GUEST)).toEqual({ completedUnits: [{ courseId: 2, unitNo: 1 }], lastPosition: null });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("회원은 GET /api/progress의 data를 그대로 쓴다 (모양이 같아 화면이 분기하지 않는다)", async () => {
    const payload = { completedUnits: [{ courseId: 3, unitNo: 5 }], lastPosition: null };
    const fetchMock = stubFetch(() => apiSuccess(payload));

    expect(await fetchProgress(MEMBER)).toEqual(payload);
    expect(fetchMock.mock.calls[0][0]).toBe("/api/progress");
  });

  it("회원 조회가 실패해도 화면을 막지 않는다 — 빈 진도로 떨어진다", async () => {
    stubFetch(() => apiError(500, "INTERNAL_ERROR"));

    expect(await fetchProgress(MEMBER)).toEqual({ completedUnits: [], lastPosition: null });
  });
});

describe("userData — 진도 쓰기", () => {
  it("게스트의 마지막 위치는 localStorage에 저장된다", async () => {
    const fetchMock = stubFetch(() => apiSuccess(null));

    await saveLastPosition(GUEST, { courseId: 2, unitNo: 4, stepKey: "kanji" }, NOW);

    expect(readGuestProgress().lastPosition).toEqual({
      courseId: 2,
      unitNo: 4,
      stepKey: "kanji",
      updatedAt: NOW_LOCAL,
    });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("회원의 쓰기는 API로 가고 localStorage에는 절대 쓰지 않는다 (§7-3)", async () => {
    const fetchMock = stubFetch(() => apiSuccess({ courseId: 2, unitNo: 4, stepKey: "kanji", updatedAt: "x" }));

    await saveLastPosition(MEMBER, { courseId: 2, unitNo: 4, stepKey: "kanji" }, NOW);
    await setUnitCompleted(MEMBER, 2, 4, true);

    expect(fetchMock.mock.calls[0][0]).toBe("/api/progress/last-position");
    expect(fetchMock.mock.calls[1][0]).toBe("/api/progress/units/2/4/completion");
    expect(window.localStorage.getItem("jp.guest.v1")).toBeNull();
  });

  it("자동 저장(마지막 위치) 실패는 조용히 삼킨다 — 학습을 막지 않는다", async () => {
    stubFetch(() => apiError(500, "INTERNAL_ERROR"));

    await expect(saveLastPosition(MEMBER, { courseId: 2, unitNo: 4, stepKey: "kanji" }, NOW)).resolves.toEqual({
      ok: false,
    });
  });

  it("손으로 누른 완료 토글의 실패는 호출자에게 알린다 (AC-P-27)", async () => {
    stubFetch(() => apiError(500, "INTERNAL_ERROR"));

    const result = await setUnitCompleted(MEMBER, 2, 4, true);

    expect(result.ok).toBe(false);
    expect(result.error).toMatchObject({ status: 500 });
  });

  it("clearProgress는 게스트/회원 모두 보관함을 남긴다 (AC-P-30)", async () => {
    setGuestUnitCompleted(2, 1, true);
    toggleGuestBookmark("kanji", 12, true);
    stubFetch(() => apiSuccess({ deletedUnitCount: 1 }));

    await clearProgress(GUEST);

    expect(readGuestProgress().completedUnits).toEqual([]);
    expect(readGuestBookmarks().kanji).toEqual([12]);
  });
});

describe("userData — 보관함", () => {
  it("게스트의 ★ 집합은 localStorage에서 온다", async () => {
    toggleGuestBookmark("kanji", 12, true);
    stubFetch(() => apiSuccess(null));

    expect(await fetchBookmarkIds(GUEST)).toEqual({ kanji: [12], grammar: [], vocabulary: [] });
  });

  it("회원의 ★ 집합은 GET /api/bookmarks/ids에서 온다", async () => {
    const fetchMock = stubFetch(() => apiSuccess({ kanji: [12, 340], grammar: [], vocabulary: [1217] }));

    expect(await fetchBookmarkIds(MEMBER)).toEqual({ kanji: [12, 340], grammar: [], vocabulary: [1217] });
    expect(fetchMock.mock.calls[0][0]).toBe("/api/bookmarks/ids");
  });

  it("게스트 상한 초과는 reason LIMIT으로 알린다 (AC-G-06)", async () => {
    for (let i = 1; i <= 200; i += 1) toggleGuestBookmark("kanji", i, true);

    const result = await toggleBookmark(GUEST, "kanji", 9999, true);

    expect(result).toMatchObject({ ok: false, reason: "LIMIT" });
    expect(readGuestBookmarks().kanji).not.toContain(9999);
  });

  it("회원의 담기는 PUT으로 가고 서버가 정규화한 응답을 돌려준다 (어휘 대표 id)", async () => {
    const data = { type: "VOCABULARY", targetId: 1217, bookmarked: true, counts: { kanji: 0, grammar: 0, vocabulary: 1, total: 1 } };
    const fetchMock = stubFetch(() => apiSuccess(data));

    const result = await toggleBookmark(MEMBER, "vocabulary", 3024, true);

    expect(fetchMock.mock.calls[0][0]).toBe("/api/bookmarks/vocabulary/3024");
    expect(result).toMatchObject({ ok: true, data });
  });

  it("게스트 보관함 목록은 자료실을 ids + sort=GIVEN으로 조회한다 (RECENT → GIVEN)", async () => {
    toggleGuestBookmark("kanji", 12, true);
    toggleGuestBookmark("kanji", 34, true); // 최근 담은 것이 앞
    const fetchMock = stubFetch(() => apiSuccess({ content: [], page: 0, size: 60, totalElements: 0, totalAll: 0, totalPages: 0 }));

    await fetchBookmarkList(GUEST, "kanji", { page: 1, size: 60, sort: "RECENT" });

    expect(fetchMock.mock.calls[0][0]).toBe("/api/library/kanji?page=0&size=60&ids=34%2C12&sort=GIVEN");
  });

  it("게스트가 담은 것이 없으면 서버를 부르지 않고 빈 페이지를 돌려준다", async () => {
    const fetchMock = stubFetch(() => apiSuccess(null));

    const page = await fetchBookmarkList(GUEST, "grammar", { page: 1, size: 20, sort: "RECENT" });

    expect(page).toMatchObject({ content: [], totalElements: 0, totalAll: 0 });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("회원 보관함 목록은 /api/bookmarks/{type}을 그대로 쓴다", async () => {
    const fetchMock = stubFetch(() => apiSuccess({ content: [], page: 0, size: 20, totalElements: 0, totalAll: 0, totalPages: 0 }));

    await fetchBookmarkList(MEMBER, "grammar", { page: 2, size: 20, sort: "RECENT", q: "て", levels: ["N5"] });

    expect(fetchMock.mock.calls[0][0]).toBe("/api/bookmarks/grammar?page=1&size=20&q=%E3%81%A6&level=N5&sort=RECENT");
  });
});

describe("userData — 병합 (§7-3)", () => {
  it("localStorage 문서를 그대로 보내고 성공하면 게스트 기록을 지운다 (AC-G-08)", async () => {
    setGuestUnitCompleted(2, 1, true);
    toggleGuestBookmark("kanji", 12, true);
    const fetchMock = stubFetch(() => apiSuccess({ completedUnitCount: 1 }));

    const result = await mergeGuestData();

    expect(result.ok).toBe(true);
    expect(fetchMock.mock.calls[0][0]).toBe("/api/me/merge");
    const body = JSON.parse(fetchMock.mock.calls[0][1].body);
    expect(body).toEqual({
      progress: { completedUnits: [{ courseId: 2, unitNo: 1 }], lastPosition: null },
      bookmarks: { kanji: [12], grammar: [], vocabulary: [] },
    });
    expect(window.localStorage.getItem("jp.guest.v1")).toBeNull();
  });

  it("병합이 실패하면 게스트 기록을 지우지 않는다 (다시 시도할 수 있어야 한다)", async () => {
    setGuestUnitCompleted(2, 1, true);
    stubFetch(() => apiError(500, "INTERNAL_ERROR"));

    const result = await mergeGuestData();

    expect(result.ok).toBe(false);
    expect(readGuestProgress().completedUnits).toEqual([{ courseId: 2, unitNo: 1 }]);
  });
});

describe("userData — 보관함 목록 조회 실패 (AC-B-25, QA 지적)", () => {
  it("회원 조회 실패는 삼키지 않고 그대로 올린다 (에러 카드가 떠야 한다)", async () => {
    stubFetch(() => apiError(500, "INTERNAL_ERROR"));

    await expect(fetchBookmarkList(MEMBER, "kanji", { page: 1, size: 60 })).rejects.toMatchObject({ status: 500 });
  });

  it("게스트 조회 실패도 그대로 올린다 — 담은 것이 있는데 '없어요'를 보여주면 안 된다", async () => {
    toggleGuestBookmark("kanji", 11, true);
    stubFetch(() => apiError(500, "INTERNAL_ERROR"));

    await expect(fetchBookmarkList(GUEST, "kanji", { page: 1, size: 60 })).rejects.toMatchObject({ status: 500 });
  });

  it("진도 조회는 반대로 여전히 조용히 실패한다 (AC-P-28 — 규칙이 갈린다)", async () => {
    stubFetch(() => apiError(500, "INTERNAL_ERROR"));

    await expect(fetchProgress(MEMBER)).resolves.toEqual({ completedUnits: [], lastPosition: null });
  });
});
