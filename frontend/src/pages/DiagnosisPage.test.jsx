import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { describe, expect, it } from "vitest";
import { apiError, apiSuccess, stubFetch } from "../test/helpers.jsx";
import {
  coursesFixture,
  grammarListItemFixture,
  libraryPageFixture,
  vocabularyEntryFixture,
} from "../test/apiFixtures.js";
import { answerStage, diagnosisCards, submitButton } from "../test/diagnosisHelpers.js";
import { DiagnosisPage } from "./DiagnosisPage.jsx";

/**
 * 실력 진단 화면 — **레벨 1장, 6문항, 한 번 제출** (설계/09 §3 · 05 §15-2 — TDD Red, senior-dev 2026-09-10)
 *
 * 기획 `진행사항/기획_2026-09_진단개편.md` / 인수 조건 **A1·A2·A3·A4·A5·A6·A7·A8·A19** + 예외 **E6·E7**.
 * 계단·문항 생성·채점 규칙은 `lib/diagnosis.test.js`가 고정한다 — 이 파일은 **화면 동작**만 본다(08 C-11).
 *
 * ★ 이 화면의 DOM 계약(09 §3-7): 문항 카드 = `<fieldset>`(role=group) · 지문 = `.quiz-prompt` ·
 *   보기 = 한 문항당 같은 `name`을 가진 `<input type="radio">` 5개 · 제출 = 버튼 1개.
 *   라디오인 이유는 **제출 전에 답을 바꿀 수 있어야** 하기 때문이다(A4) — 즉시 채점 퀴즈의 버튼과 성격이 다르다.
 *
 * 이 테스트를 수정하지 말 것 — 계약 변경은 senior-dev 경유.
 */

const COURSES = coursesFixture();

/** 번호가 짝지어진 재료 — 지문의 번호와 같은 번호의 보기가 정답이다(무작위 출제에도 흔들리지 않는다) */
const VOCAB = libraryPageFixture(
  Array.from({ length: 8 }, (_, i) =>
    vocabularyEntryFixture({ id: 100 + i, word: `たんご${i + 1}`, kana: `たんご${i + 1}`, meanings: [`뜻${i + 1}`] }),
  ),
);
const GRAMMAR = libraryPageFixture(
  Array.from({ length: 8 }, (_, i) =>
    grammarListItemFixture({
      id: 300 + i,
      name: `〜ぶんぽう${i + 1}`,
      nameKo: `문법뜻${i + 1}`,
      examples: [{ jp: `これは ぶんぽう${i + 1}です。`, meaningKo: `예문뜻${i + 1}` }],
    }),
  ),
);

function renderPage(courses = COURSES) {
  const fetchMock = stubFetch((url) => {
    if (url.includes("/api/users/me")) return apiError(401, "NOT_AUTHENTICATED");
    if (url.includes("/api/courses")) return apiSuccess(courses);
    if (url.includes("/api/library/grammar")) return apiSuccess(GRAMMAR);
    if (url.includes("/api/library/vocabulary")) return apiSuccess(VOCAB);
    return apiSuccess(null);
  });

  render(
    <MemoryRouter initialEntries={["/diagnosis"]}>
      <Routes>
        <Route element={<DiagnosisPage />} path="/diagnosis" />
      </Routes>
    </MemoryRouter>,
  );
  return fetchMock;
}

const cards = diagnosisCards;

async function start(user) {
  await user.click(await screen.findByRole("button", { name: "시작하기" }));
  await screen.findByRole("button", { name: /제출하고/ });
}

