/**
 * 킷 클래스 조립기 — `.k-*` 문자열이 이 폴더 밖으로 새어 나가지 않게 하는 유일한 통로다.
 *
 * 컴포넌트로 감쌀 수 없는 자리(react-router의 `<Link>`, `<dialog>`, `<td>` 등)에서 쓴다.
 * 여기에도 CSS·style 은 없다. 문자열 조립만 한다(매핑 §5-1).
 */

/** falsy를 걸러 클래스 문자열을 잇는다 */
export function cx(...parts) {
  return parts.filter(Boolean).join(" ");
}

export function btnClass({ variant, size, block, icon, className } = {}) {
  return cx(
    "k-btn",
    variant && `k-btn--${variant}`,
    size && `k-btn--${size}`,
    block && "k-btn--block",
    icon && "k-btn--icon",
    className,
  );
}

export function cardClass({ hover, flush, className } = {}) {
  return cx("k-card", hover && "k-card--hover", flush && "k-card--flush", className);
}

export function chipClass({ className } = {}) {
  return cx("k-chip", className);
}

/** tone: point | ok | warn | err (의미색) · pill: 알약 배지(오렌지 --point-2, 신규 표시 전용) */
export function badgeClass({ tone, pill, className } = {}) {
  return cx("k-badge", tone && `k-badge--${tone}`, pill && "k-badge--pill", className);
}

export function alertClass({ tone, className } = {}) {
  return cx("k-alert", tone && `k-alert--${tone}`, className);
}

/* ── 폼·컨테이너 ────────────────────────────────────────────────────
   컴포넌트로 감싸기 어려운 자리(이미 속성이 많은 기존 태그, `<Link>`, `<td>` 등)를 위한 조립기.
   감쌀 수 있는 자리에서는 `Field`/`Label`/`Input`/`Empty` 컴포넌트를 먼저 쓴다. */

export function fieldClass(className) {
  return cx("k-field", className);
}

/** required 는 도메인 표시다 — 킷에 필수 표시가 없어 `.k-label` 위에 ::after 만 얹는다(매핑 §3-3) */
export function labelClass(className) {
  return cx("k-label", className);
}

export function inputClass(className) {
  return cx("k-input", className);
}

export function textareaClass(className) {
  return cx("k-textarea", className);
}

export function selectClass(className) {
  return cx("k-select", className);
}

export function helpClass({ error, className } = {}) {
  return cx("k-help", error && "k-help--err", className);
}

export function emptyClass(className) {
  return cx("k-empty", className);
}

export function toolbarClass(className) {
  return cx("k-toolbar", className);
}
