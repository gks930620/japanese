import { useUserData } from "../context/userDataStore.js";

/**
 * 인라인 알림 (설계/05 §8) — 담기 실패·200개 상한 전용 한 줄.
 * 오버레이가 아니라 레이아웃을 밀어내는 줄이고, 한 번에 하나만 존재한다(컨텍스트가 보장).
 */
export function InlineAlert() {
  const { alert, dismissAlert, isAuthenticated } = useUserData();
  if (!alert) return null;

  return (
    <div className={`inline-alert${alert.tone === "warn" ? " warn" : ""}`} role="status">
      <span>{alert.message}</span>
      <span className="notice-actions">
        {!isAuthenticated && alert.tone === "warn" && (
          <a className="btn" href="/login">
            로그인
          </a>
        )}
        <button className="btn ghost" type="button" onClick={dismissAlert}>
          닫기
        </button>
      </span>
    </div>
  );
}
