import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import { apiError, apiSuccess } from "../test/helpers.jsx";
import {
  DIAG_EMPTY,
  beginLevel,
  diagnosisCards,
  libraryCalls,
  renderDiagnosis,
  resultRows,
  startLevel,
  submitLevel,
} from "../test/diagnosisHelpers.jsx";

/**
 * 진단 — **문항 화면을 못 띄웠을 때의 출구** (설계/09 §3-6 — TDD Red, senior-dev 2026-09-14 개편)
 *
 * 기획 D15 / 인수 조건 **A39·A40·A41** + 예외 **E13·E14·E15·E16**.
 * 핵심은 하나다: **진단이 안 돼도 학습으로 가는 길을 막지 않는다.** 진단은 목적이 아니라 수단이다(05 §15-2).
 *
 * ★ 2026-09-14에 이 파일의 **갈림길이 사라졌다**(A20 무효). 1차는 *"첫 단계면 실패 카드, 2단계 이후면
 *   지금까지 결과로 결론"* 이었는데, 레벨을 직접 고르는 모델에는 **"첫 단계"라는 개념이 없다.**
 *   이제는 **언제나 같은 실패 카드**이고 갈리는 것은 **주 버튼 하나**뿐이다(지금까지 친 판이 있나).
 *   말없이 결과 화면으로 되돌리지 않는다 — 자기가 방금 누른 버튼의 결과를 기다리는 사람에게
 *   이전 화면이 다시 뜨면 **"아무 일도 안 일어났다"** 로 읽힌다.
 *
 * 이 테스트를 수정하지 말 것 — 계약 변경은 senior-dev 경유.
 */

const emptyFor = (target) => (url, level) => (level === target ? apiSuccess(DIAG_EMPTY) : null);

describe("고른 레벨의 문항을 못 만들었을 때 (E13 · A39·A40)", () => {
  it("어느 레벨에서 막혔는지 말하고, 학습으로 가는 길을 주 버튼으로 준다", async () => {
    renderDiagnosis({ library: emptyFor("INTRO") });
    const user = userEvent.setup();
    await beginLevel(user);

    // 1차에서는 레벨을 말하지 않았다 — 이제 그 정보가 사용자의 다음 선택(다른 레벨 고르기)에 직접 쓰인다
    expect(await screen.findByText("입문(문자) 레벨은 문제를 준비하지 못했어요.")).toBeInTheDocument();

    const fallback = screen.getByRole("link", { name: /일단 입문부터 시작하기/ });
    expect(fallback.getAttribute("href")).toBe("/courses/1");
    expect(fallback).toHaveClass("k-btn--primary");
    expect(screen.getByRole("button", { name: "다른 레벨 고르기" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "다시 시도" })).toBeInTheDocument();
    // 판정이 없는 판이다 — 결과 화면으로 넘기지 않는다
    expect(document.querySelector(".diag-headline")).toBeNull();
    expect(screen.queryByRole("table")).toBeNull();
  });

  it("[다른 레벨 고르기]가 레벨 고르기 화면으로 되돌린다 — 다른 레벨은 재료가 있을 수 있다", async () => {
    renderDiagnosis({ library: emptyFor("INTRO") });
    const user = userEvent.setup();
    await beginLevel(user);
    await screen.findByText(/문제를 준비하지 못했어요/);

    await user.click(screen.getByRole("button", { name: "다른 레벨 고르기" }));

    expect(await screen.findByRole("button", { name: "시작하기" })).toBeInTheDocument();
    expect(screen.getAllByRole("radio").length).toBeGreaterThan(0);
  });
});

