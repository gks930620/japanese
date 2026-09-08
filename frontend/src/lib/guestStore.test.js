import { beforeEach, describe, expect, it } from "vitest";
import {
  GUEST_BOOKMARK_LIMIT,
  clearGuestBookmarks,
  clearGuestData,
  clearGuestProgress,
  dismissLoginHint,
  guestRecordCounts,
  hasGuestRecord,
  isLoginHintDismissed,
  readGuestBookmarks,
  readGuestProgress,
  setGuestLastPosition,
  setGuestUnitCompleted,
  toggleGuestBookmark,
} from "./guestStore.js";

/**
 * 게스트 저장소 계약 (설계/04_API계약.md §6-6)
 *
 * 비로그인 기록은 서버가 아니라 **이 브라우저**에 있다. 그래서 계약의 절반이 여기 있다.
 * 저장 형식은 서버 응답(GET /api/progress, GET /api/bookmarks/ids)과 **같은 모양**이어야 한다 —
 * 그래야 화면이 "게스트냐 회원이냐"를 묻지 않고 같은 데이터를 그린다.
 *
 * 이 테스트를 수정하지 말 것 — 계약 변경은 senior-dev 경유.
 */

const STORAGE_KEY = "jp.guest.v1";
// 저장되는 updatedAt은 **오프셋 없는 로컬 벽시계 문자열**이다(설계/04 §6-6) —
// 서버가 LocalDateTime으로 읽기 때문에 toISOString()(UTC+Z)을 저장하면 병합의 "더 최근" 판정이 뒤집힌다.
const NOW = new Date(2026, 7, 14, 9, 0, 0);
const LATER = new Date(2026, 7, 14, 10, 0, 0);
const LATER_LOCAL = "2026-08-14T10:00:00";

beforeEach(() => {
  window.localStorage.clear();
});

describe("guestStore — 빈 상태", () => {
  it("기록이 없으면 서버 빈 응답과 같은 모양을 돌려준다", () => {
    expect(readGuestProgress()).toEqual({ completedUnits: [], lastPosition: null });
    expect(readGuestBookmarks()).toEqual({ kanji: [], grammar: [], vocabulary: [] });
  });

  it("hasGuestRecord()는 false이고 배너 숫자는 0이다 (AC-G-11)", () => {
    expect(hasGuestRecord()).toBe(false);
    expect(guestRecordCounts()).toEqual({ completedUnitCount: 0, bookmarkCount: 0 });
  });

  it("저장값이 깨져 있어도 기본값으로 읽는다 (게스트 기록 때문에 화면이 깨지면 안 된다)", () => {
    window.localStorage.setItem(STORAGE_KEY, "{not json");
    expect(readGuestProgress()).toEqual({ completedUnits: [], lastPosition: null });

    window.localStorage.setItem(STORAGE_KEY, JSON.stringify({ progress: 7, bookmarks: "x" }));
    expect(readGuestBookmarks()).toEqual({ kanji: [], grammar: [], vocabulary: [] });
  });
});

describe("guestStore — 진도", () => {
  it("완료를 켜면 남고, 같은 유닛을 두 번 켜도 하나다 (AC-G-02)", () => {
    setGuestUnitCompleted(2, 3, true);
    setGuestUnitCompleted(2, 3, true);

    expect(readGuestProgress().completedUnits).toEqual([{ courseId: 2, unitNo: 3 }]);
  });

  it("완료를 끄면 빠진다 (AC-P-04는 로그인·비로그인 모두 같다)", () => {
    setGuestUnitCompleted(2, 3, true);
    setGuestUnitCompleted(2, 4, true);
    setGuestUnitCompleted(2, 3, false);

    expect(readGuestProgress().completedUnits).toEqual([{ courseId: 2, unitNo: 4 }]);
  });

  it("마지막 위치는 하나만 유지되고 updatedAt은 주입한 시각이다 (AC-P-11)", () => {
    setGuestLastPosition({ courseId: 2, unitNo: 4, stepKey: "kanji" }, NOW);
    setGuestLastPosition({ courseId: 3, unitNo: 9, stepKey: "summary" }, LATER);

    expect(readGuestProgress().lastPosition).toEqual({
      courseId: 3,
      unitNo: 9,
      stepKey: "summary",
      updatedAt: LATER_LOCAL,
    });
  });

  it("clearGuestProgress()는 진도만 지우고 보관함은 남긴다 (AC-P-30)", () => {
    setGuestUnitCompleted(2, 1, true);
    setGuestLastPosition({ courseId: 2, unitNo: 1, stepKey: "dialog" }, NOW);
    toggleGuestBookmark("kanji", 12, true);

    clearGuestProgress();

    expect(readGuestProgress()).toEqual({ completedUnits: [], lastPosition: null });
    expect(readGuestBookmarks().kanji).toEqual([12]);
  });
});

