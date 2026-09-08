import { Link } from "react-router-dom";
import { ProgressBar } from "./ProgressBar.jsx";
import { badgeView, isEntryBadge } from "../lib/badgeView.js";

/**
 * 코스 카드 (설계/05 §7 + §8) — 홈 미리보기는 compact(도달점·안내 생략).
 * AVAILABLE만 링크(카드 전체 클릭 타깃), PREPARING은 톤 다운 + 클릭 무반응 (인수 10).
 *
 * @param {string} [badge] 진도 배지 코드(CONTINUE·START·NEXT·DONE·OPEN·PREPARING).
 *        **강조(.entry)는 이 코드에서 파생**된다 — 계산이 "셋 중 하나"를 보장하므로 강조 카드는 한 장이다.
 * @param {boolean} [isEntry] badge가 없을 때만 쓰는 현행(진도 이전) 규칙의 강조 여부
 * @param {number} [completedCount] 그 코스의 완료 유닛 수. 0이면 진도 막대를 렌더하지 않는다
 * @param {string} [pathBase] 상세 경로 접두 — 영어 과정은 "/en/courses"
 * @param {boolean} [showLevel] 레벨 라벨 표시 여부. 영어는 false(설계/05 §16-2)
 */
export function CourseCard({
  course,
  compact = false,
  isEntry = false,
  badge,
  completedCount = 0,
  pathBase = "/courses",
  showLevel = true,
}) {
  const available = course.status === "AVAILABLE";
  const code = badge ?? (available ? (isEntry ? "START" : "OPEN") : "PREPARING");
  const view = badgeView(code);
  const entry = badge ? isEntryBadge(badge) : isEntry;

  const inner = (
    <>
      <div className="course-card-top">
        <span aria-hidden="true" className="course-num">
          {course.courseNo}
        </span>
        <div>
          {/* 영어 과정은 레벨 라벨을 쓰지 않는다 — 코스명이 곧 단계 이름이다(설계/05 §16-2) */}
          <div className="course-level">
            코스 {course.courseNo}
            {showLevel && ` · ${course.levelLabel}`}
          </div>
          <h3 className="course-name">{course.title}</h3>
        </div>
      </div>
      <p className="course-line">대상: {course.targetAudience}</p>
      {!compact && <p className="course-line">도달점: {course.goal}</p>}
      {!compact && course.notice && <p className="course-notice">✎ {course.notice}</p>}
      {/* 진도 막대 — AVAILABLE + 완료 1개 이상일 때만. PREPARING에는 절대 없다(AC-P-21) */}
      {available && (
        <ProgressBar className="course-progress" completed={completedCount} total={course.unitCount} />
      )}
      <div className="course-foot">
        <span className={view.className}>{view.label}</span>
      </div>
    </>
  );

  if (!available) {
    return <div className="course-card disabled">{inner}</div>;
  }

  return (
    <Link className={`course-card${entry ? " entry" : ""}`} to={`${pathBase}/${course.id}`}>
      {inner}
    </Link>
  );
}

/** 로딩 스켈레톤 — 카드 자리 6장 (설계/05 §8) */
export function CourseCardSkeletonGrid({ count = 6 }) {
  return (
    <div className="course-grid" aria-hidden="true">
      {Array.from({ length: count }, (_, i) => (
        <div key={i} className="skeleton sk-card" />
      ))}
    </div>
  );
}
