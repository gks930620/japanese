// TDD Red — senior-dev 작성 (2026-09-03 결정 `진행사항/결정_2026-09_이어서_확인문제.md` §1 · AC-R-2·3·4 · 01 §7)
//
// "이어서 학습하기"의 목적지 계산은 **이 함수 한 곳**이다(홈·마이페이지가 같은 함수를 쓴다 — AC-R-1은 ResumeConsistency.test).
// 입력이 마지막 위치만이 아니라 **진도 전체**가 된다 — ②③ 판정에 완료 목록이 필요하기 때문이다.
//
//   resumeTarget(progress, { ja, en }) → null | { kind, course, lang, unitNo, to, text, ctaLabel }
//     kind "RESUME"      ① 보던 유닛이 미완료 → 그 유닛. ctaLabel [이어서 학습하기]
//     kind "NEXT_UNIT"   ② 보던 유닛을 마쳤고 그 뒤에 미완료 유닛이 있다 → 그 중 가장 앞선 유닛. ctaLabel [이어서 학습하기]
//     kind "COURSE_DONE" ③ 보던 유닛을 마쳤고 그 뒤 미완료가 없다 → 다음 AVAILABLE 코스 상세(없으면 코스 목록). ctaLabel에 "이어서" 없음
//   문구(text)는 designer가 다듬어도 되므로 **뜻만** 본다(유닛 번호·목적지 명시·"완주").
//
// 이 테스트를 수정하지 말 것 — 계약 변경은 senior-dev 경유 (CLAUDE.md TDD 규칙 2).
import { describe, expect, it } from "vitest";
import { coursesFixture, enCoursesFixture } from "../test/apiFixtures.js";
import { resumeTarget } from "./resume.js";

const LISTS = { ja: coursesFixture(), en: enCoursesFixture() };
const done = (courseId, ...unitNos) => unitNos.map((unitNo) => ({ courseId, unitNo }));

