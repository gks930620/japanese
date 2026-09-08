// Vitest 전역 셋업 (vite.config.js의 test.setupFiles)
// - jest-dom 매처(toBeInTheDocument 등) 등록
// - 테스트마다 DOM 정리 + fetch 목 초기화 (테스트 간 상태 누수 금지)
import "@testing-library/jest-dom/vitest";
import { cleanup } from "@testing-library/react";
import { afterEach, vi } from "vitest";

// jsdom 미구현 브라우저 API 폴리필 (프로덕션 코드 문제가 아니라 테스트 환경 한계)
Element.prototype.scrollIntoView = () => {};
window.scrollTo = () => {};

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});
