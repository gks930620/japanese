// senior-dev 작성 (2026-09-21 결함 2) — **부분 공개 코스의 "열린 데까지의 끝"** 계약.
//
// ── 무엇이 문제였나 ──────────────────────────────────────────────────
// `UnitStudyPage.jsx`는 `nextUnitNo == null`을 **코스 완주**로 읽었다. 그런데 E1은 15유닛 계획 중
// 5유닛만 열려 있어 유닛 5의 응답도 `nextUnitNo: null`이다 → 정리 스텝에 "🎉 … 끝까지 봤어요!"가 떴다.
// 같은 코스의 상세 화면은 정반대로 "앞 유닛부터 순서대로 채우는 중이에요"라고 말한다 —
// 한 학습자가 두 화면에서 **모순된 안내**를 받았다(기획 §5-5의 의도는 완주가 아니라 "열린 데까지의 끝",
// 예외 E-4 "거짓 안내를 만들지 않는다" 위반). 유닛 10·15에서도 그대로 재발한다.
//
// ── 계약 판정 (senior-dev, 설계/04 §2-3 · 설계/08 D-6) ─────────────────
// 서버 응답만으로는 두 상태를 구분할 수 없다 — 둘 다 `nextUnitNo: null`이다. **응답에 필드를 더한다.**
//   `coursePlannedUnits: Integer|null` — 그 코스가 최종적으로 갖게 될 유닛 수(편집 계획값).
//   null이면 "지금 있는 유닛이 전부"다(일본어 코스 전부가 여기 해당 — 동작이 한 줄도 바뀌지 않는다).
// 화면 규칙(일반 규칙이다. 영어 전용 분기로 두지 않는다 — 일본어도 부분 공개할 수 있다):
//   moreUnitsComing = coursePlannedUnits != null && totalUnits < coursePlannedUnits
//   completedCourse = nextUnitNo == null && !moreUnitsComing
// `notice` 재사용은 기각했다: 일본어 N5(코스 2)는 20유닛이 다 차 있는데도 카드 안내 문구를 갖고 있어
// "notice가 있으면 부분 공개"가 곧바로 거짓이 된다(설계/08 D-6).
//
// ── 문구 확정 (2026-09-21 planner) ───────────────────────────────────
// 처음 이 파일은 자리(`.more-units-coming`)와 "완주라고 말하지 않는다"만 고정하고 문구는 비워 뒀다.
// planner가 확정했으므로 이제 **글자 그대로** 고정한다 — 문구가 곧 이 화면의 기능이기 때문이다
// (같은 학습자가 코스 상세에서는 "채우는 중", 유닛 끝에서는 "끝까지 봤어요"를 들은 것이 결함 2였다).
// 끝은 세 종류이고 말도 셋이다(설계/05 §8):
//   상태 1 완주 + 다음 코스 열림 → "…로 바로 이어갈 수 있어요."            (기존 그대로)
//   상태 2 열린 데까지의 끝      → PARTIAL_END_NOTICE + [유닛 목록으로 ›]   (이번 신설)
//   상태 3 완주 + 다음 코스 준비중 → 기존 두 문장 **그대로** + LIBRARY_FALLBACK 한 문장 추가
// 상태 3에 문장을 "덧붙이기만" 하는 이유: 앞 두 문장은 EnUnitStudy.test.jsx·UnitStudyPage.test.jsx가
// 정규식으로 이미 고정하고 있다. 문장을 고쳐 쓰면 그 테스트들이 함께 깨지고, 그것은 문구 변경이 아니라
// **계약 변경**이다(그럴 이유가 planner 결정에 없다).
import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import { apiSuccess, renderAtRoute, stubFetch, unitStudyPayload } from "../test/helpers.jsx";
import { enUnitStudyPayload } from "../test/apiFixtures.js";
import { UnitStudyPage } from "./UnitStudyPage.jsx";

/**
 * 열린 데까지의 끝 안내 — planner 확정 문구(2026-09-21). 한 글자도 바꾸지 않는다.
 * 세 마디가 각각 할 일이 있다: ① 지금 자리를 알려주고 ② 왜 여기서 멈추는지 말하고 ③ 지금 할 수 있는 것을 준다.
 * ③이 없으면 학습자는 "그래서 뭘 하라고?"만 남는다(기획 §5-5).
 */
const PARTIAL_END_NOTICE =
  "여기까지가 지금 열려 있는 마지막 유닛이에요. 다음 유닛은 앞 유닛부터 순서대로 채우는 중이에요 — " +
  "그동안은 자료실에서 지금까지 배운 것을 다시 볼 수 있어요.";

/** 상태 2·3이 공유하는 마지막 한 문장 — "기다리는 동안 할 수 있는 것"이라 두 상태에 같은 말로 선다 */
const LIBRARY_FALLBACK = "그동안은 자료실에서 지금까지 배운 것을 다시 볼 수 있어요.";