describe("resumeTarget — 마지막 위치 → 이어서 목적지", () => {
  it("마지막 위치가 없으면 null", () => {
    expect(resumeTarget({ completedUnits: [], lastPosition: null }, LISTS)).toBeNull();
  });

  it("① 보던 유닛이 미완료면 그 유닛으로 — 문구는 '학습 중'을 말한다 (AC-R-2)", () => {
    const progress = { completedUnits: done(2, 1, 2), lastPosition: { courseId: 2, unitNo: 3, stepKey: "kanji" } };
    const target = resumeTarget(progress, LISTS);

    expect(target.kind).toBe("RESUME");
    expect(target.to).toBe("/courses/2/units/3");
    expect(target.unitNo).toBe(3);
    expect(target.text).toMatch(/왕초보\(JLPT N5\)/);
    expect(target.text).toMatch(/유닛 3/);
    expect(target.ctaLabel).toBe("이어서 학습하기");
  });

  it("② 보던 유닛을 마쳤으면 그 뒤 첫 미완료 유닛으로 — 문구가 목적지를 명시한다 (AC-R-3)", () => {
    // 1·2·3 완료, 2를 다시 보고 나옴 → 4
    const progress = { completedUnits: done(2, 1, 2, 3), lastPosition: { courseId: 2, unitNo: 2, stepKey: "summary" } };
    const target = resumeTarget(progress, LISTS);

    expect(target.kind).toBe("NEXT_UNIT");
    expect(target.to).toBe("/courses/2/units/4");
    expect(target.unitNo).toBe(4);
    expect(target.text).toMatch(/유닛 2/);
    expect(target.text).toMatch(/다음은 유닛 4/);
    expect(target.ctaLabel).toBe("이어서 학습하기");
  });

  it("② 는 '그 뒤'만 본다 — 앞에 건너뛴 유닛이 있어도 뒤의 첫 미완료로 간다", () => {
    // 3·5 완료(1·2·4 건너뜀), 5를 다시 보고 나옴 → 6
    const progress = { completedUnits: done(2, 3, 5), lastPosition: { courseId: 2, unitNo: 5, stepKey: "summary" } };
    expect(resumeTarget(progress, LISTS).to).toBe("/courses/2/units/6");
  });

  it("③ 보던 유닛 뒤를 다 마쳤으면 다음 AVAILABLE 코스 상세로 — 버튼에 '이어서'가 없다 (AC-R-4)", () => {
    // 입문(10유닛) 전부 완료, 마지막 위치 유닛 10 → 왕초보(id 2) 상세
    const progress = { completedUnits: done(1, ...Array.from({ length: 10 }, (_, i) => i + 1)), lastPosition: { courseId: 1, unitNo: 10, stepKey: "summary" } };
    const target = resumeTarget(progress, LISTS);

    expect(target.kind).toBe("COURSE_DONE");
    expect(target.to).toBe("/courses/2");
    expect(target.unitNo).toBeNull();
    expect(target.text).toMatch(/완주/);
    expect(target.ctaLabel).toMatch(/다음 코스.*왕초보\(JLPT N5\).*시작하기/);
    expect(target.ctaLabel).not.toMatch(/이어서/);
  });

  it("③ 다음 코스가 없으면(마지막 코스) 코스 목록으로", () => {
    const progress = { completedUnits: done(6, ...Array.from({ length: 25 }, (_, i) => i + 1)), lastPosition: { courseId: 6, unitNo: 25, stepKey: "summary" } };
    const target = resumeTarget(progress, LISTS);

    expect(target.kind).toBe("COURSE_DONE");
    expect(target.to).toBe("/courses");
    expect(target.ctaLabel).not.toMatch(/이어서/);
  });

  it("③ 다음 코스가 준비중이면 건너뛰고 그다음 AVAILABLE 코스로, 전부 준비중이면 코스 목록으로", () => {
    const ja = coursesFixture().map((c) => (c.id === 2 ? { ...c, status: "PREPARING", unitCount: 0 } : c));
    const progress = { completedUnits: done(1, ...Array.from({ length: 10 }, (_, i) => i + 1)), lastPosition: { courseId: 1, unitNo: 10, stepKey: "summary" } };

    expect(resumeTarget(progress, { ja, en: [] }).to).toBe("/courses/3");
  });

  it("영어 과정은 같은 규칙, 주소만 /en — 코스명에 레벨 괄호가 없다", () => {
    const progress = { completedUnits: [], lastPosition: { courseId: 101, unitNo: 1, stepKey: "dialog" } };
    const target = resumeTarget(progress, LISTS);

    expect(target.lang).toBe("en");
    expect(target.to).toBe("/en/courses/101/units/1");
    expect(target.text).toMatch(/다시 세우기 코스/);
    expect(target.text).not.toMatch(/\(E1\)/);
  });

  it("영어 ②③도 영어 안에서 판정한다 — 맛보기 2유닛을 마치면 영어 다음 코스(준비중뿐)를 건너뛰고 영어 코스 목록으로", () => {
    const progress = { completedUnits: done(101, 1, 2), lastPosition: { courseId: 101, unitNo: 2, stepKey: "summary" } };
    const target = resumeTarget(progress, LISTS);

    expect(target.kind).toBe("COURSE_DONE");
    expect(target.to).toBe("/en/courses");
  });

  it("마지막 위치의 코스가 사라졌거나 준비중이면 null — 문장도 버튼도 만들지 않는다 (§1-4)", () => {
    expect(resumeTarget({ completedUnits: [], lastPosition: { courseId: 999, unitNo: 1, stepKey: "dialog" } }, LISTS)).toBeNull();
    expect(resumeTarget({ completedUnits: [], lastPosition: { courseId: 102, unitNo: 1, stepKey: "dialog" } }, LISTS)).toBeNull();
  });
});
