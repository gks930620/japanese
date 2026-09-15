import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import { renderDiagnosis, resultRows, startLevel, submitLevel } from "../test/diagnosisHelpers.jsx";

/**
 * 실력 진단 — **여러 판을 이어 칠 때** (설계/09 §3-2-1 · 05 §15-2 — TDD Red, senior-dev 2026-09-14 개편)
 *
 * 기획 D10·D11·D12·D13 / 인수 조건 **A24·A30·A31·A33·A34-1·A35** + 예외 **E23·E24·E25**.
 *
 * ★ 이 파일이 고정하는 것은 **한 판이 끝난 뒤 사용자가 누르는 버튼**이다. 자동 진행은 어느 방향으로도 없다 —
 *   통과해도 미달해도 결과 화면에서 멈추고, 다음 판은 **누른 버튼에서만** 시작된다(D10).
 *
 * 버튼 위계는 셋 고정이다(D11): primary = 이어가기(없으면 코스 시작하기) / secondary = 코스 시작하기 / ghost = 다른 레벨 고르기.
 *
 * 이 테스트를 수정하지 말 것 — 계약 변경은 senior-dev 경유.
 */

const headline = () => document.querySelector(".diag-headline")?.textContent?.trim() ?? null;
const primaryLabels = () => [...document.querySelectorAll(".k-btn--primary")].map((node) => node.textContent.trim());
/** 레벨 선택지 줄 오른쪽에 붙는 지난 결과 — 안 친 레벨에는 없다(A24) */
const levelMark = (name) =>
  screen.getByRole("radio", { name }).closest("label")?.querySelector(".diag-level-mark")?.textContent?.trim() ?? null;

describe("통과하면 위 레벨을 제안한다 (A33·D11)", () => {
  it("주 버튼은 '{위 levelLabel} 도전하기 ›'이고, 누를 때만 다음 판이 시작된다", async () => {
    renderDiagnosis();
    const user = userEvent.setup();
    await startLevel(user); // 기본값 = 입문
    await submitLevel(user, { correct: true });

    // 통과했으니 주 버튼은 "다음 레벨 도전"이다 — N5가 되는지는 아직 재지 않았으므로 코스로 보내지 않는다
    expect(primaryLabels()).toEqual(["JLPT N5 도전하기 ›"]);
    expect(screen.getByRole("link", { name: "왕초보 코스 시작하기" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "다른 레벨 고르기" })).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "JLPT N5 도전하기 ›" }));

    expect(await screen.findByRole("button", { name: /제출하고/ })).toBeInTheDocument();
    expect(document.body.textContent).toMatch(/JLPT N5 레벨 · 6문항/);
  });
});

describe("미달하면 아래 레벨을 제안한다 (A33·D11)", () => {
  it("주 버튼은 '{아래 levelLabel} 확인하기 ›'이고, 누를 때만 다음 판이 시작된다", async () => {
    renderDiagnosis();
    const user = userEvent.setup();
    await startLevel(user, "중상급(JLPT N2)");
    await submitLevel(user, { correct: false });

    expect(headline()).toBe("이 레벨은 아직 조금 어려워요");
    expect(screen.getByText("한 단계 아래 레벨을 확인해 볼까요?")).toBeInTheDocument();
    expect(primaryLabels()).toEqual(["JLPT N3 확인하기 ›"]);

    await user.click(screen.getByRole("button", { name: "JLPT N3 확인하기 ›" }));

    expect(await screen.findByRole("button", { name: /제출하고/ })).toBeInTheDocument();
    expect(document.body.textContent).toMatch(/JLPT N3 레벨 · 6문항/);
  });
});

