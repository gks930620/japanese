import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import { apiError } from "../test/helpers.jsx";
import { coursesFixture } from "../test/apiFixtures.js";
import { libraryCalls, renderDiagnosis, startLevel } from "../test/diagnosisHelpers.jsx";

/**
 * 실력 진단 — **레벨 고르기 화면** (설계/09 §3-1 · 05 §15-2 — TDD Red, senior-dev 2026-09-14 개편)
 *
 * 기획 D9 / 인수 조건 **A21·A22·A23** + 예외 **E11·E12·E22**.
 *
 * ★ 이 파일은 `DiagnosisPage.stagecount.test.jsx`를 **대체한다.** 그 파일이 고정하던 규칙
 *   (*"시작 화면이 말하는 최대 단계 수는 상수가 아니라 계산값"* — A1)은 **무효가 됐다**:
 *   한 번에 치는 것은 **한 레벨뿐**이라 화면이 약속할 총량이 없다.
 *   살아남은 것은 그 규칙의 뿌리다 — **목록은 코스 상태에서 계산된다**(코스명·레벨명 하드코딩 금지, 08 C-6).
 *   그래서 파일을 고쳐 쓰지 않고 **지우고 새로 세웠다**(낡은 단언과 새 단언이 공존하면 사고가 난다, 08 C-11).
 *
 * DOM 계약: 선택 목록 = `<fieldset class="diag-levels">` + `<legend>` + 같은 `name`의 `<input type="radio">`,
 * 한 줄의 문구는 **`{title}({levelLabel})`**(둘 다 API 값), 주 버튼은 화면에 **하나**(`시작하기`).
 *
 * 이 테스트를 수정하지 말 것 — 계약 변경은 senior-dev 경유.
 */

const LEVEL_LABELS = [
  "입문(문자)",
  "왕초보(JLPT N5)",
  "초급(JLPT N4)",
  "중급(JLPT N3)",
  "중상급(JLPT N2)",
  "고급(JLPT N1)",
];

const levelRadios = () => screen.getAllByRole("radio");
const levelNames = () => levelRadios().map((radio) => radio.labels[0].textContent.replace(/\s+/g, " ").trim());

describe("선택지는 코스 상태에서 계산된다 (A21)", () => {
  it("입장 가능한 코스의 레벨만, 낮은 것부터 선다 — 문구는 API 값 그대로다", async () => {
    renderDiagnosis();

    await screen.findByRole("button", { name: "시작하기" });
    expect(levelNames()).toEqual(LEVEL_LABELS);
    // 선택 목록은 하나의 묶음으로 낭독된다(중첩 fieldset이 아니다)
    expect(screen.getByRole("group", { name: "어느 레벨부터 볼까요" })).toBeInTheDocument();
  });

  it("총량을 약속하지 않는다 — '최대 n단계'도 '3분'도 없다", async () => {
    renderDiagnosis();

    await screen.findByRole("button", { name: "시작하기" });
    const text = document.body.textContent;
    expect(text).not.toMatch(/3분/);
    expect(text).not.toMatch(/단계/);
    expect(text).toMatch(/레벨을 하나 골라 6문항을 풀면/);
    expect(text).toMatch(/잘 모르겠으면 그대로 \[시작하기\]를 누르세요/);
    expect(text).toMatch(/\[모르겠어요\]/);
    expect(screen.getByText("결과는 저장되지 않아요.")).toBeInTheDocument();
  });

  it("준비중 코스의 레벨은 목록에 없다 — 없는 것을 고르게 하지 않는다 (E22)", async () => {
    const courses = coursesFixture().map((course) =>
      course.levelCode === "INTRO" || course.levelCode === "N1"
        ? { ...course, status: "PREPARING", unitCount: 0 }
        : course,
    );
    renderDiagnosis({ courses });

    await screen.findByRole("button", { name: "시작하기" });
    expect(levelNames()).toEqual(["왕초보(JLPT N5)", "초급(JLPT N4)", "중급(JLPT N3)", "중상급(JLPT N2)"]);
  });
});

