// frontend-dev 작성 — 영어 유닛 학습 (설계/05 §16).
// 일본어 유닛과 갈리는 지점만 본다: 한자 자리가 표현 · 확인 문제/음성 없음 · 발음 2줄 · 영어 경로.
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { apiError, apiSuccess, stubFetch } from "../test/helpers.jsx";
import { enUnitStudyPayload } from "../test/apiFixtures.js";
import { AuthProvider } from "../context/AuthContext.jsx";
import { UserDataProvider } from "../context/UserDataContext.jsx";
import { UnitStudyPage } from "./UnitStudyPage.jsx";
import { resetTtsForTest } from "../components/ttsStore.js";

/** 실제 사용자 PC와 같은 조건 — ja 음성이 설치돼 있어 TTS 게이트(V11)가 열린다 */
function stubJapaneseVoice() {
  vi.stubGlobal("speechSynthesis", {
    cancel: vi.fn(),
    speak: vi.fn(),
    getVoices: () => [{ lang: "ja-JP", name: "Kyoko" }],
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
  });
}

function renderUnit(payload = enUnitStudyPayload()) {
  const fetchMock = stubFetch((url) => {
    if (url.includes("/api/users/me")) return apiError(401, "NOT_AUTHENTICATED");
    if (url.includes("/api/en/courses/")) return apiSuccess(payload);
    return apiSuccess(null);
  });
  render(
    <MemoryRouter initialEntries={["/en/courses/101/units/1"]}>
      <AuthProvider>
        <UserDataProvider>
          <Routes>
            <Route element={<UnitStudyPage lang="en" />} path="/en/courses/:courseId/units/:unitNo" />
          </Routes>
        </UserDataProvider>
      </AuthProvider>
    </MemoryRouter>,
  );
  return fetchMock;
}

beforeEach(() => {
  window.localStorage.clear();
  resetTtsForTest();
});

describe("영어 유닛 학습 — 스텝 구성", () => {
  it("영어 유닛 API로 묻는다", async () => {
    const fetchMock = renderUnit();

    await screen.findByRole("button", { name: "표현" });
    expect(fetchMock.mock.calls.some(([url]) => String(url).includes("/api/en/courses/101/units/1"))).toBe(true);
  });

  /**
   * ★ 2026-08-25 판정(감사 A-H2 · 근거 설계/08 C-14) — **영어 유닛에는 확인 문제 스텝이 없다.**
   *
   * 이 자리의 옛 테스트는 정반대("확인 문제 스텝은 일본어처럼 마지막에 있다")를 단언해 구현을 고정했다.
   * 그런데 설계/05 §16-1("영어 화면에는 `.quiz-*`·`.tts-*` 요소가 하나도 없다")·설계/06 §11-9(범위 밖)와
   * **정면으로 충돌**했고, 같은 파일 `UnitStudyPage.jsx:498-499`의 코드 주석마저 "확인 문제·음성·편집·★ 없음"이라고
   * 적혀 있었다 — 코드 안에서도 의도와 구현이 갈려 있었다. 판정은 **문서가 이겼다.**
   *
   * 이 테스트를 수정하지 말 것 — 계약 변경은 senior-dev 경유.
   */
  it("한자 자리에 표현이 들어가고, 확인 문제 스텝은 없다 (§0-2 · 08 C-14)", async () => {
    renderUnit();

    expect(await screen.findByRole("button", { name: "표현" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "한자" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "확인 문제" })).not.toBeInTheDocument();
    // 문법 · 회화 · 표현 · 어휘 · 정리 — 다섯이 영어 유닛의 전부다
    expect(screen.getByText(/스텝 1 \/ 5/)).toBeInTheDocument();
  });

  it("표현이 0개면 표현 스텝을 만들지 않는다 — 안내도 없다", async () => {
    renderUnit(enUnitStudyPayload({ expressions: [] }));

    await screen.findByRole("button", { name: "어휘" });
    expect(screen.queryByRole("button", { name: "표현" })).not.toBeInTheDocument();
    expect(screen.queryByText(/표현이 없|표현 없음/)).not.toBeInTheDocument();
  });

  it("유닛 목록으로 돌아가는 링크가 영어 코스 상세다", async () => {
    renderUnit();

    const back = await screen.findByRole("link", { name: /유닛 목록/ });
    expect(back.getAttribute("href")).toBe("/en/courses/101");
  });

  /**
   * ★ 옛 테스트는 **음성이 없는 환경**(jsdom 기본)에서 `.tts-btn`이 0개인 것만 봤다 —
   * 게이트(V11)가 꺼 준 것을 "영어에 음성이 없다"로 오독한 것이다. 실제 사용자 PC에는 ja 음성이 있고,
   * 그 환경에서는 확인 문제 결과 화면에 재생 버튼 10개와 속도 칩이 나왔다(감사 A-H2 재현).
   * 그래서 **게이트를 열어 놓고** 전 스텝을 돌며 확인한다.
   */
  it("ja 음성이 설치된 환경에서도 음성 버튼·속도 칩이 하나도 없다 (§0-2)", async () => {
    stubJapaneseVoice();
    renderUnit();
    const user = userEvent.setup();

    await screen.findByRole("button", { name: "표현" });
    for (const label of ["문법", "회화", "표현", "어휘", "정리"]) {
      await user.click(screen.getByRole("button", { name: label }));
      expect(document.querySelectorAll(".tts-btn")).toHaveLength(0);
      expect(screen.queryByRole("button", { name: "느리게" })).not.toBeInTheDocument();
    }
    // 마지막 스텝(정리)을 지나도 확인 문제로 이어지지 않는다 — 스텝이 거기서 끝난다
    expect(screen.queryByRole("button", { name: "확인 문제" })).not.toBeInTheDocument();
  });
});