describe("이미 통과한 레벨은 제안하지 않는다 (A34-1·E25)", () => {
  /**
   * `입문 통과 → N5 도전 → N5 미달` 인 사람에게 아래 레벨은 **방금 통과한 입문**이다.
   * 이미 증명한 것을 다시 확인하라고 권하는 것이 이 개편이 없애려던 귀찮음 그 자체다.
   */
  it("아래 레벨을 이미 통과했으면 이어가기 버튼이 DOM에 없고 코스 시작하기가 주 버튼이 된다", async () => {
    renderDiagnosis();
    const user = userEvent.setup();
    await startLevel(user);
    await submitLevel(user, { correct: true });
    await user.click(screen.getByRole("button", { name: "JLPT N5 도전하기 ›" }));
    await screen.findByRole("button", { name: /제출하고/ });
    await submitLevel(user, { correct: false });

    expect(screen.queryByRole("button", { name: /확인하기/ })).toBeNull();
    expect(screen.getByText("아래 레벨은 이미 충분했어요 — 여기부터 공부하면 돼요.")).toBeInTheDocument();
    // 통과한 레벨은 입문뿐이다 → 그 위 = N5 코스가 추천이자 주 버튼이다(D14)
    expect(primaryLabels()).toEqual(["왕초보 코스 시작하기 ›"]);
    expect(screen.getByText("지금 시작한다면 왕초보(JLPT N5) 코스가 좋아요.")).toBeInTheDocument();
  });
});

describe("판정표는 레벨 순으로 쌓이고 레벨당 한 행이다 (A30·A31·E23)", () => {
  it("친 순서가 아니라 레벨 순으로 선다", async () => {
    renderDiagnosis();
    const user = userEvent.setup();
    // N2를 먼저 치고(미달) → 아래인 N3를 친다(통과). 친 순서는 N2 → N3다
    await startLevel(user, "중상급(JLPT N2)");
    await submitLevel(user, { correct: false });
    await user.click(screen.getByRole("button", { name: "JLPT N3 확인하기 ›" }));
    await screen.findByRole("button", { name: /제출하고/ });
    await submitLevel(user, { correct: true });

    // 표는 낮은 레벨부터다 — 시간 순서는 판정에 쓰이지 않는다(D12)
    expect(resultRows()).toEqual([
      ["JLPT N3", "6 / 6", "통과"],
      ["JLPT N2", "0 / 6", "—"],
    ]);
    // N3를 통과했으니 그 위 = N2 코스가 추천이다(D14 검산 3행)
    expect(screen.getByText("지금 시작한다면 중상급(JLPT N2) 코스가 좋아요.")).toBeInTheDocument();
  });

  it("같은 레벨을 다시 치면 행이 하나이고 나중 결과로 바뀐다 (A31·E24)", async () => {
    renderDiagnosis();
    const user = userEvent.setup();
    await startLevel(user, "중상급(JLPT N2)");
    await submitLevel(user, { correct: false });
    expect(resultRows()).toEqual([["JLPT N2", "0 / 6", "—"]]);

    // [다른 레벨 고르기] → 같은 레벨을 다시 고른다
    await user.click(screen.getByRole("button", { name: "다른 레벨 고르기" }));
    await startLevel(user, /중상급\(JLPT N2\)/);
    await submitLevel(user, { correct: true });

    expect(resultRows()).toEqual([["JLPT N2", "6 / 6", "통과"]]);
    // "몇 번 쳤는지"는 화면에 없다 — 판정에 쓰지 않는 숫자다(D13)
    expect(document.body.textContent).not.toMatch(/2번|두 번|재도전/);
  });
});

describe("[다른 레벨 고르기]는 기록을 유지한다 (A35·A24)", () => {
  it("레벨 고르기 화면으로 돌아가고, 이미 친 레벨에는 지난 결과가 붙어 있다", async () => {
    renderDiagnosis();
    const user = userEvent.setup();
    await startLevel(user);
    await submitLevel(user, { correct: true });

    await user.click(screen.getByRole("button", { name: "다른 레벨 고르기" }));

    expect(await screen.findByRole("button", { name: "시작하기" })).toBeInTheDocument();
    expect(levelMark(/입문\(문자\)/)).toMatch(/6\s*\/\s*6/);
    // 아직 안 친 레벨에는 아무것도 붙지 않는다
    expect(levelMark(/초급\(JLPT N4\)/)).toBeNull();
    // 판정 낱말은 붙이지 않는다 — 판정은 결과 표가 말한다(§14-1)
    expect(levelMark(/입문\(문자\)/)).not.toMatch(/통과|미달/);
    // 되돌아와도 기본 선택값은 언제나 가장 낮은 레벨이다(D9)
    expect(screen.getByRole("radio", { name: /입문\(문자\)/ })).toBeChecked();
  });
});