describe("기본 선택값은 언제나 가장 낮은 레벨 (A22·A23)", () => {
  /** ★ 이 규칙의 핵심: **모르는 사람의 동선이 예전과 똑같다.** 추가 클릭 0회로 가장 낮은 레벨이 시작된다 */
  it("아무것도 고르지 않고 [시작하기]를 누르면 가장 낮은 레벨이 시작된다", async () => {
    const fetchMock = renderDiagnosis();
    const user = userEvent.setup();

    await screen.findByRole("button", { name: "시작하기" });
    expect(screen.getByRole("radio", { name: "입문(문자)" })).toBeChecked();

    await startLevel(user);
    expect(document.body.textContent).toMatch(/문자 레벨 · 6문항/);
    libraryCalls(fetchMock).forEach((url) => expect(url).toContain("level=INTRO"));
  });

  it("준비중 때문에 입문이 빠지면 기본 선택값은 그다음 레벨이다 (E22)", async () => {
    const courses = coursesFixture().map((course) =>
      course.levelCode === "INTRO" ? { ...course, status: "PREPARING", unitCount: 0 } : course,
    );
    renderDiagnosis({ courses });

    await screen.findByRole("button", { name: "시작하기" });
    expect(screen.getByRole("radio", { name: "왕초보(JLPT N5)" })).toBeChecked();
  });

  /** 요구 8의 동기가 바로 이것이다 — "N2쯤 하는 사람"이 입문부터 풀지 않아도 된다 */
  it("가장 높은 레벨을 고르면 그 레벨의 문항이 바로 나온다 — 더 낮은 레벨을 먼저 풀지 않는다 (A23)", async () => {
    const fetchMock = renderDiagnosis();
    const user = userEvent.setup();

    await startLevel(user, "고급(JLPT N1)");

    expect(document.body.textContent).toMatch(/JLPT N1 레벨 · 6문항/);
    const calls = libraryCalls(fetchMock);
    expect(calls.length).toBeGreaterThan(0);
    calls.forEach((url) => expect(url).toContain("level=N1"));
  });
});

describe("고를 레벨이 없을 때 (E11·E12)", () => {
  it("입장 가능한 코스가 하나도 없으면 선택지도 [시작하기]도 없이 사실만 말한다 (E12)", async () => {
    const courses = coursesFixture().map((course) => ({ ...course, status: "PREPARING", unitCount: 0 }));
    renderDiagnosis({ courses });

    expect(await screen.findByText("지금은 확인할 수 있는 레벨이 없어요.")).toBeInTheDocument();
    expect(screen.queryAllByRole("radio")).toHaveLength(0);
    // 누를 수 있는 것이 없다 — [다시 시도]도 두지 않는다(다시 불러도 같은 결과다)
    expect(screen.queryAllByRole("button")).toHaveLength(0);
  });

  /** 레벨 목록을 만들 재료가 없다 — 진단 화면을 그리지 않고 기성 오류 카드를 쓴다(05 §8) */
  it("코스 목록을 못 부르면 오류 카드 + [다시 시도]가 나온다 (E11)", async () => {
    renderDiagnosis({ coursesResponse: apiError(500, "INTERNAL_SERVER_ERROR") });

    expect(await screen.findByRole("button", { name: "다시 시도" })).toBeInTheDocument();
    expect(screen.queryAllByRole("radio")).toHaveLength(0);
    expect(screen.queryByRole("button", { name: "시작하기" })).toBeNull();
  });
});

describe("[시작하기]는 화면에 하나뿐이다 (05 §3-2)", () => {
  it("레벨마다 시작 버튼을 만들지 않는다", async () => {
    renderDiagnosis();
    const user = userEvent.setup();

    await screen.findByRole("button", { name: "시작하기" });
    expect(screen.getAllByRole("button")).toHaveLength(1);

    await startLevel(user, "중급(JLPT N3)");
    expect(document.querySelectorAll(".k-btn--primary")).toHaveLength(1);
  });
});
