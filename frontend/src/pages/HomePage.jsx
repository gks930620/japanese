import { Link } from "react-router-dom";
import { ApiErrorCard } from "../components/StateCards.jsx";
import { MergeBanner } from "../components/MergeBanner.jsx";
import { Alert } from "../components/ui/Alert.jsx";
import { Card } from "../components/ui/Card.jsx";
import { Stat, Stats } from "../components/ui/Stat.jsx";
import { btnClass } from "../components/ui/kitClass.js";
import { useApiQuery } from "../hooks/useApiQuery.js";
import { useRouteNotice } from "../hooks/useRouteNotice.js";
import { useUserData } from "../context/userDataStore.js";
import { resumeTarget } from "../lib/resume.js";

/**
 * 홈 — **이 사이트가 무엇인지 설명하는 화면**이다.
 *
 * 코스 카드를 늘어놓지 않는다: 그건 `/courses`가 하는 일이고, 둘 다 그리면
 * 홈과 코스 목록이 같은 화면이 된다(2026-09-09 사용자 지적).
 * 홈이 답해야 하는 질문은 "무엇을 배우나"가 아니라 **"왜 여기서 배우나"**다.
 *
 * 히어로 CTA만 진도를 본다 — 이미 배우던 사람에게 소개를 먼저 읽히지 않는다.
 */

/** 유닛 하나의 흐름 — 설계/01 §3 · 09 §2-1의 스텝 순서 그대로다 */
const UNIT_FLOW = ["문법", "회화", "한자", "어휘", "확인 문제", "정리"];

const STRENGTHS = [
  {
    title: "순서를 대신 정해 드려요",
    body: "입문(문자)부터 JLPT N1까지 한 줄로 이어진 하나의 길입니다. 무엇을 먼저 볼지 고르지 않아도 돼요 — “다음 유닛”만 누르면 됩니다.",
  },
  {
    title: "유닛 하나에 필요한 게 다 있어요",
    body: "문법만 따로, 한자만 따로 공부하지 않습니다. 배운 문법이 실제로 쓰인 회화가 같은 유닛에 있고, 한자와 어휘도 그 자리에서 함께 나옵니다.",
  },
  {
    title: "로그인 없이 바로 시작해요",
    body: "가입하지 않아도 전부 볼 수 있고, 어디까지 봤는지도 이 브라우저에 저장됩니다. 나중에 로그인하면 그 기록을 계정으로 합칠 수 있어요.",
  },
];

/** 히어로 문구·버튼 — 진도가 있으면 이어보기, 없으면 소개 문구 (설계/05 §8) */
function heroState(resume, coursesLoaded) {
  if (resume) return { line: resume.text, ctaLabel: resume.ctaLabel, ctaTo: resume.to };
  // 마지막 위치는 있는데 코스를 아직 못 찾았다 = 목록이 안 왔다는 뜻이다.
  // 이때 "학습 시작하기"를 그리면 이어보기가 있는 사람을 코스 목록으로 보낸다 — 버튼을 잠시 비운다.
  if (!coursesLoaded) return null;
  return {
    line: "입문부터 JLPT N1까지 — 정해진 한 길을 따라 ‘다음 유닛’만 누르면 됩니다",
    ctaLabel: "학습 시작하기",
    ctaTo: "/courses",
  };
}

