import { cx } from "./kitClass.js";

/** 표는 반드시 이 래퍼 안에 둔다 — 없으면 좁은 화면에서 가로로 터진다(킷 §12) */
export function TableWrap({ className, ...rest }) {
  return <div className={cx("k-tablewrap", className)} {...rest} />;
}

export function Table({ className, ...rest }) {
  return <table className={cx("k-table", className)} {...rest} />;
}
