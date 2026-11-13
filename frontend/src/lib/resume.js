import { isUnitCompleted, moreUnitsComing } from "./progressView.js";

// 마지막 위치 → "이어서 학습하기" 대상 (2026-09 결정 D-2 · 작업자(AI)_문서/01 §7-8).
//
// **"이어서"는 마지막 위치(보던 곳)만 가리킨다.** 아직 안 마친 가장 앞선 유닛은 "다음 유닛"이라 부르고,
// 그건 코스 상세의 몫이다 — 같은 말로 다른 곳에 보내지 않는다.
// 단 하나의 예외: 보던 유닛을 **이미 마쳤으면** 마친 유닛 안으로 되돌려 보내지 않고
// **그 뒤 첫 미완료 유닛**으로 보낸다(그때는 문장이 목적지를 명시한다).
//
// 마지막 위치는 사이트 전체에 하나인데 코스 id는 두 과정에 걸쳐 있다 —
// 어느 과정의 코스인지는 **코스 목록에서 찾아** 정한다(id 규칙을 화면이 추측하지 않는다).

/** 그 코스에서 `from`보다 뒤에 있는 첫 미완료 유닛 (없으면 null) */
function firstIncompleteAfter(completedUnits, courseId, unitCount, from) {
  for (let unitNo = from + 1; unitNo <= (unitCount ?? 0); unitNo += 1) {
    if (!isUnitCompleted(completedUnits, courseId, unitNo)) return unitNo;
  }
  return null;
}

/** 같은 과정에서 courseNo가 그다음인 AVAILABLE 코스 (없으면 null) */
function nextAvailableCourse(list, course) {
  return (
    list
      .filter((item) => item.status === "AVAILABLE" && item.courseNo > course.courseNo)
      .sort((a, b) => a.courseNo - b.courseNo)[0] ?? null
  );
}

/**
 * @param {{completedUnits: {courseId:number,unitNo:number}[], lastPosition: {courseId:number, unitNo:number}|null}} progress
 * @param {{ja: object[], en: object[]}} lists 두 과정의 코스 목록
 * @returns {{kind:"RESUME"|"NEXT_UNIT"|"OPEN_END"|"COURSE_DONE", course:object, lang:"ja"|"en",
 *            unitNo:number|null, to:string, text:string, ctaLabel:string}|null}
 *          못 찾으면 null — 사라졌거나 준비중인 코스면 버튼도 문구도 만들지 않는다(작업자(AI)_문서/05 §8, 홈과 같은 규칙)
 */
export function resumeTarget(progress, { ja = [], en = [] } = {}) {
  const { completedUnits = [], lastPosition = null } = progress ?? {};
  if (!lastPosition) return null;

  const inJa = ja.find((course) => course.id === lastPosition.courseId);
  const inEn = inJa ? null : en.find((course) => course.id === lastPosition.courseId);
  const course = inJa ?? inEn ?? null;
  if (!course || course.status !== "AVAILABLE") return null;

  const english = Boolean(inEn);
  const list = english ? en : ja;
  const base = english ? "/en/courses" : "/courses";
  // 영어는 레벨 괄호를 쓰지 않는다 — 코스명이 곧 단계 이름이다(작업자(AI)_문서/05 §16-2)
  const label = english ? course.title : `${course.title}(${course.levelLabel})`;

  // ① 보던 유닛이 미완료면 그대로 그 유닛으로 — 유닛 화면이 보던 스텝을 복원한다
  if (!isUnitCompleted(completedUnits, course.id, lastPosition.unitNo)) {
    return {
      kind: "RESUME",
      course,
      lang: english ? "en" : "ja",
      unitNo: lastPosition.unitNo,
      to: `${base}/${course.id}/units/${lastPosition.unitNo}`,
      text: `${label} 코스 · 유닛 ${lastPosition.unitNo} 학습 중이었어요`,
      ctaLabel: "이어서 학습하기",
    };
  }

  // ② 보던 유닛을 마쳤으면 **그 뒤** 첫 미완료 유닛으로 — 마친 유닛 안으로 되돌리지 않는다.
  //    앞에 건너뛴 유닛이 있어도 "그 뒤"만 본다(앞으로 되돌리는 것도 되돌리는 것이다).
  const nextInCourse = firstIncompleteAfter(completedUnits, course.id, course.unitCount, lastPosition.unitNo);
  if (nextInCourse != null) {
    return {
      kind: "NEXT_UNIT",
      course,
      lang: english ? "en" : "ja",
      unitNo: nextInCourse,
      to: `${base}/${course.id}/units/${nextInCourse}`,
      text: `${label} 코스 · 유닛 ${lastPosition.unitNo} 완료 · 다음은 유닛 ${nextInCourse}`,
      ctaLabel: "이어서 학습하기",
    };
  }

  // ③ 보던 유닛 뒤를 다 마쳤다 — 여기서 끝은 **두 종류**다(작업자(AI)_문서/04 §2-3-B · 08 C-33).
  //    아직 채우는 중인 코스라면 "열린 데까지의 끝"이지 완주가 아니다. 다음 코스로 내보내면
  //    "이 코스는 끝났다"고 말하는 것과 같으므로, 참인 행선지는 **그 코스 자신**(유닛 목록)이다.
  //    ⚠️ 문구는 임시다 — planner·designer 확정 대기(고정 테스트는 "완주를 주장하지 않는다"만 본다).
  if (moreUnitsComing(course.unitCount, course.plannedUnitCount)) {
    return {
      kind: "OPEN_END",
      course,
      lang: english ? "en" : "ja",
      unitNo: null,
      to: `${base}/${course.id}`,
      text: `${label} 코스 · 지금 열려 있는 유닛은 여기까지예요`,
      ctaLabel: "유닛 목록으로",
    };
  }

  //    계획을 채운 코스는 지금 그대로 다음 AVAILABLE 코스 상세로 — 버튼에 "이어서"가 없다.
  //    이 코스 안의 앞쪽 미완료 유닛으로 끌고 가지 않는다(복습은 사용자가 고른다).
  const next = nextAvailableCourse(list, course);
  return {
    kind: "COURSE_DONE",
    course,
    lang: english ? "en" : "ja",
    unitNo: null,
    to: next ? `${base}/${next.id}` : base,
    text: `${label} 코스를 완주했어요`,
    ctaLabel: next
      ? `다음 코스: ${english ? next.title : `${next.title}(${next.levelLabel})`} 시작하기`
      : "코스 목록으로",
  };
}
