import { useUserData } from "../context/userDataStore.js";

/**
 * 로그인 시 병합 배너 (설계/04 §6-6) — **경고가 아니라 질문이다.**
 * 콘텐츠 최상단의 중립 톤 `.notice`(info도 warn도 아니다), [합치기]는 primary가 아니다
 * — 기본값을 강하게 유도하면 공용 PC에서 사고가 난다.
 * 세 선택(합치기 / 내 기록 아니에요 / 닫기)이 모두 보인다.
 */
export function MergeBanner() {
  const { merge, mergeGuest, discardMerge, closeMerge } = useUserData();
  const { state, counts, result } = merge;
  if (!state) return null;

  if (state === "MERGED") {
    return (
      <div className="notice ok merge-banner" role="status">
        합쳤어요 — 완료 {result?.completedUnitCount ?? 0}유닛 · 보관함 {result?.bookmarkCount ?? 0}개
      </div>
    );
  }

  if (state === "DISCARDED") {
    return (
      <div className="notice merge-banner" role="status">
        이 브라우저 기록을 지웠어요.
      </div>
    );
  }

  if (state === "FAILED") {
    return (
      <div className="notice error merge-banner" role="status">
        <p>합치지 못했어요. 잠시 후 다시 시도해 주세요.</p>
        <div className="merge-actions">
          <button className="btn" type="button" onClick={mergeGuest}>
            다시 시도
          </button>
          <button aria-label="닫기" className="merge-close" type="button" onClick={closeMerge}>
            ✕
          </button>
        </div>
      </div>
    );
  }

  const merging = state === "MERGING";
  return (
    <div className="notice merge-banner">
      <p>
        이 브라우저에 저장된 학습 기록이 있어요 — 완료 {counts?.completedUnitCount ?? 0}유닛 · 보관함{" "}
        {counts?.bookmarkCount ?? 0}개
      </p>
      <p>내 계정으로 가져올까요? 다른 사람이 쓰던 기록이면 [내 기록 아니에요]를 눌러 주세요.</p>
      <div className="merge-actions">
        <button className="btn" disabled={merging} type="button" onClick={mergeGuest}>
          {merging ? "합치는 중이에요…" : "합치기"}
        </button>
        <button className="btn ghost" disabled={merging} type="button" onClick={discardMerge}>
          내 기록 아니에요
        </button>
        <button aria-label="닫기" className="merge-close" type="button" onClick={closeMerge}>
          ✕
        </button>
      </div>
    </div>
  );
}
