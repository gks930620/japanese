// TDD Red — senior-dev 작성 (2026-09-03 결정 `진행사항/결정_2026-09_이어서_확인문제.md` §2 · AC-Q-1~8 · 09 §2-1)
//
// **유닛 스텝 순서와 전진 버튼은 이 파일 한 곳이 고정한다**(08 C-11). 다른 테스트는 "정리가 몇 번째인지"를 단언하지 않는다.
//
// 규칙: 문법(2~3) → 회화 → 한자(있을 때) → 어휘 → 확인 문제(일본어만) → 정리.
//   · 정리는 언제나 마지막. [다음 유닛 ›](다음 코스 / 코스 목록)는 **정리에만** 있다.
//   · 정리가 아닌 모든 스텝의 전진 버튼은 [다음 ›] 하나이고 바로 다음 스텝으로 간다 — 확인 문제 카드(풀기 전·결과)도 [다음 ›] → 정리.
//   · 세는 스텝 수("n / N"의 N) = [다음 ›]로 갈 수 있는 스텝 수. 문제 풀이는 완료 조건이 아니다.
// 예전에는 확인 문제가 정리 뒤 8번째라 [다음 ›]만으로는 영원히 도달할 수 없었다(사용자관점 점검 D-3).
//
// 이 테스트를 수정하지 말 것 — 계약 변경은 senior-dev 경유 (CLAUDE.md TDD 규칙 2).
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { beforeEach, describe, expect, it } from "vitest";
import { apiError, apiSuccess, stubFetch, unitStudyPayload } from "../test/helpers.jsx";
import { enUnitStudyPayload } from "../test/apiFixtures.js";
import { AuthProvider } from "../context/AuthContext.jsx";
import { UserDataProvider } from "../context/UserDataContext.jsx";
import { readGuestProgress, setGuestLastPosition } from "../lib/guestStore.js";
import { UnitStudyPage } from "./UnitStudyPage.jsx";

