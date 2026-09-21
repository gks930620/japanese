import { useEffect, useLayoutEffect, useRef } from "react";
import { useLocation, useNavigationType } from "react-router-dom";

/** sessionStorage 키 — { [location.key]: y }. 새로고침은 견디고 탭을 닫으면 사라진다 */
export const SCROLL_STORAGE_KEY = "jp.scroll.v1";
/** 콘텐츠가 준비되기를 기다리는 상한 — 넘으면 그 시점에 한 번 적용하고 끝낸다 */
export const SCROLL_RESTORE_TIMEOUT_MS = 3000;
/** 기억하는 화면 수 — 넘으면 오래된 것부터 버린다 */
const MAX_KEYS = 50;

function readPositions() {
  try {
    const raw = window.sessionStorage.getItem(SCROLL_STORAGE_KEY);
    const parsed = raw ? JSON.parse(raw) : null;
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
}

function writePosition(key, y) {
  if (!key) return;
  try {
    const positions = readPositions();
    delete positions[key]; // 다시 넣어 순서를 갱신한다(오래된 것부터 밀려나게)
    positions[key] = y;
    const keys = Object.keys(positions);
    keys.slice(0, Math.max(0, keys.length - MAX_KEYS)).forEach((old) => delete positions[old]);
    window.sessionStorage.setItem(SCROLL_STORAGE_KEY, JSON.stringify(positions));
  } catch {
    // 저장소를 못 쓰는 환경(사파리 프라이빗 등)에서는 복원만 포기한다 — 화면은 그대로 동작한다
  }
}

/**
 * 스크롤 복원 — `components/Layout.jsx`에서 한 번만 호출한다.
 *
 * SPA는 화면을 갈아끼워도 문서가 하나라 브라우저가 스크롤을 대신 맞춰 주지 않는다.
 * - **PUSH**(링크·페이지 버튼·필터 칩) → 맨 위(설계/05 §9 "페이지 이동 시 목록 상단")
 * - **REPLACE**(검색 디바운스·기본값 보정·댓글 `?cpage=`) → 아무것도 하지 않는다. 입력 중인 화면이 튀면 안 된다
 * - **POP**(뒤로/앞으로)·**첫 마운트**(새로고침) → 저장된 위치로. 단 **콘텐츠가 그려진 뒤**다 —
 *   문서가 아직 짧을 때 옮기면 브라우저가 끝에서 잘라 버리므로 목표 높이에 닿을 때까지 rAF마다 기다린다.
 *   기다리는 동안 사용자가 직접 스크롤하면 복원을 포기한다(사용자의 손을 이기지 않는다).
 */
export function useScrollRestoration() {
  const location = useLocation();
  const navigationType = useNavigationType();
  const keyRef = useRef(location.key);
  const pendingRef = useRef(null);
  const flushFrameRef = useRef(0);

  // ① 저장 — scroll 이벤트마다 현재 key에 y를 적어 둔다(쓰기는 rAF로 합친다)
  useEffect(() => {
    // 브라우저 자동 복원을 끈다 — 켜 두면 popstate 직후 브라우저가 먼저 잘린 위치로 튀고 우리가 다시 옮겨 두 번 움직인다
    if ("scrollRestoration" in window.history) {
      window.history.scrollRestoration = "manual";
    }

    const flush = () => {
      flushFrameRef.current = 0;
      const pending = pendingRef.current;
      pendingRef.current = null;
      if (pending) writePosition(pending.key, pending.y);
    };
    const onScroll = () => {
      pendingRef.current = { key: keyRef.current, y: window.scrollY };
      if (!flushFrameRef.current) flushFrameRef.current = window.requestAnimationFrame(flush);
    };

    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      window.removeEventListener("scroll", onScroll);
      if (flushFrameRef.current) window.cancelAnimationFrame(flushFrameRef.current);
      flush(); // 떠나면서 마지막 위치를 남긴다
    };
  }, []);

  // ② key 갱신은 레이아웃 단계에서 — 새 화면이 짧아 브라우저가 쏘는 scroll 이벤트가 옛 key의 값을 덮어쓰지 않게
  useLayoutEffect(() => {
    const pending = pendingRef.current;
    if (pending && pending.key !== location.key) {
      pendingRef.current = null;
      writePosition(pending.key, pending.y);
    }
    keyRef.current = location.key;
  }, [location.key]);

  // ③ 이동 종류에 따라 맨 위로 가거나, 보던 위치로 되돌린다
  useEffect(() => {
    if (navigationType === "REPLACE") return undefined; // 같은 자리의 주소 정리 — 화면을 건드리지 않는다
    if (navigationType === "PUSH") {
      window.scrollTo(0, 0);
      return undefined;
    }

    const saved = readPositions()[location.key];
    const y = typeof saved === "number" && saved > 0 ? saved : 0;
    if (!y) {
      window.scrollTo(0, 0); // 저장된 위치가 없으면(첫 방문·밀려남) 맨 위
      return undefined;
    }

    let frame = 0;
    let done = false;
    const deadline = Date.now() + SCROLL_RESTORE_TIMEOUT_MS;
    const stop = () => {
      if (done) return;
      done = true;
      if (frame) window.cancelAnimationFrame(frame);
      frame = 0;
      window.removeEventListener("wheel", stop);
      window.removeEventListener("touchmove", stop);
      window.removeEventListener("keydown", stop);
    };
    const step = () => {
      if (done) return;
      const reachable = document.documentElement.scrollHeight - window.innerHeight >= y;
      if (reachable || Date.now() >= deadline) {
        window.scrollTo(0, y);
        stop();
        return;
      }
      frame = window.requestAnimationFrame(step);
    };

    // 기다리는 동안 사용자가 손을 대면 포기한다
    window.addEventListener("wheel", stop, { passive: true });
    window.addEventListener("touchmove", stop, { passive: true });
    window.addEventListener("keydown", stop);
    frame = window.requestAnimationFrame(step);

    return stop;
  }, [location.key, navigationType]);
}
