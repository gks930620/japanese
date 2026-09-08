import { cx } from "./kitClass.js";

/**
 * 로딩 자리 표시 — 킷 `.k-skeleton`(색·펄스 담당).
 * 치수는 킷이 정해 주지 않으므로 `className`으로 도메인 치수 클래스(`sk-*`)를 덧댄다.
 */
export function Skeleton({ className, ...rest }) {
  return <span aria-hidden="true" className={cx("k-skeleton", className)} {...rest} />;
}