/** 4지선다를 만들 수 있는 재료 — 문법1 · 회화 · 한자4 · 어휘4 → 스텝 6개(문법·회화·한자·어휘·확인 문제·정리) */
const PAYLOAD = unitStudyPayload({
  courseId: 2,
  unitNo: 4,
  nextUnitNo: 5,
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

/** 입문 — 한자 0자: 문법2 · 회화 · 어휘 · 확인 문제 · 정리 = 6 */
const INTRO_PAYLOAD = unitStudyPayload({
  courseId: 1, courseTitle: "입문", unitNo: 1, totalUnits: 10, kanjis: [],
  grammars: [
    { id: 4001, name: "おはようございます", nameKo: "안녕하세요(아침)", explanation: "설명", examples: [], rules: [] },
    { id: 4002, name: "ありがとうございます", nameKo: "고맙습니다", explanation: "설명", examples: [], rules: [] },
  ],
  vocabularies: [{ id: 4101, word: "あさ", kana: null, meaningKo: "아침", partOfSpeech: "NOUN" }],
});

/** 코스 마지막 유닛 — 다음 코스가 열려 있다 */
const LAST_UNIT_PAYLOAD = {
  ...PAYLOAD,
  unitNo: 20,
  nextUnitNo: null,
  nextCourse: { id: 3, courseNo: 2, levelLabel: "JLPT N4", title: "초급", status: "AVAILABLE" },
};

function renderUnit(payload = PAYLOAD, { route = "/courses/2/units/4", lang = "ja" } = {}) {
  stubFetch((url) => (url.includes("/api/users/me") ? apiError(401, "NOT_AUTHENTICATED") : apiSuccess(payload)));
  render(
    <MemoryRouter initialEntries={[route]}>
      <AuthProvider>
        <UserDataProvider>
          <Routes>
            <Route element={<UnitStudyPage lang={lang} />} path={lang === "en" ? "/en/courses/:courseId/units/:unitNo" : "/courses/:courseId/units/:unitNo"} />
          </Routes>
        </UserDataProvider>
      </AuthProvider>
    </MemoryRouter>,
  );
}

/** 스텝 칩 줄 — "정리" 칩이 있는 줄의 버튼 전부(순서대로) */
function stepChips() {
  const summaryChip = screen.getByRole("button", { name: "정리" });
  return Array.from(summaryChip.parentElement.querySelectorAll("button")).map((b) => b.textContent.trim());
}

/** [다음 ›] — 화면에 정확히 하나여야 한다(진행 버튼 두 벌 금지) */
function theNextButton() {
  const buttons = screen.getAllByRole("button", { name: "다음 ›" });
  expect(buttons).toHaveLength(1);
  return buttons[0];
}

async function clickNextUntil(user, predicate, limit = 10) {
  for (let i = 0; i < limit; i += 1) {
    if (predicate()) return i;
    await user.click(theNextButton());
  }
  throw new Error(`[다음 ›]을 ${limit}번 눌러도 도달하지 못했다`);
}

beforeEach(() => {
  window.localStorage.clear();
});

describe("스텝 순서 — 어휘 → 확인 문제 → 정리, 정리가 마지막 (AC-Q-2)", () => {
  it("일본어 유닛의 칩 순서", async () => {
    renderUnit();
    await screen.findByRole("button", { name: "정리" });

    const chips = stepChips();
    expect(chips.at(-1)).toBe("정리");
    expect(chips.at(-2)).toBe("확인 문제");
    expect(chips.at(-3)).toBe("어휘");
    expect(chips.indexOf("회화")).toBeLessThan(chips.indexOf("한자"));
    expect(chips.indexOf("한자")).toBeLessThan(chips.indexOf("어휘"));
  });

  it("입문(한자 0자)도 같은 규칙 — 어휘 → 확인 문제 → 정리", async () => {
    renderUnit(INTRO_PAYLOAD, { route: "/courses/1/units/1" });
    await screen.findByRole("button", { name: "정리" });

    const chips = stepChips();
    expect(chips.slice(-3)).toEqual(["어휘", "확인 문제", "정리"]);
    expect(chips).not.toContain("한자");
  });

  it("영어 유닛에는 확인 문제 칩이 없고 정리가 마지막이다", async () => {
    renderUnit(enUnitStudyPayload(), { route: "/en/courses/101/units/1", lang: "en" });
    await screen.findByRole("button", { name: "정리" });

    const chips = stepChips();
    expect(chips.at(-1)).toBe("정리");
    expect(chips).not.toContain("확인 문제");
    expect(chips.at(-2)).toBe("어휘");
  });
});

describe("[다음 ›]만 눌러서 확인 문제에 닿는다 (AC-Q-1 · AC-Q-4)", () => {
  it("1번 스텝에서 [다음 ›]만 누르면 확인 문제 시작 화면이 나온다", async () => {
    renderUnit();
    const user = userEvent.setup();
    await screen.findByRole("button", { name: "정리" });

    const clicks = await clickNextUntil(user, () => screen.queryByRole("button", { name: "문제 풀기" }) != null);

    expect(clicks).toBe(4); // 문법 → 회화 → 한자 → 어휘 → 확인 문제
    expect(screen.getByText("스텝 5 / 6")).toBeInTheDocument();
  });

  it("어떤 유닛에서도 정리에서 n = N 이고 N = 칩 수다", async () => {
    renderUnit();
    const user = userEvent.setup();
    await screen.findByRole("button", { name: "정리" });
    const total = stepChips().length;

    await user.click(screen.getByRole("button", { name: "정리" }));
    expect(screen.getByText(`스텝 ${total} / ${total}`)).toBeInTheDocument();
    expect(total).toBe(6);
  });

  it("입문은 6 / 6 에서 정리다", async () => {
    renderUnit(INTRO_PAYLOAD, { route: "/courses/1/units/1" });
    const user = userEvent.setup();
    await screen.findByRole("button", { name: "정리" });

    await user.click(screen.getByRole("button", { name: "정리" }));
    expect(screen.getByText("스텝 6 / 6")).toBeInTheDocument();
  });

  it("영어도 정리에서 n = N = 칩 수다", async () => {
    renderUnit(enUnitStudyPayload(), { route: "/en/courses/101/units/1", lang: "en" });
    const user = userEvent.setup();
    await screen.findByRole("button", { name: "정리" });
    const total = stepChips().length;

    await user.click(screen.getByRole("button", { name: "정리" }));
    expect(screen.getByText(`스텝 ${total} / ${total}`)).toBeInTheDocument();
  });
});

describe("전진 버튼 — 정리에만 [다음 유닛], 그 앞은 전부 [다음 ›] (AC-Q-3 · AC-Q-5)", () => {
  it("확인 문제 스텝(풀기 전)에는 [다음 유닛]류가 없고 [다음 ›] 하나가 정리로 간다", async () => {
    renderUnit();
    const user = userEvent.setup();
    await user.click(await screen.findByRole("button", { name: "확인 문제" }));
    await screen.findByRole("button", { name: "문제 풀기" });

    expect(screen.queryByRole("link", { name: /다음 유닛|시작하기|코스 목록으로/ })).toBeNull();
    await user.click(theNextButton());

    expect(await screen.findByText("이번 유닛에서 배운 것")).toBeInTheDocument();
    expect(screen.getByText("스텝 6 / 6")).toBeInTheDocument();
  });

  it("정리에는 [다음 ›]이 없고 [다음 유닛 ›] 링크가 있다", async () => {
    renderUnit();
    const user = userEvent.setup();
    await user.click(await screen.findByRole("button", { name: "정리" }));

    expect(screen.queryByRole("button", { name: "다음 ›" })).toBeNull();
    expect(screen.getByRole("link", { name: /다음 유닛/ })).toHaveAttribute("href", "/courses/2/units/5");
  });

  it("확인 문제 결과 화면의 전진 버튼도 [다음 ›] → 정리다 — [다음 유닛]은 거기 없다", async () => {
    renderUnit();
    const user = userEvent.setup();
    await user.click(await screen.findByRole("button", { name: "확인 문제" }));
    await user.click(await screen.findByRole("button", { name: "문제 풀기" }));

    // 끝까지 푼다 — 보기 첫 번째를 고르고 [다음 문제]/[결과 보기]
    for (let i = 0; i < 20; i += 1) {
      const choices = screen.queryAllByRole("button", { name: /보기/ });
      if (choices.length === 0) break;
      await user.click(choices[0]);
      const advance = screen.queryByRole("button", { name: /다음 문제|결과 보기/ });
      if (advance) await user.click(advance);
    }
    // 결과 화면
    expect(screen.queryByRole("link", { name: /다음 유닛|시작하기|코스 목록으로/ })).toBeNull();
    await user.click(theNextButton());

    expect(await screen.findByText("이번 유닛에서 배운 것")).toBeInTheDocument();
  });
});

describe("완료 조건 — 문제 풀이는 완료 조건이 아니다 (AC-Q-6)", () => {
  it("확인 문제에 머무는 것만으로는 완료되지 않고, 건너뛰어 정리에 닿으면 완료된다", async () => {
    renderUnit();
    const user = userEvent.setup();
    await screen.findByRole("button", { name: "정리" });

    await clickNextUntil(user, () => screen.queryByRole("button", { name: "문제 풀기" }) != null);
    expect(readGuestProgress().completedUnits).toEqual([]);

    await user.click(theNextButton()); // 건너뛰기 → 정리
    await waitFor(() => expect(readGuestProgress().completedUnits).toEqual([{ courseId: 2, unitNo: 4 }]));
  });
});

describe("코스 마지막 유닛 (AC-Q-7)", () => {
  it("[다음 ›]만으로 확인 문제 → 정리에 닿고, [다음 코스 시작하기]는 정리에서만 보인다", async () => {
    renderUnit(LAST_UNIT_PAYLOAD, { route: "/courses/2/units/20" });
    const user = userEvent.setup();
    await screen.findByRole("button", { name: "정리" });

    await clickNextUntil(user, () => screen.queryByRole("button", { name: "문제 풀기" }) != null);
    expect(screen.queryByRole("link", { name: /시작하기/ })).toBeNull(); // 확인 문제를 건너뛰고 코스 밖으로 나가는 길이 없다

    await user.click(theNextButton());
    expect(await screen.findByText("이번 유닛에서 배운 것")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /다음 코스.*시작하기/ })).toHaveAttribute("href", "/courses/3");
  });
});

