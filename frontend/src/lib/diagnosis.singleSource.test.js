// 가드 — senior-dev 작성 (2026-09-03 판정 M1)
//
// 진단 계단이 될 수 있는 레벨 코드(`STAGE_LEVEL_CODES`)는 프론트에 하드코딩돼 있고, 한자 자료실의 레벨 선택지
// (`levelOptions({type:"kanji"})`)도 따로 하드코딩돼 있다. 둘은 **같은 사실**(한자가 있는 레벨)의 두 사본이다.
// 완전한 파생(코스 목록 응답에서 계산)은 `/api/courses`에 한자 수가 없어 계약 변경이 필요하므로 보류했다(08 E).
// 그때까지 이 가드가 두 사본이 갈리는 것을 막는다 — 새 레벨이 한쪽에만 들어가면 여기서 빨개진다.
import { describe, expect, it } from "vitest";
import { STAGE_LEVEL_CODES, stagePlan } from "./diagnosis.js";
import { levelOptions } from "./libraryQuery.js";

describe("진단 계단 레벨 — 두 하드코딩 사본은 같은 값이어야 한다 (M1 가드)", () => {
  it("STAGE_LEVEL_CODES 는 한자 자료실의 레벨 선택지와 같다(구성·순서)", () => {
    expect(STAGE_LEVEL_CODES).toEqual(levelOptions({ type: "kanji", lang: "ja" }));
  });

  it("계단 순서는 courseNo 순이다 — 입력이 뒤섞여도 결과는 학습 경로 순", () => {
    const shuffled = [
      { id: 6, courseNo: 5, levelCode: "N1", levelLabel: "JLPT N1", title: "고급", status: "AVAILABLE" },
      { id: 2, courseNo: 1, levelCode: "N5", levelLabel: "JLPT N5", title: "왕초보", status: "AVAILABLE" },
      { id: 4, courseNo: 3, levelCode: "N3", levelLabel: "JLPT N3", title: "중급", status: "AVAILABLE" },
      { id: 1, courseNo: 0, levelCode: "INTRO", levelLabel: "문자", title: "입문", status: "AVAILABLE" },
    ];
    expect(stagePlan(shuffled).map((stage) => stage.courseId)).toEqual([2, 4, 6]);
  });
});
