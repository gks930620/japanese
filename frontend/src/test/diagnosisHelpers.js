// 진단 단계 화면을 조작하는 테스트 헬퍼 — **DOM 계약을 한 곳에만** 둔다 (설계/09 §3-7).
//
// 계약: 문항 카드 = `<fieldset>`(role=group) · 지문 = `.quiz-prompt` ·
//       보기 = 한 문항당 같은 `name`을 가진 `<input type="radio">` 5개(마지막이 [모르겠어요]).
// 세 개의 진단 화면 테스트가 같은 조작을 하므로, 계약이 바뀌면 고칠 곳도 여기 하나여야 한다.
import { screen, within } from "@testing-library/react";

export const DONT_KNOW = "모르겠어요";

/** 한 화면의 문항 카드들 */
export function diagnosisCards() {
  return screen.getAllByRole("group");
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

/** 한 단계의 6문항을 모두 고른다 */
export async function answerStage(user, { correct = true } = {}) {
  for (const card of diagnosisCards()) {
    await answerCard(user, card, { correct });
  }
}

export function submitButton() {
  return screen.getByRole("button", { name: /제출하고/ });
}

/** 결과 화면이 나올 때까지 모든 단계를 만점으로 통과시킨다 */
export async function passEveryStage(user, maxStages = 8) {
  for (let stage = 0; stage < maxStages; stage += 1) {
    if (screen.queryByText(/부터 시작하세요/)) return;
    const submit = await screen.findByRole("button", { name: /제출하고/ });
    await answerStage(user, { correct: true });
    await user.click(submit);
  }
  await screen.findByText(/부터 시작하세요/);
}