describe("guestStore — 보관함", () => {
  it("담으면 배열 맨 앞에 붙는다 (최근 담은 순 — AC-B-12)", () => {
    toggleGuestBookmark("kanji", 12, true);
    toggleGuestBookmark("kanji", 34, true);

    expect(readGuestBookmarks().kanji).toEqual([34, 12]);
  });

  it("같은 항목을 두 번 담아도 하나다", () => {
    toggleGuestBookmark("grammar", 7, true);
    const result = toggleGuestBookmark("grammar", 7, true);

    expect(result.ok).toBe(true);
    expect(readGuestBookmarks().grammar).toEqual([7]);
  });

  it("빼면 빠지고, 없는 것을 빼도 실패가 아니다 (AC-B-02)", () => {
    toggleGuestBookmark("vocabulary", 1217, true);
    expect(toggleGuestBookmark("vocabulary", 1217, false).ok).toBe(true);
    expect(toggleGuestBookmark("vocabulary", 1217, false).ok).toBe(true);
    expect(readGuestBookmarks().vocabulary).toEqual([]);
  });

  it("종류별 200개가 상한이고, 초과하면 저장하지 않는다 (AC-G-06)", () => {
    expect(GUEST_BOOKMARK_LIMIT).toBe(200);

    for (let i = 1; i <= GUEST_BOOKMARK_LIMIT; i += 1) {
      expect(toggleGuestBookmark("kanji", i, true).ok).toBe(true);
    }

    const overflow = toggleGuestBookmark("kanji", 9999, true);
    expect(overflow.ok).toBe(false);
    expect(overflow.reason).toBe("LIMIT");
    expect(readGuestBookmarks().kanji).toHaveLength(GUEST_BOOKMARK_LIMIT);
    expect(readGuestBookmarks().kanji).not.toContain(9999);
  });

  it("상한은 종류별이다 — 한자가 꽉 차도 문법은 담긴다", () => {
    for (let i = 1; i <= GUEST_BOOKMARK_LIMIT; i += 1) {
      toggleGuestBookmark("kanji", i, true);
    }

    expect(toggleGuestBookmark("grammar", 1, true).ok).toBe(true);
  });

  it("clearGuestBookmarks(type)는 그 종류만 비운다 (AC-B-21)", () => {
    toggleGuestBookmark("kanji", 12, true);
    toggleGuestBookmark("grammar", 7, true);

    clearGuestBookmarks("kanji");

    expect(readGuestBookmarks()).toEqual({ kanji: [], grammar: [7], vocabulary: [] });
  });
});

describe("guestStore — 병합 배너 · 안내 띠 (§7-3)", () => {
  it("완료 유닛만 있어도, 보관함만 있어도 병합 배너 대상이다 (AC-G-07)", () => {
    setGuestUnitCompleted(2, 1, true);
    expect(hasGuestRecord()).toBe(true);

    clearGuestData();
    toggleGuestBookmark("kanji", 12, true);
    expect(hasGuestRecord()).toBe(true);
  });

  it("배너 문구의 숫자는 완료 유닛 수와 보관함 총 개수다", () => {
    setGuestUnitCompleted(2, 1, true);
    setGuestUnitCompleted(2, 2, true);
    toggleGuestBookmark("kanji", 12, true);
    toggleGuestBookmark("grammar", 7, true);
    toggleGuestBookmark("vocabulary", 1217, true);

    expect(guestRecordCounts()).toEqual({ completedUnitCount: 2, bookmarkCount: 3 });
  });

  it("clearGuestData()는 진도·보관함·플래그를 모두 지운다 ([합치기]·[내 기록 아니에요] 뒤 — AC-G-08·09)", () => {
    setGuestUnitCompleted(2, 1, true);
    toggleGuestBookmark("kanji", 12, true);
    dismissLoginHint();

    clearGuestData();

    expect(hasGuestRecord()).toBe(false);
    expect(isLoginHintDismissed()).toBe(false);
  });

  it("[나중에]를 누르면 이 브라우저에서 다시 뜨지 않는다 (AC-G-05)", () => {
    expect(isLoginHintDismissed()).toBe(false);
    dismissLoginHint();
    expect(isLoginHintDismissed()).toBe(true);
  });
});

// frontend-dev 작성 — 병합 payload가 서버 검증을 통과할 수 있는 모양이어야 한다(감사 B-L11).
// 옛 형식이 남아 있으면 병합이 400으로 **영구히** 실패하고, 배너는 다음 로그인마다 다시 묻는다.
describe("옛 형식의 lastPosition은 버린다 (B-L11)", () => {
  const write = (lastPosition) =>
    window.localStorage.setItem(
      "jp.guest.v1",
      JSON.stringify({
        version: 1,
        progress: { completedUnits: [], lastPosition },
        bookmarks: { kanji: [], grammar: [], vocabulary: [] },
      }),
    );

  it("updatedAt이 없으면 없는 것으로 읽는다 — 서버가 필수로 본다", () => {
    write({ courseId: 2, unitNo: 3, stepKey: "vocab" });

    expect(readGuestProgress().lastPosition).toBeNull();
  });

  it("형식이 맞지 않는 stepKey도 버린다", () => {
    write({ courseId: 2, unitNo: 3, stepKey: "grammar-0-extra!!", updatedAt: "2026-08-25T10:00:00" });

    expect(readGuestProgress().lastPosition).toBeNull();
  });

  it("courseId·unitNo가 숫자가 아니면 버린다", () => {
    write({ courseId: "2", unitNo: 3, stepKey: "vocab", updatedAt: "2026-08-25T10:00:00" });

    expect(readGuestProgress().lastPosition).toBeNull();
  });

  it("정상 값은 그대로 읽는다 (회귀)", () => {
    const valid = { courseId: 2, unitNo: 3, stepKey: "grammar-0", updatedAt: "2026-08-25T10:00:00" };
    write(valid);

    expect(readGuestProgress().lastPosition).toEqual(valid);
  });
});
