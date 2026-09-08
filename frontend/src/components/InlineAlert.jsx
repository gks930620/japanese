import { useUserData } from "../context/userDataStore.js";
import { Alert } from "./ui/Alert.jsx";
import { Button } from "./ui/Button.jsx";
import { btnClass } from "./ui/kitClass.js";

/**
 * 인라인 알림 (설계/05 §8) — 담기 실패·200개 상한 전용 한 줄.
 * 오버레이가 아니라 레이아웃을 밀어내는 줄이고, 한 번에 하나만 존재한다(컨텍스트가 보장).
 */
export function InlineAlert() {
  const { alert, dismissAlert, isAuthenticated } = useUserData();
  if (!alert) return null;

  return (
    <Alert className="inline-alert" role="status" tone={alert.tone === "warn" ? "warn" : undefined}>
      <span>{alert.message}</span>
      <span className="k-flex notice-actions">
        {!isAuthenticated && alert.tone === "warn" && (
          <a className={btnClass({ variant: "secondary", size: "sm" })} href="/login">
            로그인
          </a>
        )}
        <Button size="sm" variant="ghost" onClick={dismissAlert}>
          닫기
        </Button>
      </span>
    </Alert>
  );
}
