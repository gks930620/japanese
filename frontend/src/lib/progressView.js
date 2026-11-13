// 진도 표시 계산 — 순수 함수만 (네트워크·저장소 접근 없음). 작업자(AI)_문서/05 §8.
//
// 홈·코스 목록·코스 상세가 같은 판정을 하므로 계산을 한 곳에 모은다.
// 서버에 두지 않는 이유: 비로그인도 localStorage 문서로 **같은 계산**을 하기 때문이다(두 벌이 되면 갈린다).
//
// 배지는 **코드만** 돌려준다 — 문구는 designer 결정 사항이라 이 모듈이 문자열을 갖지 않는다(결정기록 C-8).

/** 완료 여부 */
export function isUnitCompleted(completedUnits, courseId, unitNo) {
  return (completedUnits ?? []).some((unit) => unit.courseId === courseId && unit.unitNo === unitNo);
}

/** 그 코스의 완료 유닛 수 */
export function completedCount(completedUnits, courseId) {
  return (completedUnits ?? []).filter((unit) => unit.courseId === courseId).length;
}

/** 진도 막대 비율 0~1 — 콘텐츠가 줄어 완료 수가 총 유닛보다 커도 1에서 멈춘다(작업자(AI)_문서/05 §8) */
export function progressRatio(completed, total) {
  if (!total || total <= 0) return 0;
  return Math.min(1, completed / total);
}

/**
 * 다음에 볼 유닛 = **완료하지 않은 가장 앞선 유닛** (AC-P-15·16).
 * 중간을 건너뛰고 완료했어도 앞선 미완료를 먼저 가리킨다. 전부 완료면 null(= 완주, AC-P-17).
 */
export function nextUnitNo(completedUnits, courseId, unitCount) {
  for (let unitNo = 1; unitNo <= (unitCount ?? 0); unitNo += 1) {
    if (!isUnitCompleted(completedUnits, courseId, unitNo)) return unitNo;
  }
  return null;
}

/**
 * 아직 채우는 중인 코스인가 — **"다음이 없다"는 "끝냈다"가 아니다**(작업자(AI)_문서/04 §2-3-A·§2-3-B · 08 C-29·C-33).
 *
 * 인자를 코스 객체가 아니라 **숫자 둘**로 받는다: 유닛 응답은 (`totalUnits`, `coursePlannedUnits`),
 * 코스 응답은 (`unitCount`, `plannedUnitCount`)로 **이름이 다르기 때문**이다(주어가 다르다 — §2-3-B).
 * 두 이름은 **이 함수의 인자 자리에서만** 만난다. 이름이 둘인 것은 괜찮고, 판정식이 둘인 것은 안 된다.
 *
 * 계획값이 없으면(null·undefined) 지금 있는 유닛이 전부다 → 거짓(일본어는 한 줄도 바뀌지 않는다).
 */
export function moreUnitsComing(openUnits, plannedUnits) {
  return plannedUnits != null && openUnits < plannedUnits;
}

/**
 * 진도 막대의 분모 (작업자(AI)_문서/04 §6-1) — 계획 수가 있으면 계획 수다.
 * 열린 수를 분모로 쓰면 부분 공개 코스가 **5/5 = 100%** 가 되어 막대가 "완주"를 대신 말한다.
 */
export function courseUnitTotal(course) {
  return course?.plannedUnitCount ?? course?.unitCount ?? 0;
}

/**
 * 그 **목록 안에** 진도가 있는가 (작업자(AI)_문서/04 §6-1 "진도 배너 판정은 과정별이다").
 *
 * 진도 문서는 사이트 전체에 하나지만(01 §10-4), 한 과정만 보여주는 화면의 배너는 **그 화면이 들고 있는
 * 코스 목록 안에서만** 판정해야 한다 — 그러지 않으면 영어만 공부한 사람이 일본어 목록에서 "진도 있음" 띠를 본다.
 * 배지 계산(`courseBadges`)이 이미 목록 안에서만 판정하므로, 띠도 **같은 재료**를 봐야 둘이 갈리지 않는다.
 */
