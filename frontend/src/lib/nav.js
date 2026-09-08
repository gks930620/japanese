// GNB 메뉴 정의 — 순서 고정: 학습 → 자료실 → 커뮤니티 (채팅은 사용자 결정으로 제거 — 설계/04 §5)
export const NAV_ITEMS = [
  { to: "/courses", prefix: "/courses", label: "학습" },
  { to: "/library/kanji", prefix: "/library", label: "자료실" },
  { to: "/community", prefix: "/community", label: "커뮤니티" },
];

/**
 * 지금 보고 있는 **과정을 따라가는** GNB (2026-08-25 판정 A-H1 · 설계/05 §16-4).
 * 메뉴 개수는 그대로 셋이고(설계/05 §16-4) 목적지·접두만 갈아 끼운다 —
 * 영어 화면에서 "자료실"이 한자 1,350자 목록으로 가지 않고, 활성 표시도 켜진다.
 * 커뮤니티는 과정 공용이라 갈리지 않는다.
 */
export function navItems(pathname) {
  const english = pathname === "/en" || pathname.startsWith("/en/");
  if (!english) return NAV_ITEMS;
  return NAV_ITEMS.map((item) => {
    if (item.label === "학습") return { ...item, to: "/en/courses", prefix: "/en/courses" };
    if (item.label === "자료실") return { ...item, to: "/en/library/expressions", prefix: "/en/library" };
    return item;
  });
}

/**
 * 활성 판정은 **접두**로 한다 (인수 4).
 * NavLink의 링크 경로 매칭에 기대면 `/library/kanji` 링크가 `/library/grammar`에서 꺼진다.
 */
export function isNavItemActive(pathname, item) {
  return pathname === item.prefix || pathname.startsWith(`${item.prefix}/`);
}

/**
 * 과정 스위처 (설계/05 §16) — GNB 메뉴는 3개 그대로 두고, 과정만 헤더에서 바꾼다.
 * 메뉴를 언어별로 늘리면 6칸이 되어 모바일에서 무너진다.
 */
export const COURSE_TRACKS = [
  { key: "ja", to: "/courses", label: "일본어" },
  { key: "en", to: "/en/courses", label: "영어" },
];

/** 지금 보고 있는 과정 — `/en` 하위면 영어, 나머지는 전부 일본어(기본값) */
export function activeTrack(pathname) {
  const english = pathname === "/en" || pathname.startsWith("/en/");
  return COURSE_TRACKS.find((track) => track.key === (english ? "en" : "ja"));
}
