import { Link, useParams } from "react-router-dom";
import { ApiErrorCard, NotFoundCard, PreparingCard } from "../components/StateCards.jsx";
import { ProgressBar } from "../components/ProgressBar.jsx";
import { MergeBanner } from "../components/MergeBanner.jsx";
import { useApiQuery } from "../hooks/useApiQuery.js";
import { useUserData } from "../context/userDataStore.js";
import { completedCount, isUnitCompleted, nextUnitNo } from "../lib/progressView.js";
import { Alert } from "../components/ui/Alert.jsx";
import { btnClass, cardClass } from "../components/ui/kitClass.js";

function pad2(no) {
  return String(no).padStart(2, "0");
}

function LoadingSkeleton() {
  return (
    <section aria-hidden="true">
      <div className="k-flex page-header">
        <div className="k-skeleton sk-avatar" />
        <div className="page-head-text">
          <div className="k-skeleton sk-line w40" />
          <div className="k-skeleton sk-line w70" />
        </div>
      </div>
      {Array.from({ length: 8 }, (_, i) => (
        <div key={i} className="k-skeleton sk-row" />
      ))}
    </section>
  );
}

/**
 * 주 버튼 3분기 (설계/05 §8) — 어떤 분기에서도 primary는 1개다.
 *
 * 코스 상세는 **지도**다. 가리키는 곳은 "안 한 곳"(미완료 최전선)이고 그 말은 **"다음 유닛"**이지
 * "이어서"가 아니다 — "이어서"는 마지막 위치를 뜻하는 홈·마이페이지의 말이다(2026-09 결정 D-2 · 설계/01 §7-8).
 */
function ctaState(done, next) {
  if (done === 0) return { label: "유닛 1부터 시작하기", unitNo: 1, note: null };
  if (next == null) return { label: "처음부터 다시 보기", unitNo: 1, note: "✓ 이 코스를 완주했어요" };
  return { label: `유닛 ${next} 학습하기`, unitNo: next, note: null };
}

/**
 * 코스 상세 — 유닛 목록 (설계/05 §7 + §8).
 *
 * 영어 과정은 **같은 화면의 한 자리를 갈아 끼운다**(설계/05 §16):
 * 한자 집계 → 표현 집계, 레벨 괄호 없음, 맛보기 안내(course.notice). 진도·CTA 분기는 그대로다.
 */
