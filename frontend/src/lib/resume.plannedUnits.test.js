// TDD Red — senior-dev 작성 (2026-11-14, qa 결함 1)
//
// ── 무엇이 문제였나 ──────────────────────────────────────────────────
// 홈·마이페이지가 **"일상 말하기 코스를 완주했어요"** 라고 말한다. E2는 계획 20유닛 중 일부만 열린 코스다.
// `resumeTarget()`의 ③ 분기가 "보던 유닛 뒤에 미완료가 없다"를 **완주**로 읽기 때문인데,
// 부분 공개 코스에서는 **열린 데까지 다 본 것**일 뿐이다 — 유닛 학습 화면은 이미 이 둘을 가르고 있었고
// (`UnitStudyPage.partialCourse.test.jsx`), 같은 사실을 홈이 반대로 말했다.
//
// ── 계약 (senior-dev, 작업자(AI)_문서/04 §2-3-B) ─────────────────────
// 코스 목록 응답에 `plannedUnitCount`가 실리므로 이 함수도 판정할 수 있다.
//   moreUnitsComing(course.unitCount, course.plannedUnitCount) 이면 ③은 **COURSE_DONE이 아니다.**
//   kind "OPEN_END" — 열린 데까지의 끝. 목적지는 **그 코스 자신**(= 유닛 목록인 코스 상세)이다.
//     다음 코스로 내보내면 "이 코스는 끝났다"고 말하는 것과 같다(05 "끝은 두 종류다" 표와 같은 판단).
//
// **문구는 이 테스트가 정하지 않는다.** 고정하는 것은 ① 완주를 주장하지 않는다(금지) ② 어디로 보내는가(구조)다.
// (2026-11-13 배너 건 이후 이 저장소의 방식 — 문구 전문을 박으면 designer가 문구를 다듬을 때마다 계약이 깨진다.)
//
// 이 테스트를 수정하지 말 것 — 계약 변경은 senior-dev 경유 (CLAUDE.md TDD 규칙 2).
import { describe, expect, it } from "vitest";
import { coursesFixture, enCoursesFixture } from "../test/apiFixtures.js";
import { resumeTarget } from "./resume.js";

const PARTLY_PUBLISHED_ID = 102;

/** 영어 목록 — E2를 "열린 5 / 계획 20"인 부분 공개 코스로 세운다(2026-11-14 실제 상태) */
function enList() {
  return enCoursesFixture().map((course) =>
    course.id === PARTLY_PUBLISHED_ID
      ? { ...course, status: "AVAILABLE", unitCount: 5, plannedUnitCount: 20 }
      : { ...course, plannedUnitCount: null },
  );
}

const LISTS = { ja: coursesFixture(), en: enList() };
const done = (courseId, from, to) => {
  const list = [];
  for (let unitNo = from; unitNo <= to; unitNo += 1) list.push({ courseId, unitNo });
  return list;
};

describe("resumeTarget — 부분 공개 코스를 완주라고 말하지 않는다 (qa 결함 1)", () => {
  const allOpenUnitsDone = {
    completedUnits: done(PARTLY_PUBLISHED_ID, 1, 5),
    lastPosition: { courseId: PARTLY_PUBLISHED_ID, unitNo: 5, stepKey: "summary" },
  };

  it("열린 유닛을 다 봐도 COURSE_DONE이 아니다 — 계획이 남아 있다", () => {
    const target = resumeTarget(allOpenUnitsDone, LISTS);

    expect(target).not.toBeNull();
    expect(target.kind).not.toBe("COURSE_DONE");
    expect(target.kind).toBe("OPEN_END");
  });

  it("문구가 완주를 주장하지 않는다 — 문구 자체는 designer의 것이고, 금지만 고정한다", () => {
    const target = resumeTarget(allOpenUnitsDone, LISTS);

    expect(target.text).not.toMatch(/완주/);
    expect(target.text).not.toMatch(/끝까지/);
    expect(target.ctaLabel).not.toMatch(/완주/);
  });

  it("다음 코스로 내보내지 않는다 — 참인 행선지는 그 코스 자신(유닛 목록)이다", () => {
    const target = resumeTarget(allOpenUnitsDone, LISTS);

    expect(target.to).toBe(`/en/courses/${PARTLY_PUBLISHED_ID}`);
    expect(target.course.id).toBe(PARTLY_PUBLISHED_ID);
    expect(target.lang).toBe("en");
  });

  it("아직 안 본 열린 유닛이 있으면 지금 그대로 — 그 유닛으로 보낸다", () => {
    const target = resumeTarget(
      {
        completedUnits: done(PARTLY_PUBLISHED_ID, 1, 3),
        lastPosition: { courseId: PARTLY_PUBLISHED_ID, unitNo: 3, stepKey: "summary" },
      },
      LISTS,
    );

    expect(target.kind).toBe("NEXT_UNIT");
    expect(target.to).toBe(`/en/courses/${PARTLY_PUBLISHED_ID}/units/4`);
  });

  it("계획을 채운 코스는 지금 그대로 완주다 — 계획 수를 채우면 저절로 넘어간다", () => {
    const list = enList().map((course) =>
      course.id === PARTLY_PUBLISHED_ID ? { ...course, unitCount: 20, plannedUnitCount: 20 } : course,
    );
    const target = resumeTarget(
      {
        completedUnits: done(PARTLY_PUBLISHED_ID, 1, 20),
        lastPosition: { courseId: PARTLY_PUBLISHED_ID, unitNo: 20, stepKey: "summary" },
      },
      { ja: coursesFixture(), en: list },
    );

    expect(target.kind).toBe("COURSE_DONE");
  });

  it("계획이 없는 코스(일본어)는 한 줄도 바뀌지 않는다 — 회귀 방어선", () => {
    // 입문(id 1 · 10유닛) 전부 완료 → 지금처럼 COURSE_DONE + 다음 코스(왕초보 상세)
    const target = resumeTarget(
      { completedUnits: done(1, 1, 10), lastPosition: { courseId: 1, unitNo: 10, stepKey: "summary" } },
      LISTS,
    );

    expect(target.kind).toBe("COURSE_DONE");
    expect(target.to).toBe("/courses/2");
  });
});
