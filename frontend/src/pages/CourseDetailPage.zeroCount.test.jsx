import { screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { apiSuccess, renderAtRoute, stubFetch } from "../test/helpers.jsx";
import { enCourseDetailFixture } from "../test/apiFixtures.js";
import { CourseDetailPage } from "./CourseDetailPage.jsx";

/**
 * 코스 상세의 **0인 집계** — 없는 것을 사과하지 않는다 (2026-08-25 판정 M2, J-1의 확장)
 *
 * 유닛 학습 화면은 이미 이 원칙을 지킨다 — 입문 유닛은 `kanjis: []`를 받으면 한자 스텝도, 칩도,
 * "한자가 없어요" 안내도 만들지 않는다(`UnitStudyPage.intro.test.jsx` — 설계/06 §2·§6 판정 J-1).
 * 그런데 **같은 코스의 상세 화면은 같은 사실을 "한자 0자"로 11번 말한다**(집계줄 1 + 유닛 행 10).
 * 입문이 한자를 안 배우는 것은 **설계**인데 화면은 그것을 결핍처럼 읽히게 만든다.
 *
 * 판정: **집계가 0인 칸은 통째로 그리지 않는다.** 대상은 "0이 정상 상태인 칸"뿐 —
 *   - 일본어 상세의 **한자**(입문은 0자가 정상)
 *   - 영어 상세의 **표현**(표현 없는 코스가 있을 수 있다)
 * 문법·어휘·유닛 수는 0이 정상이 아니다(콘텐츠 결함이다) — 그건 계속 그려서 **드러나게** 둔다.
 *
 * 이 테스트를 수정하지 말 것 — 계약 변경은 senior-dev 경유.
 */

/** 입문 코스 상세 — 실제 `GET /api/courses/1` 응답 모양(감사 실측: kanjiCount 0, 유닛 10개) */
function introCourseDetail(overrides = {}) {
  return {
    id: 1,
    courseNo: 0,
    levelCode: "INTRO",
    levelLabel: "문자",
    title: "입문",
    targetAudience: "히라가나부터 시작하는 사람",
    goal: "문자와 첫 마디",
    notice: null,
    description: "문자부터 시작합니다",
    status: "AVAILABLE",
    summary: { unitCount: 2, grammarCount: 4, kanjiCount: 0, vocabCount: 30 },
    units: [
      { unitNo: 1, title: "안녕하세요", grammarCount: 2, kanjiCount: 0, vocabCount: 15 },
      { unitNo: 2, title: "고맙습니다", grammarCount: 2, kanjiCount: 0, vocabCount: 15 },
    ],
    ...overrides,
  };
}

function renderJa(detail, courseId = 1) {
  stubFetch(() => apiSuccess(detail));
  return renderAtRoute(<CourseDetailPage />, { path: "/courses/:courseId", route: `/courses/${courseId}` });
}

function renderEn(detail, courseId = 101) {
  stubFetch(() => apiSuccess(detail));
  return renderAtRoute(<CourseDetailPage lang="en" />, {
    path: "/en/courses/:courseId",
    route: `/en/courses/${courseId}`,
  });
}

describe("입문 코스 상세 — 한자 0자를 말하지 않는다 (M2)", () => {
  it("집계줄에 '한자' 칸이 아예 없다", async () => {
    renderJa(introCourseDetail());

    // 화면이 뜬 것을 먼저 확인한다(집계는 그려졌는데 한자만 빠졌는지를 봐야 한다)
    expect(await screen.findByText("문자부터 시작합니다")).toBeInTheDocument();
    expect(screen.queryAllByText(/한자/)).toHaveLength(0);
    expect(screen.queryAllByText(/0자/)).toHaveLength(0);
  });

  it("유닛 행에도 '한자 0자'가 없고, 남은 항목은 그대로 읽힌다", async () => {
    renderJa(introCourseDetail());

    const row = (await screen.findAllByText(/문법 2/))[0];
    expect(row).toHaveTextContent("회화 1");
    expect(row).toHaveTextContent("어휘 15개");
    expect(row).not.toHaveTextContent("한자");
    // 구분점만 남아 "· ·"로 겹치지 않는다
    expect(row.textContent).not.toMatch(/·\s*·/);
  });

  it("0이 아닌 코스는 그대로 보여준다 (숨김은 0일 때만)", async () => {
    renderJa(
      introCourseDetail({
        id: 2,
        title: "왕초보",
        levelLabel: "JLPT N5",
        summary: { unitCount: 2, grammarCount: 4, kanjiCount: 10, vocabCount: 32 },
        units: [{ unitNo: 1, title: "저는 ○○입니다", grammarCount: 2, kanjiCount: 5, vocabCount: 16 }],
      }),
      2,
    );

    expect(await screen.findByText("10자")).toBeInTheDocument();
    expect(screen.getByText(/한자 5자/)).toBeInTheDocument();
  });
});

describe("영어 코스 상세 — 표현 0개도 같은 규칙 (M2)", () => {
  it("표현 집계가 0이면 '표현' 칸을 그리지 않는다", async () => {
    renderEn(
      enCourseDetailFixture({
        summary: { unitCount: 1, grammarCount: 3, expressionCount: 0, vocabCount: 16 },
        units: [{ unitNo: 1, title: "첫 문장 다시 세우기", grammarCount: 3, expressionCount: 0, vocabCount: 16 }],
      }),
    );

    expect(await screen.findByText(/첫 문장 다시 세우기/)).toBeInTheDocument();
    expect(screen.queryAllByText(/표현/)).toHaveLength(0);
  });

  it("표현이 있으면 그대로 보여준다", async () => {
    renderEn(enCourseDetailFixture());

    expect(await screen.findByText("14")).toBeInTheDocument(); // 집계줄의 표현 수
    expect(screen.getAllByText(/표현 7/).length).toBe(2);
  });
});