/** 열린 끝의 진행 버튼 — 참인 행선지는 그 코스의 유닛 목록뿐이다(다음 코스로 내보내면 "끝났다"는 말이 된다) */
const OPEN_END_LINK_LABEL = "유닛 목록으로 ›";

/**
 * 부분 공개 코스의 **열린 끝** — 15유닛 계획 중 10유닛까지 열린 코스의 마지막 유닛에 서 있다.
 *
 * ⚠️ **2026-09-22: 이것은 더 이상 E1의 현재 모습이 아니다.** E1이 15/15로 계획을 채워
 * (`coursePlannedUnits === totalUnits`) 이 상태의 **실데이터가 저장소에서 사라졌다**(설계/08 C-30).
 * 그래도 이 픽스처를 고치지 않는다 — 픽스처의 기준은 **실제 응답의 shape**이지 그 시점의 데이터 사본이 아니고
 * (08 C-9), 판정 규칙(`coursePlannedUnits != null && totalUnits < coursePlannedUnits`)은 **언어·코스와 무관한
 * 일반 규칙**이라 다음 부분 공개(E2 등)에서 그대로 다시 쓰인다. 여기서 id 101을 쓰는 것은
 * 실제 응답의 배선(코스 id ↔ 라우트 ↔ nextCourse)을 그대로 두기 위해서다.
 *
 * ★ 이 화면 규칙을 **실데이터로** 태우는 백엔드 테스트는 지금 없다 — 그 자리와 복구 조건은
 *   `EnglishCourseApiIntegrationTest`의 "부분 공개 코스" 주석 블록에 적혀 있다.
 */
function partialEndPayload(overrides = {}) {
  return enUnitStudyPayload({
    unitNo: 10,
    totalUnits: 10,
    coursePlannedUnits: 15,
    prevUnitNo: 9,
    nextUnitNo: null,
    nextCourse: { id: 102, title: "일상 말하기", levelLabel: "E2", status: "PREPARING" },
    ...overrides,
  });
}

function renderEn(payload) {
  stubFetch(() => apiSuccess(payload));
  return renderAtRoute(<UnitStudyPage lang="en" />, {
    path: "/en/courses/:courseId/units/:unitNo",
    route: `/en/courses/101/units/${payload.unitNo}`,
  });
}

function renderJa(payload) {
  stubFetch(() => apiSuccess(payload));
  return renderAtRoute(<UnitStudyPage />, {
    path: "/courses/:courseId/units/:unitNo",
    route: `/courses/2/units/${payload.unitNo}`,
  });
}

async function goToSummary(user) {
  await user.click(await screen.findByRole("button", { name: "정리" }));
}

/** 완주를 주장하는 말 — 문구가 바뀌어도 이 세 조각 중 하나는 남는다 */
function assertNoCompletionClaim() {
  expect(screen.queryByText(/끝까지 봤어요/)).toBeNull();
  expect(screen.queryByText(/완주했어요/)).toBeNull();
  expect(screen.queryByText(/바로 이어갈 수 있어요/)).toBeNull();
  expect(screen.queryByText(/지금 준비하고 있어요/)).toBeNull();
}

