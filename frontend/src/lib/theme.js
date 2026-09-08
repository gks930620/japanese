// 다크 모드 — HALO 가이드 §3-2 data-theme 방식.
// localStorage "theme" = "light" | "dark" | "system" (초기값 system).
// index.html의 인라인 스크립트가 CSS 로드 전에 같은 로직으로 선적용해 깜빡임(FOUC)을 막는다.
const STORAGE_KEY = "theme";

export function getStoredTheme() {
  try {
    return localStorage.getItem(STORAGE_KEY) || "system";
  } catch {
    return "system";
  }
}

function resolveDark(setting) {
  return (
    setting === "dark" ||
    (setting === "system" && window.matchMedia("(prefers-color-scheme: dark)").matches)
  );
}

/** data-theme + colorScheme(스크롤바·폼까지 맞춤)를 세팅하고, 다크 여부를 반환한다. */
export function applyTheme(setting) {
  const dark = resolveDark(setting);
  document.documentElement.setAttribute("data-theme", dark ? "dark" : "light");
  document.documentElement.style.colorScheme = dark ? "dark" : "light";
  return dark;
}

/** 라이트 ↔ 다크 순환. 저장 후 적용하고 다크 여부를 반환한다. */
export function toggleTheme() {
  const next = resolveDark(getStoredTheme()) ? "light" : "dark";
  try {
    localStorage.setItem(STORAGE_KEY, next);
  } catch {
    // 저장 실패해도 이번 세션에는 적용
  }
  return applyTheme(next);
}
