// 진도 표시 계산 — 순수 함수만 (네트워크·저장소 접근 없음). 설계/05 §8.
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

/** 진도 막대 비율 0~1 — 콘텐츠가 줄어 완료 수가 총 유닛보다 커도 1에서 멈춘다(설계/05 §8) */
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

/** 저장된 스텝 키의 현재 위치. 없는 키(콘텐츠 개편으로 사라진 스텝)면 첫 스텝으로 되돌린다(설계/04 §6-2). */
export function resolveStepIndex(stepKeys, stepKey) {
  const index = (stepKeys ?? []).indexOf(stepKey);
  return index >= 0 ? index : 0;
}

function minByCourseNo(best, course) {
  return best == null || course.courseNo < best.courseNo ? course : best;
}

/**
 * 코스 카드 배지 판정 (설계/05 §8 판정 순서).
 * 반환은 `{ [courseId]: "CONTINUE"|"START"|"NEXT"|"DONE"|"OPEN"|"PREPARING" }`.
 * **강조(CONTINUE·START·NEXT)는 어느 상태에서도 최대 한 장**이다 (AC-P-20).
 */
export function courseBadges(courses, progress) {
  const list = courses ?? [];
  const completedUnits = progress?.completedUnits ?? [];
  const lastPosition = progress?.lastPosition ?? null;

  const isAvailable = (course) => course.status === "AVAILABLE";
  const isDone = (course) => course.unitCount > 0 && completedCount(completedUnits, course.id) >= course.unitCount;

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
