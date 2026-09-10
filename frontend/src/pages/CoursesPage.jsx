import { Link } from "react-router-dom";
import { CourseCard, CourseCardSkeletonGrid } from "../components/CourseCard.jsx";
import { ApiErrorCard } from "../components/StateCards.jsx";
import { MergeBanner } from "../components/MergeBanner.jsx";
import { useApiQuery } from "../hooks/useApiQuery.js";
import { useUserData } from "../context/userDataStore.js";
import { entryCourseNo } from "../lib/courses.js";
import { completedCount, courseBadges } from "../lib/progressView.js";
import { isEntryBadge } from "../lib/badgeView.js";
import { Alert } from "../components/ui/Alert.jsx";
import { btnClass } from "../components/ui/kitClass.js";

// 코스 목록 (설계/05 §7 + §8) — 경로 순서(courseNo) 고정 6장 (인수 8)
export function CoursesPage() {
  const { data: courses, loading, error, reload } = useApiQuery("/api/courses");
  const { progress } = useUserData();
  const list = courses ?? [];
  const badges = courseBadges(list, progress);
  const entryNo = entryCourseNo(list);
  const hasHighlight = Object.values(badges).some(isEntryBadge);
  const hasProgress = progress.completedUnits.length > 0 || progress.lastPosition != null;
  // 안내 띠의 코스명은 배지와 **같은 계산**에서 나온다 — 문구에 코스명을 적어 두면
  // 입문이 열려도 "왕초보부터"라고 말하는 자기모순이 생긴다(2026-09 판정 D-4).
  const entryCourse = list.find((course) => course.courseNo === entryNo) ?? null;
  const entryLabel = entryCourse
    ? entryCourse.levelLabel && entryCourse.levelLabel !== entryCourse.title
      ? `${entryCourse.title}(${entryCourse.levelLabel.replace(/^JLPT\s*/, "")})`
      : entryCourse.title
    : null;

  return (
    <section className="courses-page">
      <MergeBanner />

      <div className="k-flex page-header">
        <div aria-hidden="true" className="k-avatar page-avatar">
          学
        </div>
        <div className="page-head-text">
          <h1 className="k-page-title">학습 코스</h1>
          <p className="k-page-desc">입문부터 N1까지, 순서대로 하나의 길입니다</p>
        </div>
      </div>

      {/* 상단 안내 띠는 한 번에 하나 (설계/05 §8 + 학습도구 판정 B — 진단 배너 병합) */}
      {!loading && !error && !hasProgress && entryLabel && (
        <Alert className="row-alert courses-start-notice">
          <span>✎ 처음이면 {entryLabel}부터 시작하세요 — 내 실력이 애매하다면 3분만에 확인해 보세요</span>
          <span className="k-flex notice-actions">
            <Link className={btnClass({ variant: "secondary", size: "sm" })} to="/diagnosis">
              내 시작점 찾기
            </Link>
          </span>
        </Alert>
      )}
      {!loading && !error && hasProgress && hasHighlight && (
        <Alert className="row-alert courses-start-notice">
          <span>어디서 시작할지 고민되나요? 3분이면 알 수 있어요</span>
          <span className="k-flex notice-actions">
            <Link className={btnClass({ variant: "secondary", size: "sm" })} to="/diagnosis">
              내 시작점 찾기
            </Link>
          </span>
        </Alert>
      )}
      {/* 전부 완주 — 완주자에게 시작점 찾기는 무의미하므로 진단 배너 생략(판정 B) */}
      {!loading && !error && hasProgress && !hasHighlight && (
        <Alert className="courses-start-notice">✎ 준비된 코스를 모두 마쳤어요</Alert>
      )}

      {loading && <CourseCardSkeletonGrid />}
      {!loading && error && <ApiErrorCard onRetry={reload} />}
      {!loading && !error && (
        <div className="course-grid">
          {list.map((course) => (
            <CourseCard
              key={course.id}
              badge={badges[course.id]}
              completedCount={completedCount(progress.completedUnits, course.id)}
              course={course}
              isEntry={course.courseNo === entryNo}
            />
          ))}
        </div>
      )}
    </section>
  );
}
