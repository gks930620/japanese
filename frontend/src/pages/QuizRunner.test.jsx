import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it, vi } from "vitest";
import { QuizRunner } from "../components/QuizRunner.jsx";

/**
 * 공용 문제·결과 화면 (설계/05 §15-1 · 기획 Q9~Q17·Q23 — TDD Red, senior-dev 작성)
 *
 * 유닛 확인 문제·자료실 퀴즈가 공유하는 컴포넌트다. 문제 세트는 밖(lib/quiz.js)에서 만들어 props로 받는다 —
 * 생성 규칙은 lib 테스트가, 이 파일은 "푸는 동작"만 고정한다.
 *
 * props 계약: { questions, newTabLinks?: boolean, onRestart, footerActions? }
 * 각 question은 설계/05 §15-1의 모양이고 libraryHref를 포함한다(결과 목록의 자료실 링크 — Q17).
 *
 * 이 테스트를 수정하지 말 것 — 계약 변경은 senior-dev 경유.
 */

const QUESTIONS = [
  {
    id: "vocab-meaning-31",
    type: "VOCAB_MEANING",
    prompt: { main: "学生（がくせい）", sub: "뜻은?" },
    choices: ["학생", "선생님", "회사", "전철"],
    answerIndex: 0,
    evidence: { word: "学生", kana: "がくせい", meaningKo: "학생" },
    libraryHref: "/library/vocabulary?q=%E5%AD%A6%E7%94%9F",
  },
  {
    id: "kanji-meaning-21",
    type: "KANJI_MEANING",
    prompt: { main: "人", sub: "이 글자의 뜻은?" },
    choices: ["메 산", "사람 인", "내 천", "물 수"],
    answerIndex: 1,
    evidence: { letter: "人", meaningKo: "사람 인", onyomi: "ジン", kunyomi: "ひと" },
    libraryHref: "/library/kanji/21",
  },
];

function renderRunner(props = {}) {
  const onRestart = vi.fn();
  render(
    <MemoryRouter>
      <QuizRunner questions={QUESTIONS} onRestart={onRestart} {...props} />
    </MemoryRouter>,
  );
  return { onRestart };
}

async function answer(user, label) {
  await user.click(screen.getByRole("button", { name: label }));
}

describe("문제 화면 (Q9~Q12)", () => {
  it("진행 표시와 맞은 개수가 항상 보인다 (Q12)", () => {
    renderRunner();

    expect(screen.getByText(/1 \/ 2/)).toBeInTheDocument();
    expect(screen.getByText(/0개/)).toBeInTheDocument();
  });

  it("보기를 누르면 즉시 채점되고 근거가 펼쳐진다 (Q9·Q11)", async () => {
    renderRunner();
    const user = userEvent.setup();

    await answer(user, "학생");

    // 정답 표시 + 근거(읽기·뜻)
    expect(screen.getByText(/정답/)).toBeInTheDocument();
    expect(screen.getByText(/がくせい/)).toBeInTheDocument();
  });

  it("오답이면 정답 보기가 함께 표시된다 (Q9)", async () => {
    renderRunner();
    const user = userEvent.setup();

    await answer(user, "회사");

    expect(screen.getByText(/오답/)).toBeInTheDocument();
    // 정답인 "학생" 보기가 정답으로 표시된다
    expect(screen.getByRole("button", { name: "학생" })).toHaveAttribute("data-correct", "true");
  });

  it("채점된 뒤에는 답을 바꿀 수 없다 (Q10)", async () => {
    renderRunner();
    const user = userEvent.setup();

    await answer(user, "회사");

    ["학생", "선생님", "전철"].forEach((label) => {
      expect(screen.getByRole("button", { name: label })).toBeDisabled();
    });
  });

  it("맞히면 맞은 개수가 올라간다 (Q12)", async () => {
    renderRunner();
    const user = userEvent.setup();

    await answer(user, "학생");

    expect(screen.getByText(/1개/)).toBeInTheDocument();
  });
});

describe("결과 화면 (Q13~Q17·Q23)", () => {
  async function finishAll(user, secondAnswer = "사람 인") {
    await answer(user, "학생");
    await user.click(screen.getByRole("button", { name: "다음 문제" }));
    await answer(user, secondAnswer);
    await user.click(screen.getByRole("button", { name: "다음 문제" }));
  }

  it("마지막 문제를 채점하고 넘어가면 점수와 정오 목록이 보인다 (Q13·Q14)", async () => {
    renderRunner();
    const user = userEvent.setup();
    await finishAll(user);

    expect(screen.getByText(/2 \/ 2/)).toBeInTheDocument();
    expect(screen.getAllByRole("listitem")).toHaveLength(2);
  });

  it("틀린 게 있으면 [틀린 문제만 다시 풀기]가 보이고, 누르면 오답만 다시 나온다 (Q15)", async () => {
    renderRunner();
    const user = userEvent.setup();
    await finishAll(user, "메 산"); // 2번을 틀린다

    await user.click(screen.getByRole("button", { name: "틀린 문제만 다시 풀기" }));

    // 틀린 1문제만 — 진행 표시가 1 / 1
    expect(screen.getByText(/1 \/ 1/)).toBeInTheDocument();
    expect(screen.getByText("人")).toBeInTheDocument();
  });

  it("전부 맞히면 [틀린 문제만 다시 풀기]가 없다 (Q15)", async () => {
    renderRunner();
    const user = userEvent.setup();
    await finishAll(user);

    expect(screen.queryByRole("button", { name: "틀린 문제만 다시 풀기" })).not.toBeInTheDocument();
  });

  it("[새 문제로 다시 풀기]는 onRestart를 부른다 — 재생성은 부모의 몫이다 (Q16)", async () => {
    const { onRestart } = renderRunner();
    const user = userEvent.setup();
    await finishAll(user);

    await user.click(screen.getByRole("button", { name: "새 문제로 다시 풀기" }));

    expect(onRestart).toHaveBeenCalledTimes(1);
  });

  it("결과가 저장되지 않는다는 안내가 보인다 (Q23 — 판정 ②)", async () => {
    renderRunner();
    const user = userEvent.setup();
    await finishAll(user);

    expect(screen.getByText(/저장되지 않아요/)).toBeInTheDocument();
  });

  it("정오 목록의 자료실 링크는 newTabLinks일 때 새 탭이다 (Q17)", async () => {
    renderRunner({ newTabLinks: true });
    const user = userEvent.setup();
    await finishAll(user);

    const links = screen.getAllByRole("link");
    const libraryLink = links.find((l) => l.getAttribute("href")?.startsWith("/library/"));
    expect(libraryLink).toHaveAttribute("target", "_blank");
  });
});
