import { cx } from "./kitClass.js";

/** 빈 상태 — 킷 `.k-empty` */
export function Empty({ className, ...rest }) {
  return <div className={cx("k-empty", className)} {...rest} />;
}