export function CourseDetailPage({ lang = "ja" }) {
  const en = lang === "en";
  const { courseId } = useParams();
  const apiBase = en ? "/api/en/courses" : "/api/courses";
  const pathBase = en ? "/en/courses" : "/courses";
  const { data, loading, error, reload } = useApiQuery(`${apiBase}/${courseId}`);
  const { data: enCourses } = useApiQuery(en ? "/api/en/courses" : null);
  const { progress } = useUserData();

  // 준비중 영어 코스에서 안내할 "열린 첫 코스" — 준비중일 때만 필요하므로 그때만 부른다
  const openEnCourse =
    (Array.isArray(enCourses) ? enCourses : []).find((course) => course.status === "AVAILABLE") ?? null;

  if (loading) return <LoadingSkeleton />;
  if (error) {
    // 400 = 비숫자 주소(/courses/abc) — 재시도로 회복 불가, "없는 주소"로 취급 (코드리뷰 반영)
    if (error.status === 404 || error.status === 400) {
      return en ? <NotFoundCard label="영어 코스 목록으로" to="/en/courses" /> : <NotFoundCard />;
    }
    return <ApiErrorCard onRetry={reload} />;
  }

  // 준비중 코스(status=PREPARING)는 200으로 내려온다 — 준비중 안내 화면 분기 (API 명세 §3-2)
  if (data.status === "PREPARING") {
    // 영어는 코스 이름만(레벨 표기가 없다) + 돌아갈 곳도 영어 목록이다(§2 상태별 UI).
    // "지금 볼 수 있는 코스"는 **열린 첫 영어 코스**다 — 없으면 그 줄을 만들지 않는다(A-M2 · 08 C-12 ②)
    return en ? (
      <PreparingCard
        courseLabel={data.title}
        listLabel="영어 코스 목록으로"
        listTo="/en/courses"
        openLabel={openEnCourse ? `지금은 ${openEnCourse.title} 코스를 시작할 수 있어요 →` : null}
        openTo={openEnCourse ? `/en/courses/${openEnCourse.id}` : null}
      />
    ) : (
      <PreparingCard courseLabel={`${data.title}(${data.levelLabel})`} />
    );
  }

  const summary = data.summary ?? {};
  // 영어에는 레벨 글리프가 없다 — 코스 카드가 쓰는 "코스 n"과 같은 값을 세운다(설계/05 §16-2)
  const avatarGlyph = en ? String(data.courseNo) : data.levelLabel?.replace(/^JLPT\s*/, "") || "学";
  // 한자(일본어)·표현(영어)은 0이 정상일 수 있는 칸이다 — 0이면 집계줄·유닛 행에서 뺀다(08 C-12 ①)
  const middleCount = (en ? summary.expressionCount : summary.kanjiCount) ?? 0;
  const unitMeta = (unit) =>
    [
      `문법 ${unit.grammarCount}`,
      "회화 1",
      // 구분점이 겹치지 않게 **값이 있는 항목만 모아** 한 번에 잇는다
      (en ? unit.expressionCount : unit.kanjiCount) > 0
        ? en
          ? `표현 ${unit.expressionCount}`
          : `한자 ${unit.kanjiCount}자`
        : null,
      `어휘 ${unit.vocabCount}개`,
    ]
      .filter(Boolean)
      .join(" · ");
  const done = completedCount(progress.completedUnits, data.id);
  const next = nextUnitNo(progress.completedUnits, data.id, summary.unitCount);
  // 이 코스에서 마지막으로 보던 유닛 — 다른 코스의 마지막 위치는 이 화면에 표시하지 않는다
  const lastSeenUnitNo = progress.lastPosition?.courseId === data.id ? progress.lastPosition.unitNo : null;
  const cta = ctaState(done, next);

  return (
    <section>
      <MergeBanner />

      <div className="k-flex page-header">
        <div aria-hidden="true" className="k-avatar page-avatar">
          {avatarGlyph}
        </div>
        <div className="page-head-text">
          <h1 className="k-page-title">{en ? data.title : `${data.title} (${data.levelLabel})`}</h1>
          <p className="k-page-desc">{data.description}</p>
        </div>
      </div>

      {/* 맛보기 안내 — 새 필드를 만들지 않고 기존 course.notice를 쓴다(§2, 영어에만) */}
      {en && data.notice && <Alert>✎ {data.notice}</Alert>}

      {/* 요약 — API 집계값 (하드코딩 금지, 설계/05 §8) + 진도 막대(§8) */}
      <div className="k-flex statusbar">
        <span className="k-badge">
          유닛 <b>{summary.unitCount}</b>
        </span>
        <span className="k-badge">
          문법 <b>{summary.grammarCount}</b>
        </span>
        {/* 0이 **정상인** 칸은 통째로 그리지 않는다 — 입문은 한자 0자가 설계다(08 C-12 ①, J-1 선례).
            문법·어휘·유닛 수는 0이 정상이 아니므로(콘텐츠 결함) 0이어도 계속 그려 드러나게 둔다 */}
        {middleCount > 0 && (
          <span className="k-badge">
            {en ? "표현" : "한자"} <b>{en ? summary.expressionCount : `${summary.kanjiCount}자`}</b>
          </span>
        )}
        <span className="k-badge">
          어휘 <b>{en ? `${summary.vocabCount}개` : `약 ${summary.vocabCount}개`}</b>
        </span>
        <ProgressBar
          className="statusbar-progress"
          completed={done}
          suffix="유닛 완료"
          total={summary.unitCount}
        />
      </div>

      <div className="k-flex course-cta-row">
        {cta.note && <span className="cta-note">{cta.note}</span>}
        {/* 이 화면의 유일한 primary */}
        <Link className={btnClass({ variant: "primary", size: "lg" })} to={`${pathBase}/${data.id}/units/${cta.unitNo}`}>
          {cta.label}
        </Link>
      </div>

      <div className={cardClass({ flush: true, className: "unit-list" })}>
        {data.units.map((unit) => {
          const unitDone = isUnitCompleted(progress.completedUnits, data.id, unit.unitNo);
          // "여기부터"는 진도가 있을 때만 — 진도 0이면 주 버튼이 이미 같은 말을 한다(§2-3)
          const isHere = done > 0 && next === unit.unitNo;
          // "보던 중"은 읽기 전용 표시다 — 건너뛰어 보던 유닛을 화면에서 지우지 않는다(2026-09 결정 D-2 · AC-R-6).
          // 최전선과 같으면 "여기부터"만 붙이고, 완료된 유닛에는 붙이지 않는다(복습은 처음부터 — 01 §7-4).
          const isSeen = !isHere && !unitDone && lastSeenUnitNo === unit.unitNo;
          return (
            <Link
              key={unit.unitNo}
              className={`unit-row${unitDone ? " done" : ""}`}
              to={`${pathBase}/${data.id}/units/${unit.unitNo}`}
            >
              <span aria-hidden="true" className="unit-num">
                {pad2(unit.unitNo)}
              </span>
              <span className="unit-title">{unit.title}</span>
              {/* 읽기 전용 표시 — 버튼이 아니다 (AC-P-06) */}
              {unitDone && <span className="unit-done-mark">✓ 완료</span>}
              {isHere && <span className="unit-here-badge">여기부터</span>}
              {isSeen && <span className="unit-seen-mark">보던 중</span>}
              <span className="unit-meta">
                {unitMeta(unit)}
              </span>
              <span aria-hidden="true" className="unit-chevron">
                ›
              </span>
            </Link>
          );
        })}
      </div>
    </section>
  );
}
