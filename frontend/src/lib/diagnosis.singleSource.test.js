// 가드 — senior-dev 작성 (2026-09-03 판정 M1 · 2026-09-10 개편으로 **상대가 바뀌었다**)
//
// 진단 계단이 될 수 있는 레벨 코드(`STAGE_LEVEL_CODES`)는 프론트에 하드코딩돼 있고, 자료실의 레벨 선택지도
// 따로 하드코딩돼 있다. 둘은 **같은 사실의 두 사본**이라 갈리면 조용히 어긋난다 — 이 가드가 그것을 막는다.
//
// ★ 2026-09-10: 상대가 **한자 자료실 → 문법 자료실**로 바뀌었다.
//   예전 계단은 "한자가 있는 레벨"이었다(단계마다 한자 1문항). 개편으로 한자 낱자 문항이 빠지고
//   재료가 **어휘·문법**이 되면서, 계단의 기준은 "한자가 있는 레벨"이 아니라 **"코스가 있는 레벨 전부"** 다.
//   문법·어휘 자료실의 레벨 선택지가 바로 그 목록이고, 거기에는 입문(INTRO)이 들어 있다.
import { describe, expect, it } from "vitest";
import { STAGE_LEVEL_CODES, stagePlan } from "./diagnosis.js";
import { levelOptions } from "./libraryQuery.js";

describe("진단 계단 레벨 — 두 하드코딩 사본은 같은 값이어야 한다 (M1 가드)", () => {
  it("STAGE_LEVEL_CODES 는 문법 자료실의 레벨 선택지와 같다(구성·순서)", () => {
    expect(STAGE_LEVEL_CODES).toEqual(levelOptions({ type: "grammar", lang: "ja" }));
  });

  it("어휘 자료실 선택지와도 같다 — 진단 재료는 어휘와 문법 둘이다", () => {
    expect(STAGE_LEVEL_CODES).toEqual(levelOptions({ type: "vocabulary", lang: "ja" }));
  });

  /** 한자 자료실에는 입문이 없다 — 진단이 더 이상 한자를 재료로 쓰지 않는다는 사실의 반대편 증거다 */
  it("한자 자료실 선택지와는 더 이상 같지 않다 (입문이 계단에 들어왔다)", () => {
    expect(STAGE_LEVEL_CODES).not.toEqual(levelOptions({ type: "kanji", lang: "ja" }));
    expect(STAGE_LEVEL_CODES).toContain("INTRO");
  });

  it("계단 순서는 학습 순서다 — 입력이 뒤섞여도 결과는 낮은 레벨부터", () => {
    const shuffled = [
      { id: 6, courseNo: 5, levelCode: "N1", levelLabel: "JLPT N1", title: "고급", status: "AVAILABLE" },
      { id: 2, courseNo: 1, levelCode: "N5", levelLabel: "JLPT N5", title: "왕초보", status: "AVAILABLE" },
      { id: 4, courseNo: 3, levelCode: "N3", levelLabel: "JLPT N3", title: "중급", status: "AVAILABLE" },
      { id: 1, courseNo: 0, levelCode: "INTRO", levelLabel: "문자", title: "입문", status: "AVAILABLE" },
    ];
    expect(stagePlan(shuffled).map((stage) => stage.courseId)).toEqual([1, 2, 4, 6]);
  });

  /** 영어 과정 코드는 계단에 들어가지 않는다 — 진단은 일본어 과정의 도구다(설계/09 §5) */
  it("영어 레벨 코드는 계단이 되지 않는다", () => {
    const enCourses = [{ id: 101, courseNo: 1, levelCode: "E1", levelLabel: "E1", title: "다시 세우기", status: "AVAILABLE" }];
    expect(stagePlan(enCourses)).toEqual([]);
  });
});
