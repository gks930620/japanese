import { cx } from "./kitClass.js";

/**
 * 모달 내부 구획 — 킷 `.k-modal__*`.
 * 겉면(`<dialog>` + `showModal()`)은 도메인이 쥔다(설계/05 §12-1 ⑤) —
 * 여기서 `.k-backdrop` div를 만들지 않는다. 딤은 `dialog::backdrop`이 그린다.
 */
export function Modal({ className, ...rest }) {
  return <div className={cx("k-modal", className)} {...rest} />;
}

export function ModalHead({ className, ...rest }) {
  return <div className={cx("k-modal__head", className)} {...rest} />;
}

export function ModalBody({ className, ...rest }) {
  return <div className={cx("k-modal__body", className)} {...rest} />;
}

export function ModalFoot({ className, ...rest }) {
  return <div className={cx("k-modal__foot", className)} {...rest} />;
}
