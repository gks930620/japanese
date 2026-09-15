import { describe, expect, it } from "vitest";
import { recommend, stagePlan } from "./diagnosis.js";
import { coursesFixture } from "../test/apiFixtures.js";

/**
 * 진단 추천 — **통과한 레벨 기준** (설계/09 §3-2 — TDD Red, senior-dev 2026-09-14 개편)
 *
 * 기획 D14 / 인수 조건 **A37·A38**.
 *
 * ★ 이 파일은 2026-09-14에 **전면 재작성**됐다. 예전 계산은 *"맨 아래부터 연속으로 몇 개 통과했나"*(`passedCount`)였고,
 * 계단이 **항상 맨 아래에서 시작한다**는 전제 위에서만 맞는 식이었다. 레벨을 고르게 하는 순간 그 전제가 사라져
 * **N2를 골라 통과한 사람에게 N5 코스를 추천**한다 — 화면은 멀쩡해 보이고 결과만 틀리므로 **여기서만 잡힌다**(A38).
 *
 * 새 규칙(판정에 쓰는 것은 *"어느 레벨을 통과했나"* 뿐이다 — 순서·횟수는 쓰지 않는다):
 *
 *   통과한 레벨이 있으면  → 그중 **가장 높은** 레벨의 **바로 위** 레벨 코스 (위가 없으면 allPassed + 가장 높은 공개 코스)
 *   통과한 레벨이 없으면  → 미달한 레벨 중 **가장 낮은** 것의 **바로 아래** 레벨 코스 (더 없으면 입장 가능한 첫 코스)
 *
 * **추천(안내)과 레벨 목록(측정)은 여전히 다른 목록이다**(09 §3-2) — 재료 부족으로 측정할 수 없는 레벨은 언제든 생긴다.
 * 이어가기 버튼(`nextLevelOffer`)은 **방금 친 한 판**에서 나오는 다른 계산이다 → `diagnosis.rounds.test.js`.
 *
 * 이 테스트를 수정하지 말 것 — 계약 변경은 senior-dev 경유.
 */

const COURSES = coursesFixture();
const INTRO = 1;
const N5 = 2;
const N4 = 3;
const N3 = 4;
const N2 = 5;
const N1 = 6;

/** 한 판의 기록 한 줄 — 레벨당 하나다(D13) */
const round = (levelCode, correct, total = 6) => ({ levelCode, levelLabel: levelCode, correct, total });

const recommendFor = (results, courses = COURSES) => recommend({ courses, results });

/** 기획 §12 D14의 검산 표를 그대로 옮긴 것이다 — 줄을 지우지 말 것 */
describe("검산 표 (D14 · A37)", () => {
  it("N2 통과 → N1 코스 — N2는 충분하니 그 위부터", () => {
    expect(recommendFor([round("N2", 4)]).recommendedCourseId).toBe(N1);
  });

  it("N2 미달 → N3 코스 — 미달한 가장 낮은 레벨의 한 칸 아래", () => {
    expect(recommendFor([round("N2", 2)]).recommendedCourseId).toBe(N3);
  });

  it("N2 미달 → N3 통과 → N2 코스 — N3는 충분하고 N2는 부족하다", () => {
    expect(recommendFor([round("N3", 5), round("N2", 2)]).recommendedCourseId).toBe(N2);
  });

  it("N2 통과 → N1 미달 → N1 코스 — N1이 부족하니 N1 코스", () => {
    expect(recommendFor([round("N2", 4), round("N1", 1)]).recommendedCourseId).toBe(N1);
  });

  it("입문 미달 → 입문 코스 — 더 내려갈 곳이 없다", () => {
    expect(recommendFor([round("INTRO", 3)]).recommendedCourseId).toBe(INTRO);
  });

  it("N1 통과 → 가장 높은 공개 코스 + allPassed — 한 판만 쳐도 성립한다", () => {
    const result = recommendFor([round("N1", 6)]);

    expect(result.recommendedCourseId).toBe(N1);
    expect(result.allPassed).toBe(true);
  });

  it("N4 통과 → N2 미달 → N3 통과 → N2 코스 — 가장 높은 통과는 N3, 그 위는 N2", () => {
    expect(recommendFor([round("N4", 6), round("N3", 4), round("N2", 1)]).recommendedCourseId).toBe(N2);
  });
});

