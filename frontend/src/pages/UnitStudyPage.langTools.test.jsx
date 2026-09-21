// senior-dev 작성 (2026-09-21) — **학습 도구(확인 문제·음성)는 일본어에만 켜진다**: 양방향 대칭 고정.
// 근거: 설계/05 §16-1 · 설계/06 §11-9 · 설계/08 C-14(2026-08-25 판정 A-H2 — 문서가 이겨 영어에서 도구를 뺐다).
//
// **왜 이 파일이 따로 생겼나 — 기존 두 파일이 못 막는 구멍 둘**(08 C-11: 겹치는 것은 여기서 다시 고정하지 않는다)
//   · 영어 스텝 바에 [확인 문제] 칩이 없다 → `UnitStudyPage.stepOrder.test.jsx`(칩 순서의 단일 기준)가 이미 고정한다.
//   · 영어 화면에 `.tts-btn`이 0개 · [느리게]가 없다 → `EnUnitStudy.test.jsx`가 ja 음성을 켠 환경에서 이미 고정한다.
//   ① 그런데 **일본어 쪽을 보는 테스트가 없다.** `TtsControls.test.jsx`는 컴포넌트를 직접 렌더할 뿐이라,
//      누가 `UnitStudyPage`에서 `TtsButton`·`TtsPlayAllButton`·`TtsRateChip` 호출을 통째로 지워도
//      **세 파일이 전부 초록**이다 — "영어에 없다"는 단언은 **"전부 없애기"로도 통과**한다. 그 구멍을 여기서 닫는다.
//   ② 영어 쪽에서 아직 아무도 보지 않는 자리 둘:
//      - 회화의 [▶ 전체 재생](`TtsPlayAllButton`)은 **`.tts-btn` 클래스를 달지 않는다** — 기존 선택자에 걸리지 않는 음성 진입점이다.
//      - `QuizStep`은 스텝과 무관하게 항상 마운트되고 `visible`로만 감춘다(`UnitStudyPage.jsx`) — 역할 질의는 hidden을
//        건너뛰므로 **DOM에 quiz-* 가 깔려도 칩 검사만으로는 드러나지 않는다.** 클래스로 훑어야 잡힌다.
//
// 이 테스트를 수정하지 말 것 — 계약 변경은 senior-dev 경유 (CLAUDE.md TDD 규칙 2).
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { apiError, apiSuccess, stubFetch, unitStudyPayload } from "../test/helpers.jsx";
import { enUnitStudyPayload } from "../test/apiFixtures.js";
import { AuthProvider } from "../context/AuthContext.jsx";
import { UserDataProvider } from "../context/UserDataContext.jsx";
import { UnitStudyPage } from "./UnitStudyPage.jsx";
import { resetTtsForTest } from "../components/ttsStore.js";

/** 실제 사용자 PC와 같은 조건 — ja 음성이 설치돼 있어 TTS 게이트(설계/09 §4 V11)가 열린다 */
function stubJapaneseVoice() {
  vi.stubGlobal("speechSynthesis", {
    cancel: vi.fn(),
    speak: vi.fn(),
    getVoices: () => [{ lang: "ja-JP", name: "Kyoko" }],
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
  });
}

function renderUnit({ lang, route, payload }) {
  stubFetch((url) => (url.includes("/api/users/me") ? apiError(401, "NOT_AUTHENTICATED") : apiSuccess(payload)));
  render(
    <MemoryRouter initialEntries={[route]}>
      <AuthProvider>
        <UserDataProvider>
          <Routes>
            <Route
              element={<UnitStudyPage lang={lang} />}
              path={lang === "en" ? "/en/courses/:courseId/units/:unitNo" : "/courses/:courseId/units/:unitNo"}
            />
          </Routes>
        </UserDataProvider>
      </AuthProvider>
    </MemoryRouter>,
  );
}

const renderJapanese = () =>
  renderUnit({ lang: "ja", route: "/courses/2/units/1", payload: unitStudyPayload() });
const renderEnglish = () =>
  renderUnit({ lang: "en", route: "/en/courses/101/units/1", payload: enUnitStudyPayload() });

/** 클래스 접두사로 훑는다 — hidden 요소도 포함한다(역할 질의는 hidden을 건너뛴다) */
const elementsWithClassPrefix = (prefix) =>
  [...document.querySelectorAll(`[class*="${prefix}"]`)].map((el) => el.className);

beforeEach(() => {
  window.localStorage.clear();
  resetTtsForTest();
});

describe("일본어 유닛 — 학습 도구가 실제로 켜진다 (대칭의 반대편)", () => {
  it("어휘 스텝에 재생 버튼(.tts-btn)이 붙고 상단에 [느리게]가 있다", async () => {
    stubJapaneseVoice();
    renderJapanese();
    const user = userEvent.setup();

    await user.click(await screen.findByRole("button", { name: "어휘" }));

    expect(document.querySelectorAll(".tts-btn").length).toBeGreaterThan(0);
    expect(screen.getByRole("button", { name: "느리게" })).toBeInTheDocument();
  });

  it("회화 스텝에 [전체 재생]이 있다", async () => {
    stubJapaneseVoice();
    renderJapanese();
    const user = userEvent.setup();

    await user.click(await screen.findByRole("button", { name: "회화" }));

    expect(screen.getByRole("button", { name: /전체 재생/ })).toBeInTheDocument();
  });

  it("확인 문제 스텝에 들어가면 quiz-* 요소가 나온다", async () => {
    renderJapanese();
    const user = userEvent.setup();

    await user.click(await screen.findByRole("button", { name: "확인 문제" }));

    expect(elementsWithClassPrefix("quiz-").length).toBeGreaterThan(0);
  });
});

describe("영어 유닛 — 같은 컴포넌트인데 도구가 하나도 없다 (05 §16-1 · 06 §11-9 · 08 C-14)", () => {
  it("스텝 바의 칩을 전부 눌러 봐도 quiz-* 요소가 0개다 — 감춰진 채 깔려 있어도, 칩이 새로 생겨도 안 된다", async () => {
    stubJapaneseVoice();
    renderEnglish();
    const user = userEvent.setup();

    // 스텝 목록을 여기 적지 않고 **화면에 있는 칩을 그대로 순회**한다(칩 순서·구성의 기준은 stepOrder 테스트다).
    // 누가 영어에 확인 문제 스텝을 되살리면 그 칩도 이 순회에 들어와 눌리고, 그 순간 quiz-card가 드러난다.
    const summaryChip = await screen.findByRole("button", { name: "정리" });
    const chipNames = [...summaryChip.parentElement.querySelectorAll("button")].map((b) => b.textContent.trim());
    expect(chipNames.length).toBeGreaterThan(1);

    for (const name of chipNames) {
      await user.click(screen.getByRole("button", { name }));
      expect(elementsWithClassPrefix("quiz-")).toEqual([]);
    }
  });

  it("회화 스텝에 [전체 재생]이 없다 — .tts-btn 선택자에 걸리지 않는 음성 진입점이다", async () => {
    stubJapaneseVoice();
    renderEnglish();
    const user = userEvent.setup();

    await user.click(await screen.findByRole("button", { name: "회화" }));

    expect(screen.queryByRole("button", { name: /전체 재생/ })).not.toBeInTheDocument();
  });
});
