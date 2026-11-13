import { progressRatio } from "../lib/progressView.js";
import { Bar } from "./ui/Bar.jsx";

/**
 * 진도 막대 (작업자(AI)_문서/05 §8) — 코스 카드·코스 상세가 **같은 컴포넌트**를 쓴다.
 * 채움은 `--point` 단색이다(반복 요소라 강조를 늘리지 않는다).
 * 막대는 aria-hidden이고 **숫자 라벨이 접근성 정보를 담당한다**(같은 사실을 두 번 읽지 않게).
 *
 * 킷 `.k-bar`가 표현을 맡고, 도메인 이름(`progress-bar`/`progress-fill`)은 배치용으로 병기한다.
 *
 * @param {number} completed 완료 유닛 수
 * @param {number} total 총 유닛 수 = `courseUnitTotal(course)`(= `plannedUnitCount ?? unitCount` — 하드코딩 금지).
 *        열린 수를 분모로 쓰면 부분 공개 코스가 5/5 = 100%가 되어 막대가 "완주"를 대신 말한다(작업자(AI)_문서/04 §6-1)
 * @param {string} [suffix] 라벨 꼬리. 코스 카드 "유닛" / 코스 상세 "유닛 완료"
 */
export function ProgressBar({ completed, total, suffix = "유닛", className = "" }) {
  // 진도 0(또는 유닛 없음)이면 통째로 렌더링하지 않는다 — 빈 막대는 결핍을 강조한다
  if (!completed || completed <= 0 || !total || total <= 0) return null;

  const ratio = progressRatio(completed, total);
  const shown = Math.min(completed, total);

  return (
    <div className={`progress-wrap ${className}`.trim()}>
      <Bar aria-hidden="true" className="progress-bar" fillClassName="progress-fill" percent={ratio * 100} />
      <span className="progress-label">
        {shown} / {total} {suffix}
      </span>
    </div>
  );
}
