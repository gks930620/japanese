// 배지 코드 → 문구·클래스 (설계/05 §8).
// 계산(어느 코스가 어떤 코드인지)은 progressView.courseBadges가 하고, 여기는 **표기만** 한다.
// 문구가 바뀌어도 계산 모듈과 테스트는 건드리지 않는다.
const VIEW = {
  CONTINUE: { label: "학습 중인 코스", className: "status-badge ok" }, // 카드는 코스 상세로 간다 — 홈 버튼 "이어서"와 같은 말을 쓰지 않는다(2026-09 결정 D-2 · 01 §8)
  START: { label: "여기서 시작하세요", className: "status-badge ok" },
  NEXT: { label: "다음 코스를 시작하세요", className: "status-badge ok" },
  DONE: { label: "✓ 완주", className: "status-badge done" },
  OPEN: { label: "바로 볼 수 있어요", className: "status-badge neutral" },
  PREPARING: { label: "준비중", className: "preparing-badge" },
};

/** 모르는 코드는 OPEN으로 떨어뜨린다 — 배지 때문에 화면이 깨지지 않게 */
export function badgeView(code) {
  return VIEW[code] ?? VIEW.OPEN;
}

/**
 * 카드 강조 여부 — 강조는 배지 코드에서 **파생**시킨다.
 * courseBadges가 "CONTINUE·START·NEXT 중 정확히 하나"를 보장하므로
 * 강조 카드 한 장(AC-P-20)이 계산에서 자동으로 나온다.
 */
export function isEntryBadge(code) {
  return code === "CONTINUE" || code === "START" || code === "NEXT";
}
