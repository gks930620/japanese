// 진단 화면 테스트 하네스 — **DOM 계약과 재료 픽스처를 한 곳에만** 둔다 (설계/09 §3-7).
//
// 계약: 레벨 선택 = `<fieldset class="diag-levels">` 안의 라디오 · 문항 카드 = `<fieldset class="diag-question" role="radiogroup">`(2026-09-20, 09 §3-7) ·
//       지문 = `.quiz-prompt` · 보기 = 한 문항당 같은 `name`을 가진 `<input type="radio">` 5개(마지막이 [모르겠어요]) ·
//       갈래 머리글 = `<h2 class="diag-group-title">` · 제출 = 버튼 1개.
// 여섯 개의 진단 화면 테스트가 같은 조작·같은 재료를 쓰므로, 계약이 바뀌면 고칠 곳도 여기 하나여야 한다.
//
// ★ 2026-09-14 개편(한 레벨 = 한 판): `passEveryStage`가 사라졌다 —
//   통과해도 다음 레벨로 자동 전환되지 않으므로 "결과가 나올 때까지 계속 제출한다"는 조작이 성립하지 않는다.
import { render, screen, within } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { apiError, apiSuccess, stubFetch } from "./helpers.jsx";
import {
  coursesFixture,
  grammarListItemFixture,
  libraryPageFixture,
  vocabularyEntryFixture,
} from "./apiFixtures.js";
import { DiagnosisPage } from "../pages/DiagnosisPage.jsx";

export const DONT_KNOW = "모르겠어요";

/**
 * 지문 번호와 보기 번호가 짝지어진 재료 — 무작위 출제에도 정답을 특정할 수 있다.
 * 어휘는 `word === kana`라 N2·N1의 읽기 문항에도 그대로 쓰인다(정답이 kana다).
 */
export const DIAG_VOCAB = libraryPageFixture(
  Array.from({ length: 8 }, (_, i) =>
    vocabularyEntryFixture({ id: 100 + i, word: `たんご${i + 1}`, kana: `たんご${i + 1}`, meanings: [`뜻${i + 1}`] }),
  ),
);
/** 예문에 표현이 실제로 들어 있다 — N2·N1의 빈칸 문항이 성립한다(09 §1-2) */
export const DIAG_GRAMMAR = libraryPageFixture(
  Array.from({ length: 8 }, (_, i) =>
    grammarListItemFixture({
      id: 300 + i,
      name: `〜ぶんぽう${i + 1}`,
      nameKo: `문법뜻${i + 1}`,
      examples: [{ jp: `これは ぶんぽう${i + 1}です。`, meaningKo: `예문뜻${i + 1}` }],
    }),
  ),
);
export const DIAG_EMPTY = libraryPageFixture([]);

/**
 * 진단 화면을 띄운다.
 * @param {object[]} [courses] GET /api/courses 의 data
 * @param {object} [coursesResponse] 코스 목록 응답 자체를 갈아끼운다(호출 실패 시나리오 — E11)
 * @param {(url: string, level: string) => object|null} [library] 자료실 응답을 가로챈다(null이면 정상 재료)
 */