describe("시작 화면 (A1)", () => {
  it("레벨당 문항 수·한 화면 제출·최대 단계 수를 말한다 — '3분'은 없다", async () => {
    renderPage();

    expect(await screen.findByRole("button", { name: "시작하기" })).toBeInTheDocument();
    const text = document.body.textContent;
    expect(text).toMatch(/6문항/);
    expect(text).toMatch(/한 화면/);
    expect(text).toMatch(/모르겠어요/); // 첫 문항에서 처음 보면 "눌러도 되나"를 망설인다
    expect(text).toMatch(/저장되지 않아요/);
    // 최대 36문항이 될 수 있어 "3분"은 거짓말이 된다
    expect(text).not.toMatch(/3분/);
    expect(screen.queryAllByRole("radio")).toHaveLength(0);
  });

  // 최대 단계 수가 **계산값**이라는 규칙은 `DiagnosisPage.stagecount.test.jsx` 하나가 고정한다(08 C-11).
});

describe("단계 화면 (A2·A3·A9·A10)", () => {
  it("첫 단계는 입문이고 진행 줄이 레벨과 문항 수를 말한다", async () => {
    renderPage();
    const user = userEvent.setup();
    await start(user);

    // 입문 코스의 levelLabel은 "문자"다 — 문자열을 잘라 만든 값이 아니다
    expect(document.body.textContent).toMatch(/문자 단계 · 6문항/);
    // 전체 분모("5 / 36")는 쓰지 않는다 — 총 문항이 가변이라 거짓 약속이 된다(05 §15-2)
    expect(document.body.textContent).not.toMatch(/\/\s*36/);
  });

  it("문항 6개가 한 화면에 동시에 있고, 문항마다 보기가 5개다", async () => {
    renderPage();
    const user = userEvent.setup();
    await start(user);

    expect(cards()).toHaveLength(6);
    cards().forEach((card) => {
      expect(within(card).getAllByRole("radio")).toHaveLength(5);
    });
    expect(screen.getAllByRole("radio")).toHaveLength(30);
  });

  it("[모르겠어요]는 문항마다 하나씩, 언제나 맨 아래다", async () => {
    renderPage();
    const user = userEvent.setup();
    await start(user);

    cards().forEach((card) => {
      const radios = within(card).getAllByRole("radio");
      const last = radios[radios.length - 1];
      expect(within(card).getByRole("radio", { name: "모르겠어요" })).toBe(last);
    });
  });
});

