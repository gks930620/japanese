import { useUserData } from "../context/userDataStore.js";
import { Alert } from "./ui/Alert.jsx";
import { Button } from "./ui/Button.jsx";

/**
 * 로그인 시 병합 배너 (설계/04 §6-6) — **경고가 아니라 질문이다.**
 * 콘텐츠 최상단의 중립 톤 알림(ok도 err도 아니다), [합치기]는 primary가 아니다
 * — 기본값을 강하게 유도하면 공용 PC에서 사고가 난다.
 * 세 선택(합치기 / 내 기록 아니에요 / 닫기)이 모두 보인다.
 */
export function MergeBanner() {
  const { merge, mergeGuest, discardMerge, closeMerge } = useUserData();
  const { state, counts, result } = merge;
  if (!state) return null;

  if (state === "MERGED") {
    return (
      <Alert className="merge-banner" role="status" tone="ok">
        합쳤어요 — 완료 {result?.completedUnitCount ?? 0}유닛 · 보관함 {result?.bookmarkCount ?? 0}개
      </Alert>
    );
  }

  if (state === "DISCARDED") {
    return (
      <Alert className="merge-banner" role="status">
        이 브라우저 기록을 지웠어요.
      </Alert>
    );
  }

  if (state === "FAILED") {
    return (
      <Alert className="merge-banner" role="status" tone="err">
        <div>
          <p>합치지 못했어요. 잠시 후 다시 시도해 주세요.</p>
          <div className="k-flex merge-actions">
            <Button size="sm" variant="secondary" onClick={mergeGuest}>
              다시 시도
            </Button>
            <button aria-label="닫기" className="merge-close" type="button" onClick={closeMerge}>
              ✕
            </button>
          </div>
        </div>
      </Alert>
    );
  }

  const merging = state === "MERGING";
  return (
    <Alert className="merge-banner">
      <div>
        <p>
          이 브라우저에 저장된 학습 기록이 있어요 — 완료 {counts?.completedUnitCount ?? 0}유닛 · 보관함{" "}
          {counts?.bookmarkCount ?? 0}개
        </p>
        <p>내 계정으로 가져올까요? 다른 사람이 쓰던 기록이면 [내 기록 아니에요]를 눌러 주세요.</p>
        <div className="k-flex merge-actions">
          <Button disabled={merging} size="sm" variant="secondary" onClick={mergeGuest}>
            {merging ? "합치는 중이에요…" : "합치기"}
          </Button>
          <Button disabled={merging} size="sm" variant="ghost" onClick={discardMerge}>
            내 기록 아니에요
          </Button>
          <button aria-label="닫기" className="merge-close" type="button" onClick={closeMerge}>
            ✕
          </button>
        </div>
      </div>
    </Alert>
  );
}
