// senior-dev 작성 (2026-09-21 결함 1) — 유닛 학습 화면의 **자형 분기** 계약.
// 기준: 설계/05 §16-4("영어 문장에 --font-jp를 씌우지 않는다 — 기존 컴포넌트에 `latin`을 얹어 자형만 되돌린다")
//       설계/06 §11-9(같은 증상을 과거 사고로 기록한 자리)
//
// ── 왜 이 파일이 새로 생겼나 ────────────────────────────────────────────
// 복습 블록은 `unitNo % 5 == 0`에서만 뜬다. 영어 과정은 유닛 5가 처음 열리면서 **처음 발동**했고,
// 기존 복습 블록 테스트 3건은 전부 일본어 payload라 **영어 경로를 한 번도 밟지 않았다.**
// 그래서 `UnitStudyPage.jsx`의 복습 칩이 `className="k-chip chip-static jp"`로 하드코딩된 채
// 제품까지 나갔다 — Windows에서 `--font-jp`(Yu Gothic UI·Meiryo)가 라틴 문자에 실제로 잡힌다.
//
// 이 파일은 그 구멍을 **두 방향으로** 막는다:
//   ① 영어 그물 — 영어 유닛의 어느 스텝에도 `.jp` 요소가 없다(앞으로 생길 하드코딩까지 잡는다)
//   ② 일본어 대칭 — 일본어에는 `.latin`이 하나도 없다("전부 latin으로 바꾸기"로는 통과하지 못한다)
//
// ⚠️ 이 테스트는 계약이다. 구현이 통과하지 못하면 구현을 고친다(테스트 수정은 senior-dev 경유).
import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import { apiSuccess, renderAtRoute, stubFetch, unitStudyPayload } from "../test/helpers.jsx";
import { enUnitStudyPayload } from "../test/apiFixtures.js";
import { UnitStudyPage } from "./UnitStudyPage.jsx";

/** 실제 E1 유닛 5의 모양 — 복습 블록(1~5)과 활용 규칙표가 **둘 다** 있는 영어 유닛 */
function enUnitWithReview(overrides = {}) {
  return enUnitStudyPayload({
    unitNo: 5,
    totalUnits: 5,
    prevUnitNo: 4,
    nextUnitNo: null,
    grammars: [
      {
        id: 9021,
        name: "기본 어순 (주어 + 동사 + 목적어)",
        nameKo: "자리가 뜻을 정한다",
        explanation: "한국어는 조사가, 영어는 자리가 역할을 알려 줍니다.",
        examples: [{ id: 1, jp: "I know her.", kana: null, meaningKo: "나는 그녀를 안다." }],
        // 영어 문법도 활용 규칙표를 가질 수 있다(GrammarDTO는 과정 공통이다)
        rules: [
          {
            groupLabel: "3인칭 단수",
            pattern: "동사 + -s",
            exampleBefore: "I work",
            exampleAfter: "He works",
          },
        ],
      },
    ],
    // 실제 시드의 화자 이름 — 배지에 라틴 대문자 M·B가 찍힌다
    dialog: {
      id: 9005,
      title: "자리 바꾸기",
      lines: [
        { id: 1, speaker: "Mina", jp: "Where do you sit now?", kana: null, meaningKo: "지금 어디 앉아요?" },
        { id: 2, speaker: "Ben", jp: "I sit by the window.", kana: null, meaningKo: "저는 창가에 앉아요." },
      ],
    },
    review: {
      fromUnitNo: 1,
      toUnitNo: 5,
      grammarNames: ["be동사 의문문 (Am / Is / Are ~?)", "기본 어순 (주어 + 동사 + 목적어)"],
    },
    ...overrides,
  });
}

/** 일본어 대칭 확인용 — 같은 자리(복습·규칙표)를 일본어 재료로 채운다 */
function jaUnitWithReview(overrides = {}) {
  return unitStudyPayload({
    unitNo: 5,
    prevUnitNo: 4,
    nextUnitNo: 6,
    grammars: [
      {
        id: 1,
        name: "名詞+です",
        nameKo: "명사입니다",
        explanation: "설명",
        examples: [{ jp: "学生です。", kana: "がくせいです。", meaningKo: "학생입니다." }],
        rules: [
          { groupLabel: "동사 1류", pattern: "う→います", exampleBefore: "かう", exampleAfter: "かいます" },
        ],
      },
    ],
    review: { fromUnitNo: 1, toUnitNo: 5, grammarNames: ["名詞+です", "これ・それ・あれ"] },
    ...overrides,
  });
}