describe("옛 계산이 남아 있지 않다 (A38 — 회귀 금지)", () => {
  /** ★ 이 개편의 유일한 "조용히 틀리는" 지점이다. 화면으로는 절대 발견되지 않는다 */
  it("중간 레벨만 골라 통과한 사람에게 맨 아래 코스를 추천하지 않는다", () => {
    const result = recommendFor([round("N2", 5)]);

    expect(result.recommendedCourseId).not.toBe(N5);
    expect(result.recommendedCourseId).not.toBe(INTRO);
    expect(result.allPassed).toBe(false);
  });

  it("통과 기록이 하나도 없으면 순서가 아니라 **가장 낮은 미달 레벨**이 기준이다", () => {
    // N1을 먼저 치고 N3을 나중에 쳤어도 기준은 더 낮은 N3이다 → 그 한 칸 아래 N4
    expect(recommendFor([round("N3", 1), round("N1", 0)]).recommendedCourseId).toBe(N4);
  });

  /** 모순 기록(같은 사람이 N2는 통과, N3은 미달) — **통과가 이긴다**. 추천은 "할 수 있는 것"에서 출발한다 */
  it("N2 통과 + N3 미달이면 통과 쪽을 따른다", () => {
    expect(recommendFor([round("N3", 2), round("N2", 4)]).recommendedCourseId).toBe(N1);
  });

  it("한 판도 치지 않았으면 입장 가능한 첫 코스다", () => {
    expect(recommendFor([]).recommendedCourseId).toBe(INTRO);
  });
});

describe("통과 판정은 그 판의 실제 문항 수를 쓴다 (A27 · E15)", () => {
  it("6문항 중 4는 통과, 3은 미달이다", () => {
    expect(recommendFor([round("INTRO", 4)]).recommendedCourseId).toBe(N5);
    expect(recommendFor([round("INTRO", 3)]).recommendedCourseId).toBe(INTRO);
  });

  it("5문항 중 4는 통과, 3은 미달이다 — 상수로 비교하면 여기서 조용히 어긋난다", () => {
    expect(recommendFor([round("INTRO", 4, 5)]).recommendedCourseId).toBe(N5);
    expect(recommendFor([round("INTRO", 3, 5)]).recommendedCourseId).toBe(INTRO);
  });
});

describe("추천 대상의 불변 조건", () => {
  it("추천은 준비중 코스를 절대 가리키지 않는다 (P10)", () => {
    const n1Preparing = COURSES.map((course) =>
      course.levelCode === "N1" ? { ...course, status: "PREPARING", unitCount: 0 } : course,
    );
    // N1이 목록에서 빠지면 N2가 가장 높은 레벨이다 → 통과하면 allPassed고, 갈 곳은 가장 높은 **공개** 코스다
    const result = recommendFor([round("N2", 6)], n1Preparing);

    expect(result.allPassed).toBe(true);
    expect(result.recommendedCourseId).toBe(N2);
  });

  it("입문이 준비중이면 N5 미달에도 준비중 코스를 가리키지 않는다 (P10·E22)", () => {
    const introPreparing = COURSES.map((course) =>
      course.levelCode === "INTRO" ? { ...course, status: "PREPARING", unitCount: 0 } : course,
    );

    expect(recommendFor([round("N5", 0)], introPreparing).recommendedCourseId).toBe(N5);
  });

  it("공개 코스가 하나도 없으면 null이다 — 배너를 그리지 않는다", () => {
    const allPreparing = COURSES.map((course) => ({ ...course, status: "PREPARING" }));

    expect(stagePlan(allPreparing)).toEqual([]);
    expect(recommendFor([round("N5", 6)], allPreparing)).toBeNull();
  });

  /**
   * ★ `stepDownCourseId`는 **없어졌다**(§18-3). 결과 화면의 보조 동선이 코스 링크가 아니라
   * **레벨 검사 시작 버튼**(`nextLevelOffer`)으로 바뀌었기 때문이다.
   * 남겨 두면 "한 단계 아래 코스"와 "아래 레벨 도전"이라는 두 벌의 계산이 공존한다(08 C-11).
   */
  it("한 단계 아래 코스 링크를 더 이상 계산하지 않는다", () => {
    const result = recommendFor([round("N2", 4)]);

    expect(result).not.toHaveProperty("stepDownCourseId");
  });
});
