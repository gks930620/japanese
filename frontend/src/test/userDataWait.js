// 테스트 공용 — **인증·진도가 도착할 때까지** 기다리는 대기 함수 (senior-dev, 2026-11-14 · 08 E-4)
//
// ── 왜 필요한가 ────────────────────────────────────────────────────
// 진도·보관함은 화면이 뜬 **뒤에** 온다. 순서가 고정돼 있다:
//   렌더 → GET /api/users/me(인증 판정) → status가 loading에서 벗어남
//        → UserDataProvider의 effect → 진도 조회(회원=GET /api/progress · 게스트=localStorage)
//        → setProgress + setReady(true) → 다시 렌더
// 화면 대부분은 이 중간 상태를 **"아직 아무것도 안 한 사람"** 으로 그린다. 그 화면을 읽고 단언하면
//   ① 진도가 있어야 하는 단언은 **거짓 실패**(머신에 부하가 걸리면 무작위로 터진다)
//   ② 진도가 **없어야** 하는 단언(`queryBy… toBeNull`)은 **거짓 통과** — 이쪽은 아무도 모른다
// 둘 다 같은 원인이고, ②가 더 비싸다. 그래서 "기다린다"가 아니라 **"내가 심은 진도가 왔다"** 를 확인한다.
//
// ── 쓰는 법 (규칙은 작업자(AI)_문서/02 §5-4) ───────────────────────
//   render(<AuthProvider><UserDataProvider>…<AsyncProbe /></UserDataProvider></AuthProvider>)
//   await waitForUserData({ completed: 2, lastPosition: "2:7" });  // 그 뒤의 단언은 동기여도 된다
//   await waitForGuestProgress();   // 게스트: 심어 둔 localStorage 값 그대로를 기다린다
//
// ⚠️ `sleep`·`maxWorkers` 조정·`retry`로 덮지 않는다 — 부하가 더 걸리면 그대로 재발하고, ②는 막지도 못한다.
//
// 탐침 **컴포넌트**는 `AsyncProbe.jsx`에 있다 — 컴포넌트와 함수를 한 파일에서 내보내면
// react-refresh 규칙 위반이다(`AuthContext.jsx`/`authStore.js`와 같은 가름).
import { waitFor } from "@testing-library/react";
import { expect } from "vitest";
import { readGuestProgress } from "../lib/guestStore.js";

/**
 * 인증·진도 도착을 기다리는 제한 시간(ms).
 *
 * RTL 기본값은 **1,000ms**인데, 이 대기는 왕복 두 번(인증 → 진도)과 그 사이의 렌더를 포함한다 —
 * 에이전트 여럿이 같은 머신에서 도는 동안 1초를 넘기는 일이 실제로 있었다(08 E-4).
 * 1초는 "이 대기가 끝나는 데 걸리는 시간"이 아니라 **"끝나지 않았다고 판정하는 선"** 이고, 그 선이 너무 가까웠다.
 * 값을 늘려도 **빠를 때는 빠르다** — `waitFor`는 조건이 서는 즉시 돌아온다. 느릴 때만 쓰이는 숫자다.
 *
 * 8,000은 스위트 `testTimeout`(20,000ms, vite.config.js)에서 거꾸로 뺀 값이다:
 * 한 테스트가 이 대기를 **두 번** 하는 파일이 있고(홈 → 마이페이지를 맞대어 보는 테스트),
 * 둘 다 끝까지 기다려도 16,000ms < 20,000ms라 **탐침이 먼저 말한다** —
 * "진도가 안 왔다"는 진단 대신 vitest의 밋밋한 타임아웃을 받지 않으려는 것이다.
 */
export const USER_DATA_TIMEOUT = 8000;

export const PROBE_SELECTOR = '[data-testid="async-probe"]';

/** 마지막 위치를 비교 가능한 한 문자열로 — 없으면 "none" */
export function lastPositionKey(lastPosition) {
  if (!lastPosition) return "none";
  return `${lastPosition.courseId}:${lastPosition.unitNo}`;
}

/**
 * 지금 보고 있는 화면의 탐침 = **가장 나중에 렌더된 것**.
 *
 * 한 테스트 안에서 `render`를 두 번 하고 첫 화면을 unmount하지 않는 파일이 있다
 * (예: 진도를 심은 화면과 지운 화면의 띠를 **맞대어 보는** 테스트). 그때 문서에는 탐침이 둘이고,
 * 첫 번째를 잡으면 **옛 화면의 진도**를 기다리게 된다 — 고치려던 것과 똑같은 종류의 착각이다.
 */
function currentProbe(root) {
  const probes = root.querySelectorAll(PROBE_SELECTOR);
  return probes.length ? probes[probes.length - 1] : null;
}

/**
 * 인증 판정이 끝나고 진도가 화면에 **실릴 때까지** 기다린다.
 *
 * @param {{completed?: number, lastPosition?: string}} [expected]
 *        `completed`·`lastPosition`을 주면 **그 값이 될 때까지** 기다린다 —
 *        "기다리긴 했는데 빈 진도였다"(거짓 통과)를 막는 자리다. 진도가 없어야 하는 테스트는 `{ completed: 0 }`을 준다.
 * @param {{container?: HTMLElement}} [options]
 *        한 테스트에서 화면을 여러 번 띄운다면 `render`가 돌려준 `container`를 주어 **그 화면**으로 좁힌다.
 */
export async function waitForUserData(expected = {}, { container } = {}) {
  const { completed, lastPosition } = expected;
  const root = container ?? document;

  await waitFor(
    () => {
      const probe = currentProbe(root);
      expect(probe, "<AsyncProbe />가 렌더 트리에 없다 — Provider 안에 넣어라").not.toBeNull();
      expect(probe.dataset.auth, "인증 판정(/api/users/me)이 아직 안 끝났다").not.toBe("loading");
      expect(probe.dataset.ready, "진도·보관함 첫 조회가 아직 안 끝났다").toBe("true");
      if (completed !== undefined) {
        expect(Number(probe.dataset.completed), "완료 유닛 수가 아직 기대값이 아니다").toBe(completed);
      }
      if (lastPosition !== undefined) {
        expect(probe.dataset.last, "마지막 위치가 아직 기대값이 아니다").toBe(lastPosition);
      }
    },
    { timeout: USER_DATA_TIMEOUT },
  );
}

/**
 * 게스트(비로그인) 테스트용 — **방금 localStorage에 심어 둔 진도 그대로**가 화면에 실릴 때까지 기다린다.
 * 기대값을 손으로 적지 않으므로 심은 값과 기다리는 값이 갈릴 수 없다.
 */
export async function waitForGuestProgress(options = {}) {
  const seeded = readGuestProgress();
  await waitForUserData(
    {
      completed: seeded.completedUnits.length,
      lastPosition: lastPositionKey(seeded.lastPosition),
    },
    options,
  );
}
