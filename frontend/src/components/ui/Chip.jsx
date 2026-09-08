import { chipClass } from "./kitClass.js";

/**
 * 칩 — 킷 `.k-chip`.
 * 선택 상태는 클래스가 아니라 `aria-pressed`다. `on`을 주면 그 속성으로 번역된다.
 */
export function Chip({ on, className, type = "button", ...rest }) {
  return <button aria-pressed={on ? "true" : undefined} className={chipClass({ className })} type={type} {...rest} />;
}
