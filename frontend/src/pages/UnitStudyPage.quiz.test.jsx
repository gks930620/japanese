import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { beforeEach, describe, expect, it } from "vitest";
import { apiError, apiSuccess, stubFetch, unitStudyPayload } from "../test/helpers.jsx";
import { AuthProvider } from "../context/AuthContext.jsx";
import { UserDataProvider } from "../context/UserDataContext.jsx";
import { readGuestProgress } from "../lib/guestStore.js";
import { UnitStudyPage } from "./UnitStudyPage.jsx";

/**
 * 유닛 확인 문제 스텝 (설계/05 §15-1 · 기획 Q1·Q2·Q22 — TDD Red, senior-dev 작성)
 *
 * 확인 문제의 stepKey는 "quiz"다(서버 무변경 — 형식 검증만 있다).
 * 스텝 **순서**(어휘 → 확인 문제 → 정리)는 여기서 단언하지 않는다 — `UnitStudyPage.stepOrder.test.jsx` 한 곳이 고정한다(08 C-11, 2026-09-03 결정 D-3).
 * 진행 상태는 컴포넌트 state — 스텝을 오가도 유지, 유닛을 벗어나면 소멸(저장하지 않는다 — 판정 ②).
 *
 * 이 테스트를 수정하지 말 것 — 계약 변경은 senior-dev 경유.
 */

/** 4지선다를 만들 수 있게 한자 4자·어휘 4개를 채운 유닛 */
const PAYLOAD = unitStudyPayload({
  courseId: 2,
  unitNo: 4,
  kanjis: [
    { id: 1, letter: "人", meaningKo: "사람 인", onyomi: "ジン", kunyomi: "ひと", words: [] },
    { id: 2, letter: "山", meaningKo: "메 산", onyomi: "サン", kunyomi: "やま", words: [] },
    { id: 3, letter: "川", meaningKo: "내 천", onyomi: "セン", kunyomi: "かわ", words: [] },
    { id: 4, letter: "水", meaningKo: "물 수", onyomi: "スイ", kunyomi: "みず", words: [] },
  ],
  vocabularies: [
    { id: 11, word: "学生", kana: "がくせい", meaningKo: "학생", partOfSpeech: "NOUN" },
    { id: 12, word: "先生", kana: "せんせい", meaningKo: "선생님", partOfSpeech: "NOUN" },
    { id: 13, word: "会社", kana: "かいしゃ", meaningKo: "회사", partOfSpeech: "NOUN" },
    { id: 14, word: "電車", kana: "でんしゃ", meaningKo: "전철", partOfSpeech: "NOUN" },
  ],
});

function renderUnit() {
  stubFetch((url) =>
    url.includes("/api/users/me") ? apiError(401, "NOT_AUTHENTICATED") : apiSuccess(PAYLOAD),
  );
  render(
    <MemoryRouter initialEntries={["/courses/2/units/4"]}>
      <AuthProvider>
        <UserDataProvider>
          <Routes>
            <Route element={<UnitStudyPage />} path="/courses/:courseId/units/:unitNo" />
          </Routes>
        </UserDataProvider>
      </AuthProvider>
    </MemoryRouter>,
  );
}

beforeEach(() => {
  window.localStorage.clear();
});

describe("확인 문제 스텝 (Q1·Q2)", () => {
  it("스텝 바에 [확인 문제] 칩이 있고 자유롭게 이동할 수 있다 (Q1)", async () => {
    renderUnit();
    const user = userEvent.setup();

    const chip = await screen.findByRole("button", { name: "확인 문제" });
    await user.click(chip);

    // 칩으로 들어가면 시작 화면 — 몇 번째 스텝인지는 stepOrder.test가 본다
    expect(await screen.findByRole("button", { name: "문제 풀기" })).toBeInTheDocument();
  });

  it("스텝에 들어가면 문제가 아니라 시작 화면이 먼저다 (Q2)", async () => {
    renderUnit();
    const user = userEvent.setup();
    await user.click(await screen.findByRole("button", { name: "확인 문제" }));

    // 시작 화면: 범위·문항 수 안내 + [문제 풀기]. 보기 버튼은 아직 없다
    expect(screen.getByRole("button", { name: "문제 풀기" })).toBeInTheDocument();
    expect(screen.queryByText(/1 \/ \d+/)).not.toBeInTheDocument();
  });

  it("실제 문항 수가 시작 화면에 보인다 (Q3 — 재료만큼만)", async () => {
    renderUnit();
    const user = userEvent.setup();
    await user.click(await screen.findByRole("button", { name: "확인 문제" }));

    // 이 유닛의 재료로 만들 수 있는 문항 수가 숫자로 보인다 (10을 하드코딩하면 거짓이 된다)
    expect(screen.getByText(/\d+문제/)).toBeInTheDocument();
  });
});

describe("진행 유지 (Q22)", () => {
  it("문제를 풀다 다른 스텝에 다녀와도 진행이 그대로다", async () => {
    renderUnit();
    const user = userEvent.setup();
    await user.click(await screen.findByRole("button", { name: "확인 문제" }));
    await user.click(screen.getByRole("button", { name: "문제 풀기" }));

    // 1번 문제의 보기 하나를 골라 채점까지 한다
    const options = await screen.findAllByRole("button", { name: /보기/ });
    await user.click(options[0]);

    // 다른 스텝에 다녀온다
    await user.click(screen.getByRole("button", { name: "정리" }));
    await user.click(screen.getByRole("button", { name: "확인 문제" }));

    // 시작 화면이 아니라 풀던 문제 상태로 돌아온다
    expect(screen.queryByRole("button", { name: "문제 풀기" })).not.toBeInTheDocument();
  });
});

describe("마지막 위치 (stepKey 계약)", () => {
  it("확인 문제 스텝에 들어가면 마지막 위치가 stepKey 'quiz'로 저장된다", async () => {
    renderUnit();
    const user = userEvent.setup();
    await user.click(await screen.findByRole("button", { name: "확인 문제" }));

    await waitFor(() => {
      expect(readGuestProgress().lastPosition?.stepKey).toBe("quiz");
    });
  });
});