describe("답 고르기와 제출 (A4·A5·A6)", () => {
  it("제출 전에는 답을 몇 번이든 바꿀 수 있다", async () => {
    renderPage();
    const user = userEvent.setup();
    await start(user);

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

  it("미응답이 있으면 그 개수를 한 줄로 말하고, 0이면 그 줄이 사라진다", async () => {
    renderPage();
    const user = userEvent.setup();
    await start(user);

    expect(screen.getByText(/아직 6문항을 고르지 않았어요/)).toBeInTheDocument();
    expect(document.body.textContent).toMatch(/모름으로 처리/);

    await user.click(within(cards()[0]).getAllByRole("radio")[0]);
    expect(screen.getByText(/아직 5문항을 고르지 않았어요/)).toBeInTheDocument();

    await answerStage(user, { correct: true });
    expect(screen.queryByText(/고르지 않았어요/)).not.toBeInTheDocument();
    // 미응답이 있어도 제출은 언제나 열려 있다(D7) — 확인 모달도 없다
    expect(submitButton()).toBeEnabled();
  });

  it("제출 버튼은 하나이고, 마지막 단계에서는 라벨이 바뀐다", async () => {
    renderPage();
    const user = userEvent.setup();
    await start(user);

    expect(screen.getAllByRole("button", { name: /제출하고/ })).toHaveLength(1);
    expect(submitButton()).toHaveAccessibleName(/제출하고 다음 단계로/);
  });

  it("계단이 한 단계뿐이면 처음부터 [제출하고 결과 보기]다", async () => {
    const onlyIntro = COURSES.map((course) =>
      course.courseNo === 0 ? course : { ...course, status: "PREPARING", unitCount: 0 },
    );
    renderPage(onlyIntro);
    const user = userEvent.setup();
    await start(user);

    expect(submitButton()).toHaveAccessibleName(/제출하고 결과 보기/);
  });
});

describe("제출 결과 (A7·A8·E6·E7)", () => {
  it("4문항 이상 맞히면 다음 단계로 넘어간다 — 정오는 어디에도 없다", async () => {
    renderPage();
    const user = userEvent.setup();
    await start(user);
    await answerStage(user, { correct: true });
    await user.click(submitButton());

    expect(await screen.findByText(/JLPT N5 단계 · 6문항/)).toBeInTheDocument();
    // 정답 표시·근거 박스·맞은 개수는 **DOM에 없다**(CSS로 숨기는 것이 아니다 — A7)
    const text = document.body.textContent;
    expect(text).not.toMatch(/정답/);
    expect(text).not.toMatch(/오답/);
    expect(text).not.toMatch(/맞은/);
    expect(document.querySelector(".quiz-verdict")).toBeNull();
    expect(document.querySelector(".quiz-evidence")).toBeNull();
  });

  it("3문항 이하면 거기서 끝나고 결과 화면이 나온다 (A8)", async () => {
    renderPage();
    const user = userEvent.setup();
    await start(user);
    await answerStage(user, { correct: false });
    await user.click(submitButton());

    expect(await screen.findByText(/부터 시작하세요/)).toBeInTheDocument();
    expect(screen.queryAllByRole("radio")).toHaveLength(0);
  });

  it("한 문항도 고르지 않고 제출해도 넘어간다 — 전부 모름 = 0점 (E6)", async () => {
    renderPage();
    const user = userEvent.setup();
    await start(user);
    await user.click(submitButton());

    expect(await screen.findByText(/부터 시작하세요/)).toBeInTheDocument();
  });

  it("제출 연타는 한 번만 처리한다 (E7)", async () => {
    const fetchMock = renderPage();
    const user = userEvent.setup();
    await start(user);
    const callsBefore = fetchMock.mock.calls.filter(([url]) => String(url).includes("/api/library/")).length;

    await answerStage(user, { correct: true });
    const submit = submitButton();
    await user.click(submit);
    await user.click(submit);

    await screen.findByText(/JLPT N5 단계/);
    const callsAfter = fetchMock.mock.calls.filter(([url]) => String(url).includes("/api/library/")).length;
    // 다음 단계 재료를 두 번 부르지 않는다(부르면 6문항이 두 번 갈린다)
    expect(callsAfter - callsBefore).toBe(2); // 어휘 1 + 문법 1
  });
});

describe("결과 화면 (A19)", () => {
  it("진행한 단계만 행이 되고, 각 행이 정답 수 / 문항 수 / 판정을 보여준다", async () => {
    renderPage();
    const user = userEvent.setup();
    await start(user);
    await answerStage(user, { correct: false });
    await user.click(submitButton());
    await screen.findByText(/부터 시작하세요/);

    // 진행한 단계만 행이 된다 — 가지 않은 단계로 빈 행을 만들지 않는다(05 §15-2)
    const row = screen.getByRole("row", { name: /문자/ });
    expect(within(row).getByText(/0\s*\/\s*6/)).toBeInTheDocument();
    expect(screen.queryByRole("row", { name: /JLPT N5/ })).toBeNull();
    // 판정에 쓰지 않는 숫자(모름 개수)를 따로 만들지 않는다(D1·05 §19-6)
    expect(document.body.textContent).not.toMatch(/모름 \d/);
  });

  it("추천 코스로 가는 주 버튼과 [다시 진단하기]가 있다", async () => {
    renderPage();
    const user = userEvent.setup();
    await start(user);
    await user.click(submitButton());
    await screen.findByText(/부터 시작하세요/);

    expect(screen.getByRole("link", { name: /코스 시작하기/ }).getAttribute("href")).toMatch(/^\/courses\/\d+$/);
    expect(screen.getByRole("button", { name: "다시 진단하기" })).toBeInTheDocument();
    expect(screen.getByText(/저장되지 않아요/)).toBeInTheDocument();
  });
});
