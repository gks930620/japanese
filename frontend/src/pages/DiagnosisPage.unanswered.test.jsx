import { screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { apiSuccess } from "../test/helpers.jsx";
import {
  DIAG_EMPTY,
  PICK_LINE,
  answerCard,
  answerCards,
  answerStage,
  diagnosisCards,
  dontKnowRadio,
  libraryCalls,
  pickLineIn,
  pickLines,
  remainingLine,
  remainingText,
  renderDiagnosis,
  resultRows,
  startLevel,
  submitButton,
} from "../test/diagnosisHelpers.jsx";

/**
 * 실력 진단 — **미응답이 있으면 제출되지 않는다** (설계/09 §3-6 · §3-7 — TDD Red, senior-dev 2026-09-20, 3차 개편)
 *
 * 기획 `진행사항/기획_2026-09_진단개편.md` §21~§30 / 인수 조건 **A48~A56** + 예외 **E26·E27·E28·E29**.
 * 1차의 A6("안 고른 문항이 있어도 제출된다")·E17("전부 미응답 → 0점")은 `DiagnosisPage.test.jsx`에서 **지웠다**
 * (덮어쓰지 않았다 — 두 벌이 공존하면 사고가 난다, 08 C-11).
 *
 * 규칙은 두 문장이다: **누르면 먼저 미응답을 센다 / 있으면 제출하지 않고 첫 미응답 문항으로 데려간다.**
 * ★ 잠금 순서가 규칙이다(D23): `누름 → 미응답 검사 → (있음) 이동·표시, 가드 안 켬 / (없음) 가드 켬 → 채점 → 전환`.
 *   가드가 검사보다 먼저 켜지면 **막힌 첫 클릭이 그 다음 정상 제출을 막는다** — 그 순서를 고정하는 곳은 이 파일 하나다(A54).
 *
 * DOM 계약(09 §3-7 — 3차 추가분. 05 §15-2 · 화면정의 §4-2 ⑤·⑥ · §4-4와 같다):
 *  · 문항 카드는 `<fieldset class="diag-question" role="radiogroup">` — ARIA 1.2에서 `aria-invalid`가 허용되는 역할이다(기본 `group`은 아니다).
 *  · 남은 수 줄: 미응답 1개 이상이면 **시도 전에도** `아직 {n}문항을 고르지 않았어요 — 모두 고르면 제출할 수 있어요.`(`.quiz-note`), 0이면 없다.
 *    제출 버튼이 이 줄을 `aria-describedby`로 가리킨다 — 줄이 없으면 **속성도 없다**(없는 id를 가리키지 않는다).
 *  · 안내 줄: 제출을 시도한 뒤 미응답 문항 **안**, `<legend>` **바로 다음 자식** `.diag-question-help`(`.quiz-note`가 아니다)에
 *    `답을 골라 주세요 — 모르면 [모르겠어요]를 고르면 돼요.` 시도 전·답한 뒤에는 DOM에 없다.
 *  · 미응답 카드는 `aria-invalid="true"` + `aria-describedby="{안내 줄 id}"`. 답하면 요소·속성을 **함께 뗀다**(`"false"`로 바꾸지 않는다).
 *  · 막히면 fieldset을 `scrollIntoView({ block: "start" })`(`behavior` 없음 — 킷의 reduced-motion 처리를 우회하지 않는다),
 *    초점은 **첫 미응답 문항의 첫 라디오**에 `focus({ preventScroll: true })` — 화살표로 바로 고를 수 있어야 한다(D25).
 *  · `disabled`는 어디에도 없다. 확인 모달도 없다. `모름으로 처리`라는 문구도 없다.
 *
 * 이 테스트를 수정하지 말 것 — 계약 변경은 senior-dev 경유.
 */

const cards = diagnosisCards;
const headline = () => document.querySelector(".diag-headline");
const firstRadio = (card) => within(card).getAllByRole("radio")[0];

/** 3문항짜리 판 — 입문 어휘가 0건이면 문법 2 + 문장 1만 남는다(E29 · material 파일과 같은 재료) */
const threeQuestionRound = (url, level) =>
  level === "INTRO" && url.includes("/vocabulary") ? apiSuccess(DIAG_EMPTY) : null;

describe("남은 수 줄 (A51 · Q14)", () => {
  it("미응답이 1개 이상이면 시도 전에도 남은 수를 말하고, 0이면 줄이 통째로 없다 (A51)", async () => {
    renderDiagnosis();
    const user = userEvent.setup();
    await startLevel(user, "왕초보(JLPT N5)");

    expect(screen.getByText(remainingText(6))).toBeInTheDocument();

    await answerCards(user, [0]);
    expect(screen.getByText(remainingText(5))).toBeInTheDocument();

    await answerStage(user, { correct: true });
    expect(remainingLine()).toBeNull();
  });

  it("'모름으로 처리'라는 문구는 화면 어디에도 없다 — 그대로 제출되지 않으므로 거짓이다 (A51)", async () => {
    renderDiagnosis();
    const user = userEvent.setup();
    await startLevel(user, "왕초보(JLPT N5)");

    expect(document.body.textContent).not.toMatch(/모름으로 처리/);
    await user.click(submitButton()); // 막힌 뒤에도
    expect(document.body.textContent).not.toMatch(/모름으로 처리/);
  });
});

describe("미응답인 채로 누르면 제출되지 않는다 (A48 · A49 · E26)", () => {
  it("결과 화면이 나오지 않고 문항 화면이 그대로 남는다 — 이어서 다 채우면 행은 하나, 정답 수는 최종 답 기준 (A48)", async () => {
    renderDiagnosis();
    const user = userEvent.setup();
    await startLevel(user, "왕초보(JLPT N5)");

    // 앞 셋은 오답으로 두고 뒤 셋은 비운 채 누른다
    await answerCards(user, [0, 1, 2], { correct: false });
    await user.click(submitButton());

    // 판 기록·채점·추천 어느 것도 일어나지 않는다 — 결과 화면의 흔적이 없고 확인 모달도 없다
    expect(headline()).toBeNull();
    expect(screen.queryByRole("table")).toBeNull();
    expect(screen.queryByRole("dialog")).toBeNull();
    expect(screen.getAllByRole("radio")).toHaveLength(30);

    // 막힌 뒤 앞 셋을 정답으로 바꾸고 뒤 셋을 채워 제출하면 **최종 답**으로 채점된다
    await answerStage(user, { correct: true });
    await user.click(submitButton());

    expect(headline()).toHaveTextContent("이 레벨은 충분해요");
    expect(resultRows()).toEqual([["JLPT N5", "6 / 6", "통과"]]);
  });

  it("번호가 가장 작은 미응답 문항으로 가서 그 첫 보기에 초점이 놓이고, 그 문항 안에 안내 한 줄이 보인다 (A49)", async () => {
    renderDiagnosis();
    const user = userEvent.setup();
    await startLevel(user, "왕초보(JLPT N5)");

    // 2번·4번이 미응답(기획 §24-2의 예)
    await answerCards(user, [0, 2, 4, 5]);
    await user.click(submitButton());

    expect(headline()).toBeNull();
    expect(firstRadio(cards()[1])).toHaveFocus();
    expect(pickLineIn(cards()[1])).toBeInTheDocument();
    // 답한 문항에는 붙지 않는다
    expect(pickLineIn(cards()[0])).toBeNull();
    expect(pickLineIn(cards()[2])).toBeNull();
  });

  it("한 문항도 고르지 않고 누르면 1번 문항으로 가고, 6문항 전부에 안내가 붙고, 남은 수는 6이다 (E26)", async () => {
    renderDiagnosis();
    const user = userEvent.setup();
    await startLevel(user, "왕초보(JLPT N5)");

    await user.click(submitButton());

    expect(headline()).toBeNull();
    expect(firstRadio(cards()[0])).toHaveFocus();
    expect(pickLines()).toHaveLength(6);
    expect(screen.getByText(remainingText(6))).toBeInTheDocument();
  });
});

describe("안내 줄은 시도한 뒤에만, 미응답 전부에, 고르면 즉시 사라진다 (A50 · E28)", () => {
  it("제출을 시도하기 전에는 어느 문항에도 안내 줄이 없다 — DOM에 없다 (A50)", async () => {
    renderDiagnosis();
    const user = userEvent.setup();
    await startLevel(user, "왕초보(JLPT N5)");

    expect(pickLines()).toHaveLength(0);
    await answerCards(user, [0]);
    expect(pickLines()).toHaveLength(0);
  });

  it("시도 뒤에는 미응답 전부에 붙고, 답을 고르면 그 문항의 줄만 즉시 사라진다 (A50)", async () => {
    renderDiagnosis();
    const user = userEvent.setup();
    await startLevel(user, "왕초보(JLPT N5)");

    await answerCards(user, [0, 2, 4, 5]);
    await user.click(submitButton());

    expect(pickLines()).toHaveLength(2);
    expect(pickLineIn(cards()[1])).toBeInTheDocument();
    expect(pickLineIn(cards()[3])).toBeInTheDocument();

    // 2번에 답하면 2번 줄만 사라진다 — 4번은 남는다
    await answerCard(user, cards()[1]);
    expect(pickLineIn(cards()[1])).toBeNull();
    expect(pickLineIn(cards()[3])).toBeInTheDocument();
    expect(pickLines()).toHaveLength(1);

    // [모르겠어요]도 답이다 — 4번을 모름으로 고르면 마지막 줄도 사라진다
    await user.click(dontKnowRadio(cards()[3]));
    expect(pickLines()).toHaveLength(0);
  });

  it("일부만 채우고 다시 누르면 남은 것 중 첫 미응답으로 간다 (E28)", async () => {
    renderDiagnosis();
    const user = userEvent.setup();
    await startLevel(user, "왕초보(JLPT N5)");

    await answerCards(user, [0, 2, 4, 5]);
    await user.click(submitButton());
    await answerCard(user, cards()[1]);
    await user.click(submitButton());

    expect(headline()).toBeNull();
    expect(firstRadio(cards()[3])).toHaveFocus();
    expect(pickLines()).toHaveLength(1);
    expect(screen.getByText(remainingText(1))).toBeInTheDocument();
  });
});

describe("다음 판은 '시도 전'으로 시작한다 (A50 — 판 사이 초기화)", () => {
  /**
   * 시도 여부는 **한 판의 상태**다. 앞 판에서 막힌 적이 있다고 다음 판 문항이 처음부터 빨간 줄을 달고 시작하면,
   * 아직 아무것도 누르지 않은 사람에게 "네가 빠뜨렸다"고 말하는 셈이다(A50의 "시도 전에는 없다"와 정면으로 어긋난다).
   * 이 단언이 없으면 판 사이 초기화가 빠져도 아무 테스트도 깨지지 않는다.
   */
  it("앞 판에서 막혔어도 이어서 시작한 판에는 안내 줄이 하나도 없다", async () => {
    renderDiagnosis();
    const user = userEvent.setup();
    await startLevel(user, "왕초보(JLPT N5)");

    await user.click(submitButton()); // 막힘 — 여섯 줄이 붙는다
    expect(pickLines()).toHaveLength(6);

    await answerStage(user, { correct: true });
    await user.click(submitButton());
    await user.click(screen.getByRole("button", { name: "JLPT N4 도전하기 ›" }));
    await screen.findByRole("button", { name: /제출하고/ });

    expect(pickLines()).toHaveLength(0);
    // 남은 수 줄은 시도와 무관하게 처음부터 있다(A51)
    expect(screen.getByText(remainingText(6))).toBeInTheDocument();
  });
});

describe("[모르겠어요]는 답이다 (A52)", () => {
  it("[모르겠어요]를 고른 문항은 남은 수에서 빠진다", async () => {
    renderDiagnosis();
    const user = userEvent.setup();
    await startLevel(user, "왕초보(JLPT N5)");

    await user.click(dontKnowRadio(cards()[0]));
    expect(screen.getByText(remainingText(5))).toBeInTheDocument();
  });

  it("6문항 전부 [모르겠어요]면 미응답 0으로 제출되어 0 / 6 미달 결과가 나온다", async () => {
    renderDiagnosis();
    const user = userEvent.setup();
    await startLevel(user, "왕초보(JLPT N5)");

    for (const card of cards()) {
      await user.click(dontKnowRadio(card));
    }
    expect(remainingLine()).toBeNull();

    await user.click(submitButton());

    expect(headline()).toHaveTextContent("이 레벨은 아직 조금 어려워요");
    expect(resultRows()).toEqual([["JLPT N5", "0 / 6", "—"]]);
    // 모름 개수를 따로 세어 보여주지 않는다(A11 유효분)
    expect(document.body.textContent).not.toMatch(/모름/);
  });
});

describe("막혀도 잠기지 않는다 (A53 · A54 · E27)", () => {
  it("막힌 뒤에도 버튼·보기가 살아 있고 disabled가 없다 — 이미 고른 답을 바꿀 수 있고 남은 수는 그대로 (A53)", async () => {
    renderDiagnosis();
    const user = userEvent.setup();
    await startLevel(user, "왕초보(JLPT N5)");

    await answerCards(user, [0, 2, 4, 5]);
    await user.click(submitButton());

    expect(submitButton()).toBeInTheDocument();
    expect(submitButton()).not.toBeDisabled();
    expect(document.querySelectorAll("[disabled]")).toHaveLength(0);
    screen.getAllByRole("radio").forEach((radio) => expect(radio).not.toBeDisabled());

    // 이미 답한 1번을 다른 보기로 바꾼다(A4) — 미응답 수는 변하지 않는다
    await answerCard(user, cards()[0], { correct: false });
    expect(screen.getByText(remainingText(2))).toBeInTheDocument();
  });

  it("막힌 뒤 남은 문항을 다 고르고 다시 누르면 그대로 제출된다 — 막힌 클릭이 다음 제출을 막지 않는다 (A54 ★)", async () => {
    renderDiagnosis();
    const user = userEvent.setup();
    await startLevel(user, "왕초보(JLPT N5)");

    await answerCards(user, [0, 1, 2]);
    await user.click(submitButton()); // 막힘 — 여기서 가드가 켜지면 아래 제출이 죽는다
    await answerCards(user, [3, 4, 5]);
    await user.click(submitButton()); // 딱 한 번

    expect(headline()).toHaveTextContent("이 레벨은 충분해요");
    expect(resultRows()).toEqual([["JLPT N5", "6 / 6", "통과"]]);
  });

  it("막힌 상태에서 여러 번 눌러도 매번 첫 미응답으로 갈 뿐 다른 일이 없다 (E27)", async () => {
    const fetchMock = renderDiagnosis();
    const user = userEvent.setup();
    await startLevel(user, "왕초보(JLPT N5)");
    const callsBefore = libraryCalls(fetchMock).length;

    await answerCards(user, [0, 2, 4, 5]);
    for (let i = 0; i < 3; i += 1) {
      await user.click(submitButton());
      expect(firstRadio(cards()[1])).toHaveFocus();
    }

    expect(headline()).toBeNull();
    expect(screen.queryByRole("table")).toBeNull();
    expect(pickLines()).toHaveLength(2);
    expect(libraryCalls(fetchMock)).toHaveLength(callsBefore);

    // 연타 뒤에도 정상 제출은 한 번에 된다 — 행은 하나
    await answerCards(user, [1, 3]);
    await user.click(submitButton());
    expect(resultRows()).toHaveLength(1);
  });
});

describe("접근성 (A55)", () => {
  it("제출 버튼의 접근 가능한 설명이 남은 수 줄이다 — 줄이 없으면 설명도 비어 있다", async () => {
    renderDiagnosis();
    const user = userEvent.setup();
    await startLevel(user, "왕초보(JLPT N5)");

    expect(submitButton()).toHaveAccessibleDescription(remainingText(6));
    await answerCards(user, [0]);
    expect(submitButton()).toHaveAccessibleDescription(remainingText(5));

    await answerStage(user, { correct: true });
    expect(submitButton()).toHaveAccessibleDescription("");
    // 줄이 요소째 사라지므로 속성도 함께 뗀다 — 없는 id를 가리키는 aria-describedby를 남기지 않는다(화면정의 §4-3 함정 6)
    expect(submitButton()).not.toHaveAttribute("aria-describedby");
  });

  it("미응답 문항 카드는 오류 상태이고 안내 줄이 그 설명이다 — 답하면 둘 다 풀린다", async () => {
    renderDiagnosis();
    const user = userEvent.setup();
    await startLevel(user, "왕초보(JLPT N5)");

    await answerCards(user, [0, 2, 4, 5]);
    // 시도 전에는 어느 카드도 오류 상태가 아니다 — 속성 자체가 없다
    cards().forEach((card) => expect(card).not.toHaveAttribute("aria-invalid"));

    await user.click(submitButton());

    expect(cards()[1]).toHaveAttribute("aria-invalid", "true");
    expect(cards()[1]).toHaveAccessibleDescription(PICK_LINE);
    expect(cards()[3]).toHaveAttribute("aria-invalid", "true");
    expect(cards()[0]).not.toHaveAttribute("aria-invalid");
    expect(cards()[0]).not.toHaveAttribute("aria-describedby");

    // 답하면 "false"로 바꾸는 게 아니라 속성을 뗀다 — 안내 줄과 1:1(화면정의 §4-3 함정 6)
    await answerCard(user, cards()[1]);
    expect(cards()[1]).not.toHaveAttribute("aria-invalid");
    expect(cards()[1]).not.toHaveAttribute("aria-describedby");
    expect(cards()[1]).toHaveAccessibleDescription("");
  });

  it("키보드만으로: 버튼에서 Enter → 막힘 → 초점이 그 문항의 보기에 있어 화살표로 바로 고른다", async () => {
    renderDiagnosis();
    const user = userEvent.setup();
    await startLevel(user, "왕초보(JLPT N5)");

    await answerCards(user, [0, 2, 4, 5]);
    submitButton().focus();
    await user.keyboard("{Enter}");

    const radios = within(cards()[1]).getAllByRole("radio");
    expect(radios[0]).toHaveFocus();

    // Tab으로 6장을 거슬러 오르지 않는다 — 화살표 한 번이 곧 답이다
    await user.keyboard("{ArrowDown}");
    expect(radios.some((radio) => radio.checked)).toBe(true);
    expect(pickLineIn(cards()[1])).toBeNull();
    expect(screen.getByText(remainingText(1))).toBeInTheDocument();
  });
});

describe("3~5문항 판도 전부 답해야 제출된다 (A56 · E29)", () => {
  it("3문항 판에서 2개만 답하면 막히고, 남은 하나를 채우면 제출된다", async () => {
    renderDiagnosis({ library: threeQuestionRound });
    const user = userEvent.setup();
    await startLevel(user);
    expect(cards()).toHaveLength(3);

    await answerCards(user, [0, 1]);
    expect(screen.getByText(remainingText(1))).toBeInTheDocument();
    await user.click(submitButton());

    expect(headline()).toBeNull();
    expect(firstRadio(cards()[2])).toHaveFocus();
    expect(pickLines()).toHaveLength(1);
    expect(pickLineIn(cards()[2])).toBeInTheDocument();

    await answerCard(user, cards()[2]);
    await user.click(submitButton());

    expect(resultRows()).toEqual([["문자", "3 / 3", "통과"]]);
  });
});

describe("DOM 계약 — 요소·속성·이동 호출 (09 §3-7 · 05 §15-2 · 화면정의 §4-2 ⑤·⑥ · §4-4)", () => {
  it("문항 카드는 role=radiogroup인 fieldset.diag-question이다 — aria-invalid가 허용되는 역할, 이름은 여전히 legend", async () => {
    renderDiagnosis();
    const user = userEvent.setup();
    await startLevel(user, "왕초보(JLPT N5)");

    const radiogroups = screen.getAllByRole("radiogroup");
    expect(radiogroups).toHaveLength(6);
    radiogroups.forEach((card) => {
      expect(card.tagName).toBe("FIELDSET");
      expect(card).toHaveClass("diag-question");
      // 역할을 바꿔도 번호·질문은 legend에서 읽힌다(HTML-AAM은 요소 기준이다)
      expect(card).toHaveAccessibleName(/^\d+\. /);
    });
  });

  it("안내 줄은 .diag-question-help이고 legend 바로 다음 자식이다 — .quiz-note가 아니고, 카드의 aria-describedby가 그 id다", async () => {
    renderDiagnosis();
    const user = userEvent.setup();
    await startLevel(user, "왕초보(JLPT N5)");

    await answerCards(user, [0, 2, 4, 5]);
    await user.click(submitButton());

    const card = cards()[1];
    const help = card.querySelector(":scope > .diag-question-help");
    expect(help).not.toBeNull();
    expect(help).toHaveTextContent(PICK_LINE);
    expect(card.querySelector("legend").nextElementSibling).toBe(help);
    expect(help).not.toHaveClass("quiz-note");
    expect(help.id).not.toBe("");
    expect(card.getAttribute("aria-describedby")).toBe(help.id);
    // 답한 문항에는 요소 자체가 없다(숨긴 것이 아니다)
    expect(cards()[0].querySelector(".diag-question-help")).toBeNull();
  });

  it("이동은 fieldset의 scrollIntoView({ block: 'start' }) + 첫 라디오의 focus({ preventScroll: true })다 — smooth 없음", async () => {
    renderDiagnosis();
    const user = userEvent.setup();
    await startLevel(user, "왕초보(JLPT N5)");
    await answerCards(user, [0, 2, 4, 5]);

    // jsdom에는 scrollIntoView가 없다(setup.js가 noop 폴리필) — 누가·무엇으로 불렀는지만 기록한다
    const scrollCalls = [];
    vi.spyOn(Element.prototype, "scrollIntoView").mockImplementation(function scrollIntoView(options) {
      scrollCalls.push([this, options]);
    });
    const focusCalls = [];
    const nativeFocus = HTMLElement.prototype.focus;
    vi.spyOn(HTMLElement.prototype, "focus").mockImplementation(function focus(options) {
      focusCalls.push([this, options]);
      return nativeFocus.call(this, options);
    });

    await user.click(submitButton());

    const target = cards()[1];
    const scrolled = scrollCalls.filter(([node]) => node === target);
    expect(scrolled).toHaveLength(1);
    // behavior를 넘기지 않는다 — 넘기면 킷 base.css의 prefers-reduced-motion 처리를 우회한다(화면정의 §4-3 함정 5)
    expect(scrolled[0][1]).toEqual({ block: "start" });
    // 스크롤은 fieldset에만 — 라디오를 따로 스크롤하면 안내 줄이 위로 밀린다
    expect(scrollCalls.filter(([node]) => node !== target)).toHaveLength(0);

    const radio = within(target).getAllByRole("radio")[0];
    const focused = focusCalls.filter(([node]) => node === radio);
    expect(focused).toHaveLength(1);
    expect(focused[0][1]).toEqual({ preventScroll: true });
    expect(radio).toHaveFocus();
  });
});
