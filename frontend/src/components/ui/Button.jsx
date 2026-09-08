import { btnClass } from "./kitClass.js";

/**
 * 버튼 — 킷 `.k-btn` 어댑터.
 * 비활성은 클래스가 아니라 `disabled` 속성이다(킷이 처리한다).
 * `<a>`·`<Link>`에 같은 모양이 필요하면 `kitClass.js`의 `btnClass()`를 쓴다.
 */
export function Button({ variant, size, block, icon, className, type = "button", ...rest }) {
  return <button className={btnClass({ variant, size, block, icon, className })} type={type} {...rest} />;
}
