// 비로그인(게스트) 기록 저장소 — 설계/04 §6-6의 단일 출처.
//
// 저장 문서의 모양은 서버 응답과 **완전히 같다**:
//   progress  ↔ GET /api/progress 의 data
//   bookmarks ↔ GET /api/bookmarks/ids 의 data
// 그래서 화면은 "게스트냐 회원이냐"를 묻지 않고 같은 데이터를 그린다(분기는 lib/userData.js 한 곳).
//
// ⚠️ 로그인 상태에서는 이 모듈로 쓰지 않는다(§7-3) — 로그아웃 직후 남의 기록이 되살아난다.
//    그 규칙을 강제하는 곳도 lib/userData.js다.

const STORAGE_KEY = "jp.guest.v1";

/** 종류별 보관함 상한 — 200의 단일 출처 (설계/04 §6-6). 회원은 무제한이라 서버에는 없다. */
export const GUEST_BOOKMARK_LIMIT = 200;

/** 서버가 받는 stepKey 형식 (설계/04 §6-2) — grammar-0 · vocab · summary … */
const STEP_KEY_PATTERN = /^[a-z]+(-[0-9]{1,2})?$/;

const BOOKMARK_TYPES = ["kanji", "grammar", "vocabulary"];

function emptyDoc() {
  return {
    progress: { completedUnits: [], lastPosition: null },
    bookmarks: { kanji: [], grammar: [], vocabulary: [] },
    flags: { loginHintDismissed: false },
  };
}

function isPlainObject(value) {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

/** 저장값이 깨졌거나 형식이 다르면 기본값으로 취급한다 — 게스트 기록 때문에 화면이 깨지면 안 된다(§7-1). */
/** 서버 계약(§4-2)과 같은 모양인지 — stepKey 형식까지 본다. 하나라도 어긋나면 없는 것으로 읽는다 */
function isValidLastPosition(value) {
  return (
    isPlainObject(value) &&
    Number.isFinite(value.courseId) &&
    Number.isFinite(value.unitNo) &&
    typeof value.stepKey === "string" &&
    STEP_KEY_PATTERN.test(value.stepKey) &&
    typeof value.updatedAt === "string" &&
    value.updatedAt.length > 0
  );
}

function readDoc() {
  const doc = emptyDoc();
  let raw = null;
  try {
    raw = window.localStorage.getItem(STORAGE_KEY);
  } catch {
    return doc; // 저장소 접근 불가(프라이빗 모드 등) — 기록 없음으로 동작
  }
  if (!raw) return doc;

  let parsed = null;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return doc;
  }
  if (!isPlainObject(parsed)) return doc;

  const progress = isPlainObject(parsed.progress) ? parsed.progress : {};
  if (Array.isArray(progress.completedUnits)) {
    doc.progress.completedUnits = progress.completedUnits.filter(
      (unit) => isPlainObject(unit) && Number.isFinite(unit.courseId) && Number.isFinite(unit.unitNo),
    );
  }
  // 원소 모양을 검사하는 건 completedUnits·bookmarks와 같은 이유다(B-L11):
  // 옛 형식이 병합 payload로 나가면 서버가 400으로 **영구히** 막고, 배너는 로그인마다 다시 묻는다.
  if (isValidLastPosition(progress.lastPosition)) {
    doc.progress.lastPosition = progress.lastPosition;
  }

  const bookmarks = isPlainObject(parsed.bookmarks) ? parsed.bookmarks : {};
  BOOKMARK_TYPES.forEach((type) => {
    if (Array.isArray(bookmarks[type])) {
      doc.bookmarks[type] = bookmarks[type].filter((id) => Number.isFinite(id));
    }
  });

  const flags = isPlainObject(parsed.flags) ? parsed.flags : {};
  doc.flags.loginHintDismissed = flags.loginHintDismissed === true;

  return doc;
}

/** 저장 실패(용량 초과·프라이빗 모드)는 조용히 삼킨다 — 학습을 막지 않는다(설계/05 §8). */
function writeDoc(doc) {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(doc));
  } catch {
    // 무시
  }
  return doc;
}

/* ── 읽기 ─────────────────────────────────────── */

export function readGuestProgress() {
  return readDoc().progress;
}

export function readGuestBookmarks() {
  return readDoc().bookmarks;
}

/* ── 진도 ─────────────────────────────────────── */

/** 완료 켜기/끄기. 멱등 — 같은 유닛을 두 번 켜도 하나다. */
export function setGuestUnitCompleted(courseId, unitNo, completed) {
  const doc = readDoc();
  const rest = doc.progress.completedUnits.filter(
    (unit) => !(unit.courseId === courseId && unit.unitNo === unitNo),
  );
  doc.progress.completedUnits = completed ? [...rest, { courseId, unitNo }] : rest;
  writeDoc(doc);
  return doc.progress;
}