export function HomePage() {
  const { data: courses, error, reload } = useApiQuery("/api/courses");
  // 마지막 위치가 영어 코스일 수 있다 — 두 과정 목록에서 찾는다(영어 진도를 일본어 주소에 끼우면 404다)
  const { data: enCourses } = useApiQuery("/api/en/courses");
  const { progress, ready } = useUserData();
  const notice = useRouteNotice(); // 탈퇴 완료 등 일회성 안내 (설계/05 §8)

  // 자랑에 쓰는 수치는 **살아 있는 값**이다 — 문서에서 베껴 적으면 코스가 열릴 때마다 낡는다(08 C-18).
  // 목록 API의 totalAll만 필요하므로 한 건만 받아 온다.
  const { data: kanjiPage } = useApiQuery("/api/library/kanji?size=1");
  const { data: grammarPage } = useApiQuery("/api/library/grammar?size=1");
  const { data: vocabPage } = useApiQuery("/api/library/vocabulary?size=1");

  const list = courses ?? [];
  const open = list.filter((course) => course.status === "AVAILABLE");
  const unitTotal = open.reduce((sum, course) => sum + (course.unitCount ?? 0), 0);
  const hero = ready ? heroState(resumeTarget(progress, { ja: list, en: enCourses ?? [] }), courses != null) : null;

  // 아직 안 온 수치는 **그리지 않는다** — 0으로 채우지 않는다(08 C-12 ③)
  const figures = [
    open.length > 0 ? { label: "코스", value: `${open.length}개` } : null,
    unitTotal > 0 ? { label: "유닛", value: `${unitTotal}개`, point: true } : null,
    kanjiPage?.totalAll > 0 ? { label: "한자", value: `${kanjiPage.totalAll.toLocaleString()}자` } : null,
    grammarPage?.totalAll > 0 ? { label: "문법", value: `${grammarPage.totalAll}개` } : null,
    vocabPage?.totalAll > 0 ? { label: "어휘", value: `${vocabPage.totalAll.toLocaleString()}개` } : null,
  ].filter(Boolean);

  return (
    <>
      {notice && (
        <Alert role="status" tone="ok">
          {notice}
        </Alert>
      )}
      <MergeBanner />

      <section className="k-hero">
        <h1>일본어, 어떤 순서로 배울지 고민하지 마세요</h1>
        {hero && <p className={hero.ctaLabel === "학습 시작하기" ? undefined : "hero-resume"}>{hero.line}</p>}
        {/* 진도 도착 전에는 버튼 자리를 비워 둔다 — 잘못된 목적지를 잠깐이라도 보여주지 않는다 */}
        {hero && (
          <Link className={btnClass({ variant: "primary", size: "lg", className: "hero-cta" })} to={hero.ctaTo}>
            {hero.ctaLabel}
          </Link>
        )}
      </section>

      {/* 진단 배너 (화면정의서 판정 B) — 히어로 바로 아래, 항상 노출 */}
      <Alert className="row-alert">
        <span>어디서 시작할지 모르겠나요? 3분이면 알 수 있어요</span>
        <span className="k-flex notice-actions">
          <Link className={btnClass({ variant: "secondary", size: "sm" })} to="/diagnosis">
            내 시작점 찾기
          </Link>
        </span>
      </Alert>

      <section className="k-section">
        <h2>이 사이트는</h2>
        <div className="home-strengths">
          {STRENGTHS.map((item) => (
            <Card key={item.title}>
              <h3 className="home-strength-title">{item.title}</h3>
              <p className="home-strength-body">{item.body}</p>
            </Card>
          ))}
        </div>
      </section>

      {/* 콘텐츠가 얼마나 있는지 — 살아 있는 수치라 코스가 열리면 저절로 늘어난다 */}
      {figures.length > 0 && (
        <section className="k-section">
          <h2>지금 배울 수 있는 것</h2>
          <Stats>
            {figures.map((figure) => (
              <Stat key={figure.label} label={figure.label} point={figure.point} value={figure.value} />
            ))}
          </Stats>
        </section>
      )}

      <section className="k-section">
        <h2>유닛 하나는 이렇게 흘러갑니다</h2>
        <ol className="home-flow">
          {UNIT_FLOW.map((step, i) => (
            <li key={step} className="home-flow-step">
              <span aria-hidden="true" className="home-flow-no">
                {i + 1}
              </span>
              <span className="home-flow-label">{step}</span>
            </li>
          ))}
        </ol>
        <p className="home-flow-note">
          문법을 배우면 그 문법이 쓰인 회화가 바로 나오고, 마지막에 확인 문제로 짚고 넘어갑니다.
          입문 코스에는 한자가 없어 다섯 단계로 진행돼요.
        </p>
      </section>

      <section className="k-section">
        <h2>자료실은 사전처럼</h2>
        <p className="home-lead">
          코스에서 배운 한자·문법·어휘를 목록과 검색으로 다시 찾아볼 수 있어요.
          따로 만든 콘텐츠가 아니라 <b>같은 내용을 다른 방식으로</b> 보는 자리라, 배운 것과 어긋나지 않습니다.
        </p>
        <div className="k-flex home-actions">
          <Link className={btnClass({ variant: "secondary" })} to="/library/kanji">
            자료실 둘러보기
          </Link>
          <Link className={btnClass({ variant: "ghost" })} to="/en/courses">
            영어 과정도 있어요
          </Link>
        </div>
      </section>

      {error && <ApiErrorCard title="코스 정보를 불러오지 못했어요" onRetry={reload} />}

      <section className="k-section home-closing">
        <h2>시작하기</h2>
        <p className="home-lead">지금 고를 것은 하나뿐입니다 — 어느 코스부터 볼지.</p>
        <Link className={btnClass({ variant: "primary", size: "lg" })} to="/courses">
          코스 보러 가기
        </Link>
      </section>
    </>
  );
}