describe("현재 스텝 칩 — 활성 표시는 클래스가 아니라 aria-pressed (디자인 매핑 §6-3)", () => {
  it("현재 스텝의 칩만 aria-pressed=true 다", async () => {
    renderUnit();
    const user = userEvent.setup();
    await screen.findByRole("button", { name: "정리" });

    await user.click(screen.getByRole("button", { name: "어휘" }));
    const pressed = screen.getAllByRole("button", { pressed: true });
    expect(pressed).toHaveLength(1);
    expect(pressed[0]).toHaveTextContent("어휘");
  });
});

describe("복원 (AC-Q-8)", () => {
  it("마지막 위치가 '확인 문제'면 확인 문제 스텝(풀기 전)으로 열린다", async () => {
    setGuestLastPosition({ courseId: 2, unitNo: 4, stepKey: "quiz" }, new Date());
    renderUnit();

    expect(await screen.findByRole("button", { name: "문제 풀기" })).toBeInTheDocument();
    expect(screen.getByText("스텝 5 / 6")).toBeInTheDocument();
    expect(screen.getByText(/보던 곳부터 이어서 보고 있어요/)).toBeInTheDocument();
    // 아직 완료가 아니다
    expect(readGuestProgress().completedUnits).toEqual([]);
    // 문법 카드(1번 스텝)가 아니라 확인 문제 카드가 보인다
    expect(within(screen.getByRole("button", { name: "문제 풀기" }).closest("div")).queryByText("문제 풀기")).not.toBeNull();
  });
});
