import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  // JSX 자동 런타임 — 테스트 실행(Vitest)에서도 `import React` 없이 JSX가 변환되도록 명시.
  esbuild: { jsx: "automatic" },
  // 테스트: Vitest + React Testing Library (설계 §7-2 도입 결정)
  // 범위는 훅·분기 로직 위주 — 스타일/스냅샷 테스트는 하지 않는다(깨지기 쉽고 회귀 가치가 낮다).
  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: "./src/test/setup.js",
    include: ["src/**/*.test.{js,jsx}"],
    css: false,
    // 한국어 입력(userEvent.type)은 글자마다 이벤트를 돌려 느리다. 파일이 20개를 넘으면서
    // 병렬 실행 부하로 기본 5초를 넘기는 케이스가 생겨 여유를 준다(단언은 그대로다).
    testTimeout: 20000,
  },
  server: {
    port: 5173,
    proxy: {
      "/api": "http://localhost:8083",
      "/custom-oauth2": "http://localhost:8083",
      "/login/oauth2": "http://localhost:8083",
    },
  },
});