/**
 * 로컬 벽시계 문자열(2026-08-14T18:00:00 형식) — 설계/04 §6-6.
 * toISOString()(UTC+Z)로 저장하면 서버가 LocalDateTime으로 읽으며 오프셋을 버려
 * 브라우저 기록이 항상 과거로 평가된다 → 병합의 "더 최근인 쪽" 판정이 뒤집힌다.
 * 서버가 전 구간 LocalDateTime(벽시계)이므로 클라이언트도 벽시계로 맞춘다.
 */
function toLocalDateTime(date) {
  const pad = (value) => String(value).padStart(2, "0");
  return (
    date.getFullYear() + "-" + pad(date.getMonth() + 1) + "-" + pad(date.getDate()) +
    "T" + pad(date.getHours()) + ":" + pad(date.getMinutes()) + ":" + pad(date.getSeconds())
  );
}

/**
 * 마지막 위치 저장 — 사이트 전체에 하나만 유지한다(설계/04 §6-3).
 * @param {Date} now 시각은 주입받는다(컨벤션 §6 — 결정적 테스트)
 */
export function setGuestLastPosition({ courseId, unitNo, stepKey }, now) {
  const doc = readDoc();
  doc.progress.lastPosition = { courseId, unitNo, stepKey, updatedAt: toLocalDateTime(now) };
  writeDoc(doc);
  return doc.progress;
}

/** 학습 기록 초기화 — 보관함은 남긴다 (AC-P-30). */
export function clearGuestProgress() {
  const doc = readDoc();
  doc.progress = emptyDoc().progress;
  writeDoc(doc);
  return doc.progress;
}

/* ── 보관함 ───────────────────────────────────── */

/**
 * 담기/빼기.
 * @returns {{ok: boolean, reason: string|null, bookmarks: object}}
 *          상한 초과면 {ok:false, reason:"LIMIT"} 이고 **저장하지 않는다** (AC-G-06).
 */
export function toggleGuestBookmark(type, targetId, bookmarked) {
  const doc = readDoc();
  const current = doc.bookmarks[type];
  if (!Array.isArray(current)) {
    return { ok: false, reason: "TYPE", bookmarks: doc.bookmarks };
  }

  if (!bookmarked) {
    doc.bookmarks[type] = current.filter((id) => id !== targetId);
    writeDoc(doc);
    return { ok: true, reason: null, bookmarks: doc.bookmarks };
  }

  if (current.includes(targetId)) {
    return { ok: true, reason: null, bookmarks: doc.bookmarks };
  }
  if (current.length >= GUEST_BOOKMARK_LIMIT) {
    return { ok: false, reason: "LIMIT", bookmarks: doc.bookmarks };
  }

  // 새로 담은 것이 맨 앞 = 최근 담은 순 (AC-B-12)
  doc.bookmarks[type] = [targetId, ...current];
  writeDoc(doc);
  return { ok: true, reason: null, bookmarks: doc.bookmarks };
}

/** 그 종류만 비운다 (AC-B-21). 다른 종류는 그대로다. */
export function clearGuestBookmarks(type) {
  const doc = readDoc();
  if (Array.isArray(doc.bookmarks[type])) {
    doc.bookmarks[type] = [];
    writeDoc(doc);
  }
  return doc.bookmarks;
}

/* ── 병합 배너 · 안내 띠 (§7-3) ───────────────── */

/** 진도+보관함+플래그 전부 삭제 — [합치기]·[내 기록 아니에요]·[이 브라우저 기록 지우기] */
export function clearGuestData() {
  try {
    window.localStorage.removeItem(STORAGE_KEY);
  } catch {
    // 무시
  }
}

/** 병합 배너 노출 조건 — 완료·마지막 위치·보관함 중 하나라도 있으면 true (AC-G-07·11) */
export function hasGuestRecord() {
  const { progress, bookmarks } = readDoc();
  const bookmarkCount = BOOKMARK_TYPES.reduce((sum, type) => sum + bookmarks[type].length, 0);
  return progress.completedUnits.length > 0 || progress.lastPosition != null || bookmarkCount > 0;
}

/** 배너 문구의 숫자 — 서버에 물어보지 않는다(브라우저에만 있는 사실). */
export function guestRecordCounts() {
  const { progress, bookmarks } = readDoc();
  return {
    completedUnitCount: progress.completedUnits.length,
    bookmarkCount: BOOKMARK_TYPES.reduce((sum, type) => sum + bookmarks[type].length, 0),
  };
}

export function isLoginHintDismissed() {
  return readDoc().flags.loginHintDismissed === true;
}

/** [나중에] — 이 브라우저에서 로그인 안내 띠를 다시 띄우지 않는다 (AC-G-05). */
export function dismissLoginHint() {
  const doc = readDoc();
  doc.flags.loginHintDismissed = true;
  writeDoc(doc);
}