describe("이미 친 판이 있을 때 (A40·A41)", () => {
  it("주 버튼이 [지금까지 결과 보기]가 되고, 실패한 레벨은 표에 행을 만들지 않는다", async () => {
    renderDiagnosis({ library: emptyFor("N5") });
    const user = userEvent.setup();
    await startLevel(user); // 입문은 정상 재료다
    await submitLevel(user, { correct: true });
    await user.click(screen.getByRole("button", { name: "JLPT N5 도전하기 ›" }));

    expect(await screen.findByText("왕초보(JLPT N5) 레벨은 문제를 준비하지 못했어요.")).toBeInTheDocument();
    const back = screen.getByRole("button", { name: "지금까지 결과 보기" });
    expect(back).toHaveClass("k-btn--primary");
    expect(screen.queryByRole("link", { name: /일단 .*부터 시작하기/ })).toBeNull();

    await user.click(back);

    // 측정하지 않은 레벨이므로 행이 없다. 앞서 친 판의 행은 그대로다
    expect(resultRows()).toEqual([["문자", "6 / 6", "통과"]]);
  });
});

describe("재료를 부르다 실패했을 때 (E14)", () => {
  it("같은 실패 카드가 나오고 [다시 시도]가 같은 레벨을 다시 부른다", async () => {
    let failNext = true;
    const fetchMock = renderDiagnosis({
      library: (url, level) => {
        if (level !== "N2" || !failNext) return null;
        return apiError(500, "INTERNAL_SERVER_ERROR");
      },
    });
    const user = userEvent.setup();
    await beginLevel(user, "중상급(JLPT N2)");

    // 재료 부족과 호출 실패를 화면에서 구별해 주지 않는다 — 사용자가 할 수 있는 일이 같다
    expect(await screen.findByText("중상급(JLPT N2) 레벨은 문제를 준비하지 못했어요.")).toBeInTheDocument();

    failNext = false;
    await user.click(screen.getByRole("button", { name: "다시 시도" }));

    expect(await screen.findByRole("button", { name: /제출하고/ })).toBeInTheDocument();
    expect(document.body.textContent).toMatch(/JLPT N2 레벨 · 6문항/);
    // 처음(가장 낮은 레벨)으로 되돌아가지 않는다
    const retried = libraryCalls(fetchMock).filter((url) => url.includes("level=N2"));
    expect(retried.length).toBeGreaterThan(2); // 실패한 호출 + 재시도 호출
  });
});

describe("문항이 6개를 못 채웠을 때 (E15·E16)", () => {
  /**
   * ★ 실제로 일어날 수 있는 일이다. N5 문법은 44개지만 **한자·가타카나를 뺀 지문 후보는 12개**뿐이고(09 §3-4),
   * 어휘 쪽도 가타카나를 빼면 후보가 20% 줄어든다. 재료가 모자란 판을 **없는 척하지 않는다** —
   * 만들어진 수가 그 판의 사실이고, 통과선은 그 수에서 계산된다(`ceil(3 × 2/3)` = 2).
   */
  it("3~5문항이면 평소와 똑같은 화면이고, 진행 줄이 그 수를 말한다", async () => {
    // 어휘가 0건 → 어휘 3문항이 빠지고 문법 2 + 문장 1 = 3문항만 남는다
    renderDiagnosis({ library: (url, level) => (level === "INTRO" && url.includes("/vocabulary") ? apiSuccess(DIAG_EMPTY) : null) });
    const user = userEvent.setup();
    await startLevel(user);

    expect(document.body.textContent).toMatch(/문자 레벨 · 3문항/);
    expect(diagnosisCards()).toHaveLength(3);
    expect(screen.getAllByRole("radio")).toHaveLength(15);
    // 사과 문구·경고 띠가 없다 — 사용자가 모르는 사정을 알리면 제품이 고장 난 것처럼 보인다
    expect(document.body.textContent).not.toMatch(/준비하지 못|죄송|일부만/);
  });

  it("3문항짜리 판의 통과선은 2다 — 비율이 그대로 걸린다 (A27)", async () => {
    renderDiagnosis({ library: (url, level) => (level === "INTRO" && url.includes("/vocabulary") ? apiSuccess(DIAG_EMPTY) : null) });
    const user = userEvent.setup();
    await startLevel(user);
    await submitLevel(user, { correct: true });

    expect(resultRows()).toEqual([["문자", "3 / 3", "통과"]]);
  });
});
