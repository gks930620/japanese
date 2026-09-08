import { cx } from "./kitClass.js";

/** 라벨+입력+도움말 한 묶음 — 킷 `.k-field`(아래 여백 담당) */
export function Field({ className, ...rest }) {
  return <div className={cx("k-field", className)} {...rest} />;
}

export function Label({ className, required, ...rest }) {
  return <label className={cx("k-label", required && "required", className)} {...rest} />;
}

export function Input({ className, ...rest }) {
  return <input className={cx("k-input", className)} {...rest} />;
}

export function Select({ className, ...rest }) {
  return <select className={cx("k-select", className)} {...rest} />;
}

export function Textarea({ className, ...rest }) {
  return <textarea className={cx("k-textarea", className)} {...rest} />;
}

/** 도움말 · 오류 메시지. 오류면 입력에 `aria-invalid="true"`도 함께 준다 */
export function Help({ error, className, ...rest }) {
  return <p className={cx("k-help", error && "k-help--err", className)} {...rest} />;
}
