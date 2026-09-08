import { Link } from "react-router-dom";
import { CourseCard, CourseCardSkeletonGrid } from "../components/CourseCard.jsx";
import { ApiErrorCard } from "../components/StateCards.jsx";
import { MergeBanner } from "../components/MergeBanner.jsx";
import { useApiQuery } from "../hooks/useApiQuery.js";
import { useRouteNotice } from "../hooks/useRouteNotice.js";
import { useUserData } from "../context/userDataStore.js";
import { entryCourseNo } from "../lib/courses.js";
import { completedCount, courseBadges } from "../lib/progressView.js";
import { isEntryBadge } from "../lib/badgeView.js";
import { resumeTarget } from "../lib/resume.js";

/**
 * 히어로 분기 (설계/05 §8) — 부제를 **교체**하고 줄을 추가하지 않는다.
 * 유닛 제목은 넣지 않는다: 홈은 코스 목록만 부르는 화면이고 그 응답에 유닛 제목이 없다.
 *
 * "이어서"의 정의는 `lib/resume.js` 하나다 — 홈과 마이페이지가 각자 계산하면
 * 같은 말로 다른 곳에 보낸다(2026-09 결정 D-2 · 설계/01 §7-8).
 */
function heroState(resume, progress, hasHighlight, coursesLoaded) {
  if (resume) {
    return { resume: resume.text, ctaLabel: resume.ctaLabel, ctaTo: resume.to };
  }
  // 마지막 위치는 있는데 코스를 아직 못 찾았다 = 목록이 안 왔다는 뜻이다.
  // 이때 "학습 시작하기"를 그리면 이어보기가 있는 사람을 코스 목록으로 보낸다 — 버튼을 잠시 비운다.
  if (progress.lastPosition && !coursesLoaded) return null;
  // 준비된 코스를 전부 마쳐 강조 카드가 한 장도 없는 상태
  if (!hasHighlight && progress.completedUnits.length > 0) {
    return { resume: "준비된 코스를 모두 마쳤어요", ctaLabel: "코스 목록 보기", ctaTo: "/courses" };
  }
  return { resume: null, ctaLabel: "학습 시작하기", ctaTo: "/courses" };
}

// 홈 (설계/05 §3-2) — 히어로 + 코스 미리보기(축약 카드 6장)
export function HomePage() {
  const { data: courses, loading, error, reload } = useApiQuery("/api/courses");
  // 마지막 위치가 영어 코스일 수 있다 — 두 과정 목록에서 찾는다(영어 진도를 일본어 주소에 끼우면 404다)
  const { data: enCourses } = useApiQuery("/api/en/courses");
  const { progress, ready } = useUserData();
  const notice = useRouteNotice(); // 탈퇴 완료 등 일회성 안내 (설계/05 §8)
  const list = courses ?? [];
  const badges = courseBadges(list, progress);
  const entryNo = entryCourseNo(list);
  const hasHighlight = Object.values(badges).some(isEntryBadge);
  // 진도가 도착하기 전에는 히어로 CTA를 확정하지 않는다 — 먼저 "학습 시작하기"를 그렸다가
  // "이어서 학습하기"로 바뀌면 그 사이에 누른 사람이 엉뚱한 곳으로 간다(UnitStudyPage·BookmarksPage와 같은 규칙)
  const hero = ready
    ? heroState(resumeTarget(progress, { ja: list, en: enCourses ?? [] }), progress, hasHighlight, courses != null)
    : null;

  return (
    <>
      {notice && (
        <div className="notice ok" role="status">
          {notice}
        </div>
      )}
      <MergeBanner />

      <section className="hero">
        <h1>일본어, 어떤 순서로 배울지 고민하지 마세요</h1>
        {hero?.resume ? (
          <p className="hero-resume">{hero.resume}</p>
        ) : (
          <p>입문부터 JLPT N1까지 — 정해진 한 길을 따라 &lsquo;다음 유닛&rsquo;만 누르면 됩니다</p>
        )}
        {/* 그라디언트 히어로 위라 흰 알약이 가장 강한 대비 — primary 금지 (설계/05 §3-2).
            진도 도착 전에는 버튼 자리를 비워 둔다 — 잘못된 목적지를 잠깐이라도 보여주지 않는다 */}
        {hero && (
          <Link className="hero-cta" to={hero.ctaTo}>
            {hero.ctaLabel}
          </Link>
        )}
      </section>

      {/* 진단 배너 (화면정의서 판정 B) — 히어로의 기본값 다음에 오는 보조 행동. 그라디언트 0 */}
      <div className="notice info row">
        <span>어디서 시작할지 모르겠나요? 3분이면 알 수 있어요</span>
        <span className="notice-actions">
          <Link className="btn" to="/diagnosis">
            내 시작점 찾기
          </Link>
        </span>
      </div>

      <h2 className="section-heading">학습 경로</h2>

      {loading && <CourseCardSkeletonGrid />}
      {!loading && error && <ApiErrorCard title="코스 목록을 불러오지 못했어요" onRetry={reload} />}
      {!loading && !error && (
        <div className="course-grid">
          {list.map((course) => (
            <CourseCard
              key={course.id}
              compact
              badge={badges[course.id]}
              completedCount={completedCount(progress.completedUnits, course.id)}
              course={course}
              isEntry={course.courseNo === entryNo}
            />
          ))}
        </div>
      )}
    </>
  );
}