function renderEnUnit(payload = enUnitWithReview()) {
  stubFetch(() => apiSuccess(payload));
  return renderAtRoute(<UnitStudyPage lang="en" />, {
    path: "/en/courses/:courseId/units/:unitNo",
    route: `/en/courses/101/units/${payload.unitNo}`,
  });
}

function renderJaUnit(payload = jaUnitWithReview()) {
  stubFetch(() => apiSuccess(payload));
  return renderAtRoute(<UnitStudyPage />, {
    path: "/courses/:courseId/units/:unitNo",
    route: `/courses/2/units/${payload.unitNo}`,
  });
}

async function goToStep(user, label) {
  await user.click(await screen.findByRole("button", { name: label }));
}

const classesOf = (selector) => [...document.querySelectorAll(selector)].map((el) => [...el.classList]);

describe("영어 유닛 — 라틴 자형 (설계/05 §16-4)", () => {
  it("복습 블록 칩이 latin으로 조판된다 — jp를 쓰지 않는다", async () => {
    const user = userEvent.setup();
    renderEnUnit();
    await goToStep(user, "정리");

    const chips = classesOf(".review-block .k-chip");
    expect(chips).toHaveLength(2); // 복습 칩이 실제로 떠 있는 상태에서 보는 것이다
    for (const classList of chips) {
      expect(classList).toContain("latin");
      expect(classList).not.toContain("jp");
    }
  });

  it("문법 활용 규칙표의 패턴·예 칸도 latin이다", async () => {
    const user = userEvent.setup();
    renderEnUnit();
    await goToStep(user, "문법");

    const cells = classesOf(".rules-table .p, .rules-table .e span:not(.arrow)");
    expect(cells.length).toBeGreaterThan(0);
    for (const classList of cells) {
      expect(classList).toContain("latin");
      expect(classList).not.toContain("jp");
    }
  });

  it("회화 화자 배지도 라틴 자형이다 — 'Mina'의 M이 일본어 폰트로 찍히지 않는다", async () => {
    const user = userEvent.setup();
    renderEnUnit();
    await goToStep(user, "회화");

    const badges = classesOf(".speaker-badge");
    expect(badges.length).toBeGreaterThan(0);
    for (const classList of badges) {
      expect(classList).toContain("latin");
    }
  });

  /**
   * 그물 — 스텝을 전부 돌며 `.jp`(= `--font-jp`를 거는 클래스)가 **하나도 없음**을 본다.
   * 개별 자리를 열거하는 대신 화면 전체를 보는 이유: 이번 결함처럼 **새로 열리는 자리**(복습 블록)가
   * 다시 생겨도 이 한 줄이 잡는다.
   */
  it("영어 유닛의 어느 스텝에도 .jp 요소가 없다", async () => {
    const user = userEvent.setup();
    renderEnUnit();
    await screen.findByRole("button", { name: "표현" });

    for (const label of ["문법", "회화", "표현", "어휘", "정리"]) {
      await goToStep(user, label);
      const found = [...document.querySelectorAll(".jp")].map((el) => `${el.className}: ${el.textContent.slice(0, 20)}`);
      expect(found, `[${label}] 스텝에 일본어 자형(.jp)이 남아 있다`).toEqual([]);
    }
  });
});

describe("일본어 유닛 — 자형 대칭 (전부 latin으로 바꾸면 여기서 깨진다)", () => {
  it("복습 블록 칩은 jp다", async () => {
    const user = userEvent.setup();
    renderJaUnit();
    await goToStep(user, "정리");

    const chips = classesOf(".review-block .k-chip");
    expect(chips).toHaveLength(2);
    for (const classList of chips) {
      expect(classList).toContain("jp");
      expect(classList).not.toContain("latin");
    }
  });

  it("일본어 유닛의 어느 스텝에도 .latin 요소가 없다", async () => {
    const user = userEvent.setup();
    renderJaUnit();
    await screen.findByRole("button", { name: "한자" });

    for (const label of ["문법", "회화", "한자", "어휘", "정리"]) {
      await goToStep(user, label);
      const found = [...document.querySelectorAll(".latin")].map((el) => el.className);
      expect(found, `[${label}] 스텝에 라틴 자형(.latin)이 섞였다`).toEqual([]);
    }
  });
});