describe("표현 스텝 (§3-2)", () => {
  it("표현 카드가 표제·발음·뜻·용법·예문을 보여준다", async () => {
    renderUnit();
    const user = userEvent.setup();

    await user.click(await screen.findByRole("button", { name: "표현" }));

    expect(screen.getByText("get up")).toBeInTheDocument();
    expect(screen.getByText("/ɡet ʌp/ · 겟 업")).toBeInTheDocument();
    expect(screen.getByText("잠자리에서 일어나다")).toBeInTheDocument();
    expect(screen.getByText(/아침에 몸을 일으키는/)).toBeInTheDocument();
    expect(screen.getByText("I get up at seven every morning.")).toBeInTheDocument();
  });

  it("발음·용법·예문이 없으면 그 줄을 만들지 않는다 — 빈 블록 금지", async () => {
    renderUnit();
    const user = userEvent.setup();

    await user.click(await screen.findByRole("button", { name: "표현" }));

    const cards = document.querySelectorAll(".expr-card");
    const second = cards[1];
    expect(within(second).getByText("look for")).toBeInTheDocument();
    expect(second.querySelector(".expr-pron")).toBeNull();
    expect(second.querySelector(".expr-note")).toBeNull();
    expect(second.querySelector(".expr-example")).toBeNull();
  });
});

describe("어휘 스텝 (§3-3)", () => {
  it("읽기 열 자리에 발음 2줄이 들어가고, 열은 3열 그대로다", async () => {
    renderUnit();
    const user = userEvent.setup();

    await user.click(await screen.findByRole("button", { name: "어휘" }));

    expect(screen.getByRole("columnheader", { name: "발음" })).toBeInTheDocument();
    expect(screen.queryByRole("columnheader", { name: "읽기" })).not.toBeInTheDocument();
    expect(screen.getByText("/ˈæpəl/")).toBeInTheDocument();
    expect(screen.getByText("애플")).toBeInTheDocument();
    expect(screen.getByText("─")).toBeInTheDocument();
  });

  it("단어 링크는 영어 자료실 검색이다", async () => {
    renderUnit();
    const user = userEvent.setup();

    await user.click(await screen.findByRole("button", { name: "어휘" }));

    expect(screen.getByRole("link", { name: /apple/ }).getAttribute("href")).toBe(
      "/en/library/vocabulary?q=apple",
    );
  });
});