export function hasProgressIn(progress, courses) {
  const ids = (courses ?? []).map((course) => course.id);
  if (ids.length === 0) return false;
  const completedUnits = progress?.completedUnits ?? [];
  if (completedUnits.some((unit) => ids.includes(unit.courseId))) return true;
  const lastPosition = progress?.lastPosition ?? null;
  return lastPosition != null && ids.includes(lastPosition.courseId);
}

/** 저장된 스텝 키의 현재 위치. 없는 키(콘텐츠 개편으로 사라진 스텝)면 첫 스텝으로 되돌린다(작업자(AI)_문서/04 §6-2). */
export function resolveStepIndex(stepKeys, stepKey) {
  const index = (stepKeys ?? []).indexOf(stepKey);
  return index >= 0 ? index : 0;
}

function minByCourseNo(best, course) {
  return best == null || course.courseNo < best.courseNo ? course : best;
}

/**
 * 코스 카드 배지 판정 (작업자(AI)_문서/05 §8 판정 순서).
 * 반환은 `{ [courseId]: "CONTINUE"|"START"|"NEXT"|"DONE"|"OPEN"|"PREPARING" }`.
 * **강조(CONTINUE·START·NEXT)는 어느 상태에서도 최대 한 장**이다 (AC-P-20).
 */
export function courseBadges(courses, progress) {
  const list = courses ?? [];
  const completedUnits = progress?.completedUnits ?? [];
  const lastPosition = progress?.lastPosition ?? null;

  const isAvailable = (course) => course.status === "AVAILABLE";
  // 완주 판정의 분모도 **계획 수**다(§2-3-B) — 열린 수로 세면 부분 공개 코스가 DONE이 되고,
  // 그 뒤 코스가 NEXT로 넘어가 "앞 코스는 끝났다"는 말이 배지로 한 번 더 선다.
  const isDone = (course) => {
    const total = courseUnitTotal(course);
    return total > 0 && completedCount(completedUnits, course.id) >= total;
  };

  // ① 기준 코스(anchor) — 마지막 위치가 가리키는 AVAILABLE 코스
  let anchor = null;
  if (lastPosition) {
    const found = list.find((course) => course.id === lastPosition.courseId);
    if (found && isAvailable(found)) anchor = found;
  }
  // 마지막 위치가 없거나 무효(사라진·준비중 코스)면 진도가 있는 AVAILABLE 코스로 대체한다
  // — 진도는 있는데 강조 카드가 한 장도 없는 화면을 만들지 않기 위해서다.
  if (!anchor) {
    anchor = list
      .filter((course) => isAvailable(course) && completedCount(completedUnits, course.id) > 0)
      .reduce(minByCourseNo, null);
  }

  // ⑤⑥ 기본값 — AVAILABLE은 완주면 DONE, 아니면 OPEN / PREPARING은 그대로
  const badges = {};
  list.forEach((course) => {
    badges[course.id] = isAvailable(course) ? (isDone(course) ? "DONE" : "OPEN") : "PREPARING";
  });

  // ② 기준이 없으면 = 진도 자체가 없으면 → 시작점 코스 하나만 START
  if (!anchor) {
    const start = list.filter(isAvailable).reduce(minByCourseNo, null);
    if (start) badges[start.id] = "START";
    return badges;
  }

  // ③ 기준 코스가 미완주면 그 코스가 CONTINUE
  if (!isDone(anchor)) {
    badges[anchor.id] = "CONTINUE";
    return badges;
  }

  // ④ 기준 코스를 완주했으면 그 뒤의 미완주 AVAILABLE 코스가 NEXT (없으면 강조 없음)
  const next = list
    .filter((course) => isAvailable(course) && course.courseNo > anchor.courseNo && !isDone(course))
    .reduce(minByCourseNo, null);
  if (next) badges[next.id] = "NEXT";
  return badges;
}
