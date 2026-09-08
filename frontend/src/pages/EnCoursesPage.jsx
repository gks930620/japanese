import { Link } from "react-router-dom";
import { CourseCard, CourseCardSkeletonGrid } from "../components/CourseCard.jsx";
import { ApiErrorCard } from "../components/StateCards.jsx";
import { useApiQuery } from "../hooks/useApiQuery.js";
import { useUserData } from "../context/userDataStore.js";
import { completedCount } from "../lib/progressView.js";

/**
 * 영어 코스 목록 (설계/05 §16·§16-2).
 *
 * 일본어 목록과 두 가지가 다르다:
 *  1. **레벨 라벨을 쓰지 않는다** — 코스명이 곧 단계 이름이다(CEFR은 내부 참고일 뿐).
 *  2. **시작 배지를 자동으로 붙이지 않는다** — 배지는 자가진단 결과에만 붙고, 결과는 저장하지 않는다.
 */
export function EnCoursesPage() {
  const { data: courses, loading, error, reload } = useApiQuery("/api/en/courses");
  const { progress } = useUserData();
  const list = courses ?? [];

  return (
    <section>
      <div className="page-header">
        <div aria-hidden="true" className="page-avatar">
          EN
        </div>
        <div className="page-head-text">
          <h1>영어 코스</h1>
          <p>말할 수 있는 것이 늘어나는 순서로, 다섯 단계입니다</p>
        </div>
      </div>

      <div className="notice info row courses-start-notice">
        <span>고를 필요 없어요 — 지금 상태에 가장 가까운 문장 하나만 고르면 돼요</span>
        <span className="notice-actions">
          <Link className="btn" to="/en/start">
            어디서 시작할지 보기
          </Link>
        </span>
      </div>

      {loading && <CourseCardSkeletonGrid count={5} />}
      {!loading && error && <ApiErrorCard onRetry={reload} />}
      {!loading && !error && (
        <div className="course-grid">
          {list.map((course) => (
            <CourseCard
              key={course.id}
              completedCount={completedCount(progress.completedUnits, course.id)}
              course={course}
              pathBase="/en/courses"
              showLevel={false}
            />
          ))}
        </div>
      )}
    </section>
  );
}