export function renderDiagnosis({ courses = coursesFixture(), coursesResponse = null, library = () => null } = {}) {
  const fetchMock = stubFetch((url) => {
    if (url.includes("/api/users/me")) return apiError(401, "NOT_AUTHENTICATED");
    if (url.includes("/api/courses")) return coursesResponse ?? apiSuccess(courses);
    if (url.includes("/api/library/")) {
      const level = new URL(url, "http://x").searchParams.get("level");
      return library(url, level) ?? apiSuccess(url.includes("/grammar") ? DIAG_GRAMMAR : DIAG_VOCAB);
    }
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

export const libraryCalls = (fetchMock) =>
  fetchMock.mock.calls.map(([url]) => decodeURIComponent(String(url))).filter((url) => url.includes("/api/library/"));

/**
 * 한 화면의 문항 카드들 — 계약은 `role="radiogroup"`이다(09 §3-7, 2026-09-20).
 * 역할 자체는 `DiagnosisPage.unanswered.test.jsx`가 고정한다(08 C-11) — 여기서는 그 계약을 그대로 쓴다.
 * (3차 구현 중 잠시 두었던 `group` 갈래는 Green 확인 뒤 2026-09-20 제거했다 — 두 계약이 공존하면 어느 쪽이 깨졌는지 알 수 없다.)
 */
export function diagnosisCards() {
  return screen.getAllByRole("radiogroup");
}

/** 갈래 머리글 문구 — 화면에 선 순서 그대로 */
export function groupTitles() {
  return screen.queryAllByRole("heading", { level: 2 }).map((node) => node.textContent.trim());
}

/** 보기의 문구 = 접근 가능한 이름. label(감싸든 for=든)에서 온다 */
export function choiceLabel(radio) {
  return (radio.labels?.[0]?.textContent ?? radio.getAttribute("aria-label") ?? "").trim();
}

/**
 * 카드에서 **보기를 뺀 글자**(번호·지문·kana 줄·질문).
 * 정답을 특정하려면 지문 쪽 번호가 필요한데, 보기까지 섞어 읽으면 번호가 다섯 개가 된다.
 */
function promptText(card) {
  const clone = card.cloneNode(true);
  clone.querySelectorAll("label, input").forEach((node) => node.remove());
  return clone.textContent ?? "";
}

/**
 * 정답 보기 — 픽스처가 지문과 보기를 **같은 번호**로 짝지어 두었다는 약속에 기댄다
 * (たんご3 ↔ 뜻3 / 〜ぶんぽう3 ↔ 문법뜻3 / これは ぶんぽう3です。↔ 예문뜻3).
 * 지문의 **마지막 숫자**를 쓰는 이유: 카드 머리의 문항 번호(1~6)가 앞에 오기 때문이다.
 */
export function correctRadio(card) {
  const numbers = promptText(card).match(/\d+/g) ?? [];
  const number = numbers[numbers.length - 1];
  const radios = within(card).getAllByRole("radio");
  const matched = radios.find((radio) => new RegExp(`${number}$`).test(choiceLabel(radio)));
  if (!matched) throw new Error(`정답 보기를 찾지 못했다 (번호 ${number}): ${radios.map(choiceLabel).join(" / ")}`);
  return matched;
}

export function dontKnowRadio(card) {
  return within(card).getByRole("radio", { name: DONT_KNOW });
}

/** 한 문항에 답한다 — correct=false면 정답도 모름도 아닌 보기를 고른다 */
export async function answerCard(user, card, { correct = true } = {}) {
  if (correct) {
    await user.click(correctRadio(card));
    return;
  }
  const right = correctRadio(card);
  const dontKnow = dontKnowRadio(card);
  const wrong = within(card)
    .getAllByRole("radio")
    .find((radio) => radio !== right && radio !== dontKnow);
  await user.click(wrong);
}

/** 한 레벨의 문항을 모두 고른다 */
export async function answerStage(user, { correct = true } = {}) {
  for (const card of diagnosisCards()) {
    await answerCard(user, card, { correct });
  }
}

export function submitButton() {
  return screen.getByRole("button", { name: /제출하고/ });
}

/* ── 3차 개편(2026-09-16 기획 D19~D25) — 미응답 필수. 문구는 여기 한 곳에만 둔다 ── */

/** 제출 버튼 **위** 남은 수 줄 — 미응답이 1개 이상이면 시도 전에도 보인다. 0이면 줄이 통째로 없다(09 §3-6) */
export const remainingText = (n) => `아직 ${n}문항을 고르지 않았어요 — 모두 고르면 제출할 수 있어요.`;
/** 미응답 문항 **안** 안내 줄 — 제출을 시도한 뒤, 그 문항이 미응답인 동안만(09 §3-6) */
export const PICK_LINE = "답을 골라 주세요 — 모르면 [모르겠어요]를 고르면 돼요.";

/** 남은 수 줄(있으면). 개수까지 맞추려면 `getByText(remainingText(n))`을 쓴다 */
export function remainingLine() {
  return screen.queryByText(/아직 \d+문항을 고르지 않았어요/);
}

/** 화면 전체의 안내 줄들 — 시도 전에는 0개여야 한다 */
export function pickLines() {
  return screen.queryAllByText(PICK_LINE);
}

/** 한 문항 안의 안내 줄(없으면 null) */
export function pickLineIn(card) {
  return within(card).queryByText(PICK_LINE);
}

/** 지정한 문항(0부터)만 답한다 — 나머지는 미응답으로 남긴다 */
export async function answerCards(user, indexes, { correct = true } = {}) {
  const cards = diagnosisCards();
  for (const index of indexes) {
    await answerCard(user, cards[index], { correct });
  }
}

/**
 * 레벨 고르기 화면에서 [시작하기]를 누른다. **문항 화면을 기다리지 않는다** —
 * 재료 실패(실패 카드)를 보는 테스트가 있기 때문이다.
 * @param {string} [level] 고를 보기의 문구(`{title}({levelLabel})`). 생략하면 **기본 선택값 그대로**(A22)
 */
export async function beginLevel(user, level = null) {
  const startButton = await screen.findByRole("button", { name: "시작하기" });
  if (level) await user.click(screen.getByRole("radio", { name: level }));
  await user.click(startButton);
}

/** 레벨을 골라 시작하고 문항 화면이 뜰 때까지 기다린다 */
export async function startLevel(user, level = null) {
  await beginLevel(user, level);
  await screen.findByRole("button", { name: /제출하고/ });
}

/** 문항을 전부 고르고 제출한다 — correct=true면 만점(통과), false면 0점(미달) */
export async function submitLevel(user, { correct = true } = {}) {
  await answerStage(user, { correct });
  await user.click(submitButton());
}

/** 결과 표의 본문 행 — `[레벨, 정답 수 / 문항 수, 판정]` */
export function resultRows() {
  return screen
    .getAllByRole("row")
    .slice(1) // 머리글 행
    .map((row) =>
      [...row.querySelectorAll("th, td")].map((cell) => cell.textContent.replace(/\s+/g, " ").trim()),
    );
}
