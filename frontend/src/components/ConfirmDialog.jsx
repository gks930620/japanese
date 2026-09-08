import { useEffect, useRef, useState } from "react";

/**
 * 확인 대화상자 (설계/05 §12-1) — 되돌릴 수 없는 삭제에만 쓴다.
 * `<dialog>` 기반이라 ESC 닫기·포커스 트랩이 공짜다. 딤은 `--dim` 토큰이고
 * **backdrop-filter(유리)는 쓰지 않는다**(원칙 ③: blur는 헤더에만).
 * ESC·backdrop 닫기는 onClose 하나로 받는다(onCancel과 함께 달면 두 번 호출된다).
 * 위험 동작은 `.btn-danger`, 취소가 오른쪽(실수로 누르기 쉬운 자리에 파괴적 동작을 두지 않는다).
 */
// showModal()이 있는 환경(브라우저)에서는 그것으로 연다 — 포커스 트랩·ESC·::backdrop이 공짜다.
// jsdom에는 showModal이 없어 그대로 두면 <dialog>가 닫힌 채(display:none) 남아 내용이 접근성 트리에서 사라진다.
// 그 경우에만 open 속성으로 연다. (둘을 동시에 쓰면 브라우저가 InvalidStateError를 던진다)
const SUPPORTS_MODAL =
  typeof HTMLDialogElement !== "undefined" && typeof HTMLDialogElement.prototype.showModal === "function";

export function ConfirmDialog({ open, title, description, confirmLabel, errorText = "처리하지 못했어요. 잠시 후 다시 시도해 주세요.", onConfirm, onCancel }) {
  const ref = useRef(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (open && !dialog.open && SUPPORTS_MODAL) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);

  if (!open) return null;

  const handleConfirm = async () => {
    setError(false);
    const result = await onConfirm();
    // 실패하면 대화상자를 닫지 않고 그 안에서 알린다(§5-2)
    if (result && result.ok === false) setError(true);
  };

  return (
    <dialog className="confirm-dialog" open={!SUPPORTS_MODAL} ref={ref} onClose={onCancel}>
      <div className="confirm-panel">
        <h2>{title}</h2>
        <p>{description}</p>
        {error && (
          <p className="done-toggle-error" role="status">
            {errorText}
          </p>
        )}
        <div className="confirm-actions">
          <button className="btn btn-danger" type="button" onClick={handleConfirm}>
            {confirmLabel}
          </button>
          {/* 기본 포커스는 취소 */}
          <button autoFocus className="btn ghost" type="button" onClick={onCancel}>
            취소
          </button>
        </div>
      </div>
    </dialog>
  );
}
