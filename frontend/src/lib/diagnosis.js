// 실력 진단 규칙 (설계/05 §15-2 — 스택 공용).
// 계단식: 낮은 레벨부터 단계당 3문항(어휘1·한자1·문법1), 3중 2 통과 → 다음 단계, 미달 → 즉시 종료.
// 코스명·레벨을 하드코딩하지 않는다 — 계단은 GET /api/courses의 AVAILABLE 코스에서 계산한다(08 C-6).
import { buildLibraryQuizSet } from "./quiz.js";

const PASS_THRESHOLD = 2; // 3중 2

/**
 * 진단 계단이 될 수 있는 레벨 코드 = **한자 자료실의 레벨 선택지**(설계/04 §3-1 표).
 * 단계 문항은 어휘·한자·문법 1개씩이라(P3) 한자가 0건인 레벨로는 단계를 만들 수 없다 —
 * 그래서 입문(INTRO)은 계단에서 빠진다 — **측정 단계에서만 빠지는 것이고 추천 후보에서는 빠지지 않는다**
 * (2026-08-25 판정, 감사 높음 1). 추천은 recommendCandidates()가 따로 고른다.
 *
 * 학습 순서 = 이 배열 순서. courseNo에서 레벨을 파생하지 않는다 —
 * 언어가 둘이 되면 파생 규칙이 언어에 종속되기 때문이다(설계/03 §1, 08 C-9).
 */
export const STAGE_LEVEL_CODES = ["N5", "N4", "N3", "N2", "N1"];

/** 코스의 자료실 레벨 코드 — 서버가 준 값 그대로. 계단에 못 쓰는 코드면 null */
export function libraryLevelOfCourse(course) {
  const code = course?.levelCode ?? null;
  return STAGE_LEVEL_CODES.includes(code) ? code : null;
}

/**
 * 진단 계단 — 입장 가능한(AVAILABLE) 코스를 학습 순서(레벨 코드 순)로.
 * 자료실 레벨 코드가 없는 코스는 문항을 만들 수 없으므로 계단에 넣지 않는다.
 * 공개 코스가 하나도 없으면 빈 배열(진단 배너 미노출의 근거 — 설계/05 §15-2).
 */
export function stagePlan(courses) {
  return (courses ?? [])
    .filter((course) => course.status === "AVAILABLE" && libraryLevelOfCourse(course) != null)
    .sort(
      (a, b) =>
        STAGE_LEVEL_CODES.indexOf(libraryLevelOfCourse(a)) -
        STAGE_LEVEL_CODES.indexOf(libraryLevelOfCourse(b)),
    )
    .map((course) => ({
      courseId: course.id,
      levelLabel: course.levelLabel, // 표시 문구 — 결과 화면의 근거 표가 쓴다
      levelCode: libraryLevelOfCourse(course), // 자료실 조회용 코드
      title: course.title,
    }));
}

/**
 * 단계 문항 3개 = 어휘 1 · 한자 1 · 문법 1 (P3).
 * 문항 생성 규칙은 퀴즈(설계/05 §15-1)와 완전히 같다 — 같은 함수를 재사용해 규칙이 갈리지 않게 한다.
 */
export function buildStageQuestions({ vocabItems, kanjiItems, grammarItems, rng }) {
  const one = (type, items) => buildLibraryQuizSet({ type, items, count: 1, rng }).questions;
  return [
    ...one("vocabulary", vocabItems),
    ...one("kanji", kanjiItems),
    ...one("grammar", grammarItems),
  ];
}

/** 3문항 중 2문항 이상이면 통과 (P4) */
export function isStagePassed(correct) {
  return correct >= PASS_THRESHOLD;
}

/**
 * 추천 후보 — **입장 가능한 코스 전체**를 학습 순서(courseNo)로. 계단과 다른 목록이다(감사 높음 1).
 *
 * 계단은 "측정할 수 있는 레벨"만 쓴다(한자 1문항이 필요해 입문은 빠진다). 하지만 1단계에서 떨어진 사람에게
 * 다시 1단계 코스를 권하면 히라가나를 모르는 사람이 입문을 건너뛴다 — **측정과 안내는 다른 목록**이다.
 * 준비중은 애초에 후보가 아니라(P10), 입문이 준비중이면 자동으로 그다음 코스가 첫 코스가 된다.
 */
export function recommendCandidates(courses) {
  return (courses ?? [])
    .filter((course) => course.status === "AVAILABLE")
    .sort((a, b) => a.courseNo - b.courseNo);
}

/**
 * 추천 판정 (설계/05 §15-2).
 *
 *   통과한 단계 없음               → 입장 가능한 **첫 코스**(계단 아래여도 된다 — 입문)
 *   레벨 L까지 통과, 다음 단계 있음 → 다음 단계 레벨의 코스
 *   전부 통과                     → 가장 높은 공개 코스 + allPassed
 *
 * 추천은 준비중 코스를 절대 가리키지 않는다(P10) — 후보가 AVAILABLE로만 만들어진다.
 * 전부 준비중이면 null(배너를 그리지 않는다).
 */
export function recommend({ courses, stageResults }) {
  const plan = stagePlan(courses);
  const candidates = recommendCandidates(courses);
  if (plan.length === 0 || candidates.length === 0) return null;

  // 계단은 실패에서 즉시 끝나므로 앞에서부터 연속 통과 수를 센다
  let passedCount = 0;
  for (const stage of stageResults ?? []) {
    if (!isStagePassed(stage.correct)) break;
    passedCount += 1;
  }

  const allPassed = passedCount >= plan.length;
  // 단계를 하나도 통과 못 했으면 계단 밖(더 아래)에서 고른다 — 그것이 입장 가능한 첫 코스다
  const courseOfStage = (index) => plan[index]?.courseId ?? null;
  const recommendedCourseId = allPassed
    ? candidates[candidates.length - 1].id
    : passedCount === 0
      ? candidates[0].id
      : courseOfStage(passedCount);
  const stepDownCourseId = allPassed
    ? courseOfStage(plan.length - 2)
    : passedCount === 0
      ? null // 첫 코스 아래로는 더 내려갈 곳이 없다
      : courseOfStage(passedCount - 1);

  return {
    recommendedCourseId,
    stepDownCourseId,
    allPassed,
    stages: stageResults ?? [],
  };
}
