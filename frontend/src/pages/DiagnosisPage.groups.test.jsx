import { screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import { apiSuccess } from "../test/helpers.jsx";
import {
  DIAG_EMPTY,
  DIAG_GRAMMAR,
  diagnosisCards,
  groupTitles,
  renderDiagnosis,
  startLevel,
  submitLevel,
} from "../test/diagnosisHelpers.jsx";

/**
 * 실력 진단 — **문항의 갈래 묶음** (설계/09 §3-3 · 05 §15-2 — TDD Red, senior-dev 2026-09-14 개편)
 *
 * 기획 D18 / 인수 조건 **A42·A43·A44·A45·A46·A47**.
 *
 * 요구는 *"테스트별로 문법, 어법, 단어어휘가 잘 나뉘어져 있으면 좋겠어"* 였다.
 * 화면 순서는 **이미** 어휘 → 문법 → 문장으로 묶여 있었고(09 §3-3), 없던 것은 **구분**이다 —
 * 그래서 이 변경은 문항 수·유형을 하나도 건드리지 않는다. 갈래 매핑 자체는 `lib/diagnosis.test.js`가 고정한다(08 C-11).
 *
 * DOM 계약: 갈래 묶음 = `<section class="diag-group">`, 머리글 = `<h2 class="diag-group-title">`.
 * **중첩 `<fieldset>`으로 만들지 않는다** — 문항마다 이미 fieldset/legend가 있어 낭독기가 그룹을 두 겹으로 읽는다.
 *
 * 이 테스트를 수정하지 말 것 — 계약 변경은 senior-dev 경유.
 */

const cardLegends = () =>
  diagnosisCards().map((card) => card.querySelector("legend").textContent.replace(/\s+/g, " ").trim());

describe("갈래 머리글 (A42·A43·A44)", () => {
  it("입문~N3은 어휘 → 문법 → 문장 세 묶음이고 `어법`은 없다", async () => {
    renderDiagnosis();
    const user = userEvent.setup();
    await startLevel(user); // 기본값 = 입문

    expect(groupTitles()).toEqual(["어휘", "문법", "문장"]);
    // 머리글에 개수를 붙이지 않는다 — 6장이 한 화면에 다 보이므로 보면 안다(D18-5)
    groupTitles().forEach((title) => expect(title).not.toMatch(/\d/));
    expect(document.querySelectorAll(".diag-group-title")).toHaveLength(3);
    expect(document.querySelectorAll(".diag-group")).toHaveLength(3);
  });

  it("N2·N1은 어휘 → 어법 두 묶음이고 `문법`·`문장`은 없다 — 정상 경로다", async () => {
    renderDiagnosis();
    const user = userEvent.setup();
    await startLevel(user, "중상급(JLPT N2)");

    expect(groupTitles()).toEqual(["어휘", "어법"]);
  });

  it("갈래 순서는 레벨이 바뀌어도 어휘가 먼저다 (A43)", async () => {
    renderDiagnosis();
    const user = userEvent.setup();
    await startLevel(user, "고급(JLPT N1)");

    expect(groupTitles()[0]).toBe("어휘");
  });

  /** 갈래 묶음을 fieldset으로 만들면 role=group이 6개에서 8~9개로 늘어 문항 카드 계약이 깨진다 */
  it("묶음은 문항 카드를 한 겹 더 감싸는 그룹이 아니다", async () => {
    renderDiagnosis();
    const user = userEvent.setup();
    await startLevel(user);

    expect(diagnosisCards()).toHaveLength(6);
    expect(document.querySelectorAll(".diag-group fieldset.diag-question")).toHaveLength(6);
  });
});

describe("빈 갈래는 머리글째로 없다 (A45)", () => {
  /**
   * 재료가 모자라 문장 문항을 못 만들면 어휘가 4문항이 된다(D2-4). 이때 `문장` 머리글은 **DOM에 없고**,
   * 그 사실에 대한 사과 문구도 없다 — 사용자가 모르는 사정을 알리면 제품이 고장 난 것처럼 보인다.
   */
  it("문장 문항을 못 만들면 `문장` 머리글이 없고 사과 문구도 없다", async () => {
    const noExamples = {
      ...DIAG_GRAMMAR,
      content: DIAG_GRAMMAR.content.map((item) => ({ ...item, examples: [] })),
    };
    renderDiagnosis({ library: (url) => (url.includes("/grammar") ? apiSuccess(noExamples) : null) });
    const user = userEvent.setup();
    await startLevel(user);

    expect(groupTitles()).toEqual(["어휘", "문법"]);
    expect(diagnosisCards()).toHaveLength(6);
    expect(document.body.textContent).not.toMatch(/문장/);
    expect(document.body.textContent).not.toMatch(/준비 중|준비하지|없어요/);
  });

  it("어휘를 못 만들면 `어휘` 머리글이 없다 — 예외를 두지 않는다", async () => {
    renderDiagnosis({ library: (url) => (url.includes("/vocabulary") ? apiSuccess(DIAG_EMPTY) : null) });
    const user = userEvent.setup();
    await startLevel(user);

    expect(groupTitles()).toEqual(["문법", "문장"]);
    expect(diagnosisCards()).toHaveLength(3);
  });
});

describe("문항 번호는 화면 전체에서 이어진다 (A46)", () => {
  it("갈래마다 1로 되돌아가지 않는다", async () => {
    renderDiagnosis();
    const user = userEvent.setup();
    await startLevel(user);

    expect(cardLegends().map((legend) => legend.match(/^\d+/)[0])).toEqual(["1", "2", "3", "4", "5", "6"]);
  });

  it("첫 갈래가 비어도 번호는 1부터 시작한다", async () => {
    renderDiagnosis({ library: (url) => (url.includes("/vocabulary") ? apiSuccess(DIAG_EMPTY) : null) });
    const user = userEvent.setup();
    await startLevel(user);

    expect(cardLegends().map((legend) => legend.match(/^\d+/)[0])).toEqual(["1", "2", "3"]);
  });
});

describe("결과 화면에는 갈래가 없다 (A47)", () => {
  /**
   * 갈래별 정답 수는 사실상 **문항별 정오**다("어휘 3중 2"를 보면 어느 문항이 틀렸는지 되짚기 시작한다).
   * 판정의 단위는 레벨이고, 판정에 쓰지 않는 숫자를 화면에 두지 않는다(05 §19-6).
   */
  it("표의 열로도 문구로도 갈래별 정답 수가 없다", async () => {
    renderDiagnosis();
    const user = userEvent.setup();
    await startLevel(user);
    await submitLevel(user, { correct: true });

    const headers = within(screen.getByRole("table")).getAllByRole("columnheader").map((th) => th.textContent.trim());
    expect(headers).toEqual(["레벨", "정답 수 / 문항 수", "판정"]);
    ["어휘", "문법", "어법", "문장"].forEach((group) => {
      expect(document.body.textContent).not.toMatch(new RegExp(group));
    });
  });
});
