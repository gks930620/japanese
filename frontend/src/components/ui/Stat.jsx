import { cx } from "./kitClass.js";

/** 수치 타일 묶음 — 킷 `.k-stats` 자동 격자 */
export function Stats({ className, ...rest }) {
  return <div className={cx("k-stats", className)} {...rest} />;
}

/** 수치 타일 하나 — `point`면 값이 강조색. 여러 장 중 한 장만 준다 */
export function Stat({ label, value, point, className, ...rest }) {
  return (
    <div className={cx("k-stat", point && "k-stat--point", className)} {...rest}>
      <span className="k-stat__label">{label}</span>
      <strong className="k-stat__value">{value}</strong>
    </div>
  );
}
