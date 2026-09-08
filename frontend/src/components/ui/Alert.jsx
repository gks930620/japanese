import { alertClass } from "./kitClass.js";

/**
 * 알림 — 킷 `.k-alert`. tone 없으면 기본(중립)형이다.
 * 가로 배치가 필요하면 안쪽에 `.k-flex`를 쓴다(변형 클래스를 따로 두지 않는다).
 */
export function Alert({ tone, className, ...rest }) {
  return <div className={alertClass({ tone, className })} {...rest} />;
}
