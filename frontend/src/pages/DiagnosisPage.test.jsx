import { screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import {
  answerStage,
  diagnosisCards,
  libraryCalls,
  renderDiagnosis,
  resultRows,
  startLevel,
  submitButton,
  submitLevel,
} from "../test/diagnosisHelpers.jsx";

/**
 * 실력 진단 — **한 판**(레벨 하나, 6문항, 한 번 제출, 결과 화면에서 멈춤)
 * (설계/09 §3 · 05 §15-2 — TDD Red, senior-dev 2026-09-14 개편)
 *
 * 기획 `진행사항/기획_2026-09_진단개편.md` / 인수 조건 **A3·A4·A7·A25·A26·A27·A28·A29·A32** + 예외 **E18**.
 * 레벨 고르기는 `DiagnosisPage.levels.test.jsx`, 여러 판의 누적은 `DiagnosisPage.rounds.test.jsx`,
 * 갈래 머리글은 `DiagnosisPage.groups.test.jsx`, **미응답 제출 조건(A48~A56)은 `DiagnosisPage.unanswered.test.jsx`**가 맡는다(08 C-11).
 *
 * ★ 2026-09-14에 이 파일에서 **지운 단언 넷**(덮어쓰지 않고 지웠다 — 두 벌이 공존하면 사고가 난다, 08 C-11):
 *   · A1 "시작 화면이 최대 단계 수를 말한다"     → 레벨 고르기 화면으로 대체(A21 — levels 파일)
 *   · A2 "[시작하기]를 누르면 입문 단계가 먼저"  → 기본 선택값 규칙으로 대체(A22 — levels 파일)
 *   · A5 "마지막 단계에서는 제출 라벨이 바뀐다"  → 라벨은 **언제나 하나**(A25)
 *   · A8 "4문항 이상 맞히면 다음 단계로 넘어간다" → **통과든 미달이든 결과 화면**(A26). 통과선만 남았다(A27)
 * ★ 2026-09-20(3차 — 미응답 필수)에 **지운 단언 둘**(같은 이유로 지웠다):
 *   · A6 "안 고른 문항이 있어도 제출된다 + '모름으로 처리돼요'" → **미응답이 있으면 제출되지 않는다**(A48·A51 — unanswered 파일)
 *   · E17 "한 문항도 고르지 않고 제출해도 넘어간다"            → 제출되지 않는다(E26). 0/6 미달은 **전부 [모르겠어요]를 고른 경우**뿐(A52)
 *
 * 이 화면의 DOM 계약(09 §3-7): 문항 카드 = `<fieldset class="diag-question" role="radiogroup">`(2026-09-20) · 지문 = `.quiz-prompt` ·
 * 보기 = 한 문항당 같은 `name`을 가진 `<input type="radio">` 5개 · 제출 = 버튼 1개 · 결과 머리글 = `.diag-headline`.
 *
 * 이 테스트를 수정하지 말 것 — 계약 변경은 senior-dev 경유.
 */

const cards = diagnosisCards;
const headline = () => document.querySelector(".diag-headline")?.textContent?.trim() ?? null;

describe("문항 화면 (A3·A9·A10·A28)", () => {
  it("진행 줄은 '{레벨} 레벨 · {n}문항'이다 — 화면에 '단계'라는 말이 없다 (A28·D17)", async () => {
    renderDiagnosis();
    const user = userEvent.setup();
    await startLevel(user);

    // 입문 코스의 levelLabel은 "문자"다 — 문자열을 잘라 만든 값이 아니다
    expect(document.body.textContent).toMatch(/문자 레벨 · 6문항/);
    expect(document.body.textContent).not.toMatch(/단계/);
    // 전체 분모("5 / 36")는 쓰지 않는다 — 한 번에 치는 것은 한 레벨뿐이라 총량이 없다(A21)
    expect(document.body.textContent).not.toMatch(/\/\s*36/);
  });

  it("문항 6개가 한 화면에 동시에 있고, 문항마다 보기가 5개다 (A3·A9)", async () => {
    renderDiagnosis();
    const user = userEvent.setup();
    await startLevel(user);

    expect(cards()).toHaveLength(6);
    cards().forEach((card) => {
      expect(within(card).getAllByRole("radio")).toHaveLength(5);
    });
    expect(screen.getAllByRole("radio")).toHaveLength(30);
  });

  it("[모르겠어요]는 문항마다 하나씩, 언제나 맨 아래다 (A10)", async () => {
    renderDiagnosis();
    const user = userEvent.setup();
    await startLevel(user);

    cards().forEach((card) => {
      const radios = within(card).getAllByRole("radio");
      const last = radios[radios.length - 1];
      expect(within(card).getByRole("radio", { name: "모르겠어요" })).toBe(last);
    });
  });
});

describe("답 고르기와 제출 (A4·A25)", () => {
  it("제출 전에는 답을 몇 번이든 바꿀 수 있다 (A4)", async () => {
    renderDiagnosis();
    const user = userEvent.setup();
    await startLevel(user);

    const radios = within(cards()[0]).getAllByRole("radio");
    await user.click(radios[0]);
    expect(radios[0]).toBeChecked();

    await user.click(radios[2]);
    expect(radios[2]).toBeChecked();
    expect(radios[0]).not.toBeChecked();

    // 모름으로 바꿨다가 다시 보기로 되돌릴 수도 있다
    await user.click(within(cards()[0]).getByRole("radio", { name: "모르겠어요" }));
    expect(radios[2]).not.toBeChecked();
  });

  /** 라벨이 갈리던 규칙(A5)은 폐기됐다 — 제출은 언제나 결과 화면으로 간다(D10) */
  it("제출 버튼은 하나이고 라벨은 언제나 '제출하고 결과 보기 ›'다 (A25)", async () => {
    renderDiagnosis();
    const user = userEvent.setup();
    await startLevel(user, "고급(JLPT N1)"); // 어느 레벨을 고르든 같은 라벨이다

    expect(screen.getAllByRole("button", { name: /제출하고/ })).toHaveLength(1);
    expect(submitButton()).toHaveAccessibleName("제출하고 결과 보기 ›");
    expect(document.body.textContent).not.toMatch(/다음 단계로/);
  });
});

describe("제출하면 언제나 결과 화면 (A26·A7·E18)", () => {
  it("통과해도 다음 레벨 문항이 자동으로 뜨지 않는다 — 결과 화면에서 멈춘다 (A26)", async () => {
    const fetchMock = renderDiagnosis();
    const user = userEvent.setup();
    await startLevel(user);
    const callsBefore = libraryCalls(fetchMock).length;

    await submitLevel(user, { correct: true });

    expect(headline()).toBe("이 레벨은 충분해요");
    expect(screen.queryAllByRole("radio")).toHaveLength(0);
    // 제출과 결과 사이에 **로딩이 없다** — 채점이 로컬이고 부를 재료가 없다(D10)
    expect(libraryCalls(fetchMock)).toHaveLength(callsBefore);
  });

  it("미달해도 같은 자리에서 멈춘다 — 통과와 미달이 같은 모양으로 끝난다 (A26)", async () => {
    renderDiagnosis();
    const user = userEvent.setup();
    await startLevel(user, "왕초보(JLPT N5)");

    await submitLevel(user, { correct: false });

    expect(headline()).toBe("이 레벨은 아직 조금 어려워요");
    expect(screen.queryAllByRole("radio")).toHaveLength(0);
  });

  it("어느 문항이 맞고 틀렸는지가 화면 어디에도 없다 (A7)", async () => {
    renderDiagnosis();
    const user = userEvent.setup();
    await startLevel(user);
    await submitLevel(user, { correct: true });

    // 정답 표시·근거 박스·"맞은 개수"는 **DOM에 없다**(CSS로 숨기는 것이 아니다).
    // ★ 결과 표의 열 제목 `정답 수 / 문항 수`는 **판별 집계**라 예외다(09 §3-7) — "정답"이라는 낱말이 허용되는 자리는 그 하나뿐이다.
    //   (1차의 /정답/ 단언이 통과했던 것은 제출 직후 화면이 결과가 아니라 다음 단계 로딩이었기 때문이다 — 2026-09-15 정정)
    const text = document.body.textContent.replace(/정답 수 \/ 문항 수/g, "");
    expect(text).not.toMatch(/정답/);
    expect(text).not.toMatch(/오답/);
    expect(text).not.toMatch(/맞은|틀린/);
    expect(document.querySelector(".quiz-prompt")).toBeNull(); // 문항 지문·보기가 결과에 남지 않는다
    expect(document.querySelector(".quiz-verdict")).toBeNull();
    expect(document.querySelector(".quiz-evidence")).toBeNull();
  });

  it("제출 연타는 한 번만 처리한다 (E18)", async () => {
    const fetchMock = renderDiagnosis();
    const user = userEvent.setup();
    await startLevel(user);
    const callsBefore = libraryCalls(fetchMock).length;

    await answerStage(user, { correct: true });
    const submit = submitButton();
    await user.click(submit);
    await user.click(submit);

    // 결과 표에 같은 레벨이 두 행으로 서지 않는다. 재료를 다시 부르지도 않는다
    expect(resultRows()).toHaveLength(1);
    expect(libraryCalls(fetchMock)).toHaveLength(callsBefore);
  });
});

describe("결과 화면 — 한 판 (A29·A27·A32)", () => {
  it("캡션이 방금 친 레벨을 말하고, 헤드라인이 판정을 말한다 (A29)", async () => {
    renderDiagnosis();
    const user = userEvent.setup();
    await startLevel(user, "중상급(JLPT N2)");
    await submitLevel(user, { correct: true });

    expect(screen.getByText("진단 결과 · 중상급(JLPT N2)")).toBeInTheDocument();
    expect(headline()).toBe("이 레벨은 충분해요");
    expect(screen.getByText("다음 레벨에 도전해 볼까요?")).toBeInTheDocument();
  });

  it("행이 하나뿐인 첫 판에서도 표를 그린다 — 근거는 언제나 같은 자리다 (A32)", async () => {
    renderDiagnosis();
    const user = userEvent.setup();
    await startLevel(user, "중상급(JLPT N2)");
    await submitLevel(user, { correct: true });

    // 3열 — 레벨 / `정답 수 / 문항 수`(한 칸) / 판정. 판정 낱말은 `통과` / `—` 다(D12 · §14-3)
    expect(resultRows()).toEqual([["JLPT N2", "6 / 6", "통과"]]);
    expect(screen.getByRole("row", { name: /JLPT N2/ })).toBeInTheDocument();
  });

  it("추천 한 줄과 '저장되지 않아요' 한 줄이 따라온다", async () => {
    renderDiagnosis();
    const user = userEvent.setup();
    await startLevel(user, "중상급(JLPT N2)");
    await submitLevel(user, { correct: true });

    // N2를 통과했으니 그 위 = N1 코스다(D14). 코스명·레벨명은 API 값이다
    expect(screen.getByText("지금 시작한다면 고급(JLPT N1) 코스가 좋아요.")).toBeInTheDocument();
    expect(
      screen.getByText("지금까지 친 레벨 기록은 저장되지 않아요. 새로고침하면 사라져요."),
    ).toBeInTheDocument();
  });

  /** 통과선은 만들어진 문항 수에서 나온다 — 6문항이면 4개가 통과선이다(A27) */
  it("6문항 중 4문항을 맞히면 통과다 (A27)", async () => {
    renderDiagnosis();
    const user = userEvent.setup();
    await startLevel(user, "중급(JLPT N3)");

    await answerStage(user, { correct: true });
    for (const card of cards().slice(4)) {
      await user.click(within(card).getByRole("radio", { name: "모르겠어요" }));
    }
    await user.click(submitButton());

    expect(headline()).toBe("이 레벨은 충분해요");
    expect(resultRows()).toEqual([["JLPT N3", "4 / 6", "통과"]]);
  });
});
