// Vitest 전역 셋업 (vite.config.js의 test.setupFiles)
// - jest-dom 매처(toBeInTheDocument 등) 등록
// - 테스트마다 DOM 정리 + fetch 목 초기화 (테스트 간 상태 누수 금지)
import "@testing-library/jest-dom/vitest";
import { cleanup } from "@testing-library/react";
import { afterEach, vi } from "vitest";
// 조회 캐시(useApiQuery)는 모듈 수준이라 테스트 사이에 새어 나간다 — 매 테스트 뒤 비운다.
// 네임스페이스 import + 옵셔널 호출: 캐시가 아직 구현되지 않은 동안(Red)에도 셋업이 깨지지 않는다.
import * as apiQuery from "../hooks/useApiQuery.js";

// jsdom 미구현 브라우저 API 폴리필 (프로덕션 코드 문제가 아니라 테스트 환경 한계)
Element.prototype.scrollIntoView = () => {};
window.scrollTo = () => {};

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
  // 브라우저 세션 저장소(스크롤 위치 등)도 테스트 사이에 남지 않게 한다
  window.sessionStorage.clear();
  apiQuery.clearQueryCache?.();
});
