import { Link } from "react-router-dom";
import { N5_COURSE_ID } from "../constants/site.js";
import { useApiQuery } from "../hooks/useApiQuery.js";

/** 상태별 공통 UI의 중앙 카드 골격 (설계/05 §8) */
function CenterCard({ glyph, title, children }) {
  return (
    <div className="panel center-card">
      <div className="center-card-glyph" aria-hidden="true">
        {glyph}
      </div>
      <h2>{title}</h2>
      {children}
    </div>
  );
}

/** §6-2 API 오류 — [다시 시도]로 같은 API 재호출 (인수 21) */
export function ApiErrorCard({ title = "불러오지 못했어요", description = "네트워크 상태를 확인한 뒤 다시 시도해 주세요", onRetry }) {
  return (
    <CenterCard glyph="⚠" title={title}>
      <p>{description}</p>
      <div className="center-card-actions">
        <button className="btn primary" type="button" onClick={onRetry}>
          다시 시도
        </button>
      </div>
    </CenterCard>
  );
}

/**
 * §6-3 404 — 없는 코스/유닛, 없는 경로 공용 (인수 20).
 * 자료실 상세는 목적지가 다르다(§7-4) — prop으로 바꾸되 기본값은 기존 동작 그대로.
 */
export function NotFoundCard({
  title = "찾을 수 없는 페이지예요",
  description = "주소가 바뀌었거나 없는 코스·유닛이에요",
  to = "/courses",
  label = "코스 목록으로",
}) {
  return (
    <CenterCard glyph="？" title={title}>
      <p>{description}</p>
      <div className="center-card-actions">
        <Link className="btn primary" to={to}>
          {label}
        </Link>
        <Link className="btn ghost" to="/">
          홈으로
        </Link>
      </div>
    </CenterCard>
  );
}

/**
 * §6-4 준비중 코스 안내 — 코스명 동적 삽입 (인수 11).
 *
 * "지금 볼 수 있는 코스" 링크는 과정마다 다르다(설계/05 §16-4) —
 * 영어 준비중 코스에서 일본어 왕초보로 튕기지 않도록 prop으로 받는다. 기본값은 기존 동작 그대로.
 */
export function PreparingCard({
  courseLabel,
  openTo = `/courses/${N5_COURSE_ID}`,
  openLabel = "지금은 왕초보(N5) 코스를 시작할 수 있어요 →",
  listTo = "/courses",
  listLabel = "코스 목록으로",
}) {
  return (
    <CenterCard glyph="🚧" title="아직 준비중인 코스예요">
      <p>{courseLabel ? `${courseLabel} 코스는 지금 만들고 있어요.` : "이 코스는 지금 만들고 있어요."}</p>
      {openTo && (
        <p>
          <Link to={openTo}>{openLabel}</Link>
        </p>
      )}
      <div className="center-card-actions">
        <Link className="btn primary" to={listTo}>
          {listLabel}
        </Link>
      </div>
    </CenterCard>
  );
}

/**
 * 준비중 코스의 유닛 주소 진입(404 + COURSE_PREPARING) 시 사용.
 * 코스명은 코스 상세 API로 조회한다 (API 명세 §3-3 결정 근거).
 */
export function CoursePreparingCard({ courseId }) {
  const { data } = useApiQuery(`/api/courses/${courseId}`);
  const courseLabel = data ? `${data.title}(${data.levelLabel})` : null;
  return <PreparingCard courseLabel={courseLabel} />;
}

/**
 * 조건이 잘못된 400 (2026-08-25 판정 A-L1) — **서버가 말한 이유를 그대로** 보여 준다.
 * 눌러서 회복되는 실패가 아니므로 [다시 시도]가 아니라 [조건 초기화]로 빠져나갈 길을 준다(08 C-12 ④).
 */
export function FilterErrorCard({ message, onReset }) {
  return (
    <CenterCard glyph="⚠" title="조건이 올바르지 않아요">
      <p>{message}</p>
      <div className="center-card-actions">
        <button className="btn primary" type="button" onClick={onReset}>
          조건 초기화
        </button>
      </div>
    </CenterCard>
  );
}