describe("열린 데까지의 끝 — coursePlannedUnits (기획 §5-5 · 예외 E-4)", () => {
  it("열린 유닛이 계획 수에 못 미치면 완주 축하를 띄우지 않는다", async () => {
    const user = userEvent.setup();
    renderEn(partialEndPayload());
    await goToSummary(user);

    expect(screen.getByText("이번 유닛에서 배운 것")).toBeInTheDocument(); // 정리 스텝에 서 있다
    assertNoCompletionClaim();
  });

  it("대신 '여기가 지금 열린 데까지의 끝'이라고 planner 확정 문구 그대로 말한다", async () => {
    const user = userEvent.setup();
    renderEn(partialEndPayload());
    await goToSummary(user);

    const band = document.querySelector(".more-units-coming");
    expect(band, "부분 공개 코스의 마지막 열린 유닛에는 안내 자리가 있어야 한다").not.toBeNull();
    // 공백만 흡수하고 글자는 그대로 본다 — JSX 줄바꿈·들여쓰기는 문구가 아니다
    expect(band.textContent.replace(/\s+/g, " ").trim()).toBe(PARTIAL_END_NOTICE);
  });

  it("마지막 열린 유닛이 아니면 그 안내를 띄우지 않는다", async () => {
    const user = userEvent.setup();
    renderEn(partialEndPayload({ unitNo: 3, totalUnits: 10, prevUnitNo: 2, nextUnitNo: 4, nextCourse: null }));
    await goToSummary(user);

    expect(document.querySelector(".more-units-coming")).toBeNull();
  });

  // 2026-09-22: E1이 실제로 여기 도달했다(15/15). 이 케이스만 실데이터와 같은 상태이고,
  // 위의 "열린 데까지의 끝"은 이제 가상의 상태다 — 규칙은 그대로이므로 둘 다 남긴다.
  it("계획 수를 채우면 그때 완주 축하가 뜬다", async () => {
    const user = userEvent.setup();
    renderEn(
      partialEndPayload({
        unitNo: 15,
        totalUnits: 15,
        coursePlannedUnits: 15,
        prevUnitNo: 14,
        nextUnitNo: null,
      }),
    );
    await goToSummary(user);

    expect(screen.getByText(/끝까지 봤어요/)).toBeInTheDocument();
    expect(document.querySelector(".more-units-coming")).toBeNull();
  });

  it("coursePlannedUnits가 null이면 지금 동작 그대로다 — 일본어 코스는 마지막 유닛에서 완주다", async () => {
    const user = userEvent.setup();
    renderJa(
      unitStudyPayload({
        unitNo: 20,
        totalUnits: 20,
        coursePlannedUnits: null,
        prevUnitNo: 19,
        nextUnitNo: null,
        nextCourse: { id: 3, title: "초급", levelLabel: "JLPT N4", status: "AVAILABLE" },
      }),
    );
    await goToSummary(user);

    expect(screen.getByText(/끝까지 봤어요/)).toBeInTheDocument();
    expect(document.querySelector(".more-units-coming")).toBeNull();
  });

  /**
   * 진행 버튼도 같은 거짓말을 한다 — 부분 공개 코스에서 [다음 코스 … 시작하기]로 내보내면
   * "이 코스는 끝났다"고 말하는 것과 같다. 열린 끝에서는 **그 코스의 유닛 목록**으로 돌려보낸다
   * (남은 열린 유닛을 다시 볼 수 있는 유일하게 참인 행선지다). 버튼 문구는 planner 결정.
   */
  it("부분 공개 코스의 열린 끝에서는 다음 코스로 내보내지 않는다", async () => {
    const user = userEvent.setup();
    renderEn(
      partialEndPayload({ nextCourse: { id: 102, title: "일상 말하기", levelLabel: "E2", status: "AVAILABLE" } }),
    );
    await goToSummary(user);

    const navLinks = [...document.querySelectorAll(".unit-nav a")];
    expect(navLinks.map((a) => a.getAttribute("href"))).toEqual(["/en/courses/101"]);
    expect(navLinks[0].textContent.replace(/\s+/g, " ").trim()).toBe(OPEN_END_LINK_LABEL);
  });
});

/**
 * 상태 3 — **완주는 맞는데 다음 코스가 아직 없다.** 여기는 거짓 안내가 아니라 **막다른 길**이 문제였다:
 * "다음 코스는 준비하고 있어요"로 끝나면 학습자가 지금 할 수 있는 일이 하나도 남지 않는다.
 * planner 확정은 **문장 추가**다 — 앞 두 문장은 손대지 않는다(EnUnitStudy.test.jsx가 이미 고정하고 있고,
 * 고쳐 쓰면 문구 변경이 아니라 계약 변경이 된다).
 */
describe("완주했지만 다음 코스가 준비중일 때 (상태 3)", () => {
  /** 계획 15유닛을 다 채운 E1 — 이때는 완주가 맞다. 다만 E2가 아직 준비중이다. (2026-09-22부터 실제 상태다) */
  const finishedPayload = () =>
    partialEndPayload({
      unitNo: 15,
      totalUnits: 15,
      coursePlannedUnits: 15,
      prevUnitNo: 14,
      nextUnitNo: null,
      nextCourse: { id: 102, title: "일상 말하기", levelLabel: "E2", status: "PREPARING" },
    });

  it("기존 두 문장은 글자 그대로 남는다", async () => {
    const user = userEvent.setup();
    renderEn(finishedPayload());
    await goToSummary(user);

    expect(screen.getByText(/끝까지 봤어요/)).toBeInTheDocument();
    expect(screen.getByText(/일상 말하기는 지금 준비하고 있어요/)).toBeInTheDocument();
  });

  it("그 뒤에 '자료실에서 다시 볼 수 있어요' 한 문장이 붙는다", async () => {
    const user = userEvent.setup();
    renderEn(finishedPayload());
    await goToSummary(user);

    expect(screen.getByText(new RegExp(LIBRARY_FALLBACK))).toBeInTheDocument();
    // 열린 끝 안내(상태 2)와 동시에 뜨지 않는다 — 같은 문장을 두 번 말하는 화면이 되면 안 된다
    expect(document.querySelector(".more-units-coming")).toBeNull();
  });

  it("다음 코스가 열려 있으면 그 문장은 붙지 않는다 — 기다릴 이유가 없다", async () => {
    const user = userEvent.setup();
    renderEn({
      ...finishedPayload(),
      nextCourse: { id: 102, title: "일상 말하기", levelLabel: "E2", status: "AVAILABLE" },
    });
    await goToSummary(user);

    expect(screen.getByText(/일상 말하기로 바로 이어갈 수 있어요/)).toBeInTheDocument();
    expect(screen.queryByText(new RegExp(LIBRARY_FALLBACK))).toBeNull();
  });
});