describe("정리 스텝 (§3-4)", () => {
  it("표현은 개수로만 적는다 — 이름을 나열하지 않는다", async () => {
    renderUnit();
    const user = userEvent.setup();

    await user.click(await screen.findByRole("button", { name: "정리" }));

    const rows = [...document.querySelectorAll(".summary-row")].map((row) => row.textContent);
    expect(rows.some((text) => text.includes("표현") && text.includes("2개"))).toBe(true);
    expect(rows.every((text) => !text.includes("한자"))).toBe(true);
  });
});

/**
 * ★ 여기 있던 "확인 문제 스텝 (영어 재료)" 2건을 **삭제했다** (2026-08-25 판정 A-H2 · 08 C-14).
 *
 * 두 테스트는 영어 확인 문제의 **범위 문장**과 **오답 풀 경로**를 고정했다 — 즉 "영어 퀴즈가 있다"를 전제로
 * 그 품질을 다듬는 테스트였다. 판정으로 그 전제가 사라졌으므로 남겨 두면 **삭제된 기능을 되살리라는 요구**가 된다.
 *
 * 영어 퀴즈를 켜는 이터레이션이 오면 이 두 요구는 되살릴 값어치가 있다. 그때의 **선행 조건**을 여기 적어 둔다:
 *   ① `QuizRunner`가 `latin`을 받아 `.jp` 조판과 `.tts-*`(재생 버튼·속도 칩)를 끈다
 *   ② `QuizRunner`의 `Evidence`에 `EXPRESSION_*` 분기를 넣는다 — 지금 넣으면 빈 회색 상자가 3~4문항 나온다(감사 A-M1)
 *   ③ 영어 음성은 ja 보이스가 아니라 en 보이스로 읽어야 한다(`speechTextOf`는 지금 원문을 ja 엔진에 넘긴다)
 * 셋 중 하나라도 없이 켜면 **이번 감사가 잡은 상태로 되돌아간다.**
 */

/**
 * 완주 안내의 조사 (2026-08-25 판정 A-L5) — 규칙은 `lib/josa.test.js`가 고정한다(C-11).
 * 여기서는 **화면이 그 규칙을 실제로 쓰는가**만 본다. 실측 문구: "다음 코스 일상 말하기은 지금 준비하고 있어요."
 */
describe("코스 완주 안내 (A-L5)", () => {
  const lastUnit = (nextCourse) =>
    enUnitStudyPayload({ unitNo: 2, prevUnitNo: 1, nextUnitNo: null, nextCourse });

  it("받침 없는 코스명에는 '는'이 붙는다", async () => {
    renderUnit(lastUnit({ id: 102, title: "일상 말하기", levelLabel: "E2", status: "PREPARING" }));
    const user = userEvent.setup();

    await user.click(await screen.findByRole("button", { name: "정리" }));

    expect(screen.getByText(/일상 말하기는 지금 준비하고 있어요/)).toBeInTheDocument();
    expect(screen.queryByText(/말하기은/)).not.toBeInTheDocument();
  });

  it("받침 있는 코스명에는 '은'이 붙는다", async () => {
    renderUnit(lastUnit({ id: 105, title: "실전과 격식", levelLabel: "E5", status: "PREPARING" }));
    const user = userEvent.setup();

    await user.click(await screen.findByRole("button", { name: "정리" }));

    expect(screen.getByText(/실전과 격식은 지금 준비하고 있어요/)).toBeInTheDocument();
  });

  it("이어지는 코스 안내의 '로/으로'도 같은 규칙을 쓴다", async () => {
    renderUnit(lastUnit({ id: 102, title: "일상 말하기", levelLabel: "E2", status: "AVAILABLE" }));
    const user = userEvent.setup();

    await user.click(await screen.findByRole("button", { name: "정리" }));

    expect(screen.getByText(/일상 말하기로 바로 이어갈 수 있어요/)).toBeInTheDocument();
  });
});
