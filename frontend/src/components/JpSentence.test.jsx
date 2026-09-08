import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { JpSentence } from "./JpSentence.jsx";

// API 명세 §2: kana는 원문에 한자가 있을 때만 값을 갖는다.
// 프론트는 문자열 비교를 하지 않고 null 여부로만 분기한다 — 계약을 데이터가 지키게 하기 위함(§7-10 ①).
describe("JpSentence", () => {
  it("kana가 있으면 3줄(원문·가나·뜻)을 모두 보여준다", () => {
    render(<JpSentence jp="ここは 教室です。" kana="ここは きょうしつです。" meaningKo="여기는 교실입니다." />);

    expect(screen.getByText("ここは 教室です。")).toBeInTheDocument();
    expect(screen.getByText("ここは きょうしつです。")).toBeInTheDocument();
    expect(screen.getByText("여기는 교실입니다.")).toBeInTheDocument();
  });

  it("kana가 null이면 가나 줄을 렌더링하지 않는다 (같은 줄 2번 노출 방지)", () => {
    const { container } = render(
      <JpSentence jp="トイレは あそこです。" kana={null} meaningKo="화장실은 저기예요." />,
    );

    expect(screen.getByText("トイレは あそこです。")).toBeInTheDocument();
    expect(screen.getByText("화장실은 저기예요.")).toBeInTheDocument();
    expect(container.querySelector(".kana-line")).toBeNull();
  });

  it("kana가 undefined여도 가나 줄이 없다", () => {
    const { container } = render(<JpSentence jp="そうですか。" meaningKo="그래요?" />);

    expect(container.querySelector(".kana-line")).toBeNull();
  });
});

// 설계/05 §16-4 — 같은 3줄 병기 컴포넌트를 쓰되 자형만 본문 폰트로 되돌린다.
describe("JpSentence — latin (영어 과정)", () => {
  it("latin이면 .latin이 붙고, 음성 버튼을 만들지 않는다 (영어에는 TTS가 없다 §0-2)", () => {
    const { container } = render(
      <JpSentence jp="I get up at seven." kana={null} latin meaningKo="나는 7시에 일어난다." />,
    );

    expect(container.querySelector(".jp-sentence.latin")).not.toBeNull();
    expect(container.querySelector(".tts-btn")).toBeNull();
  });

  it("기본값은 일본어 — latin 클래스가 붙지 않는다", () => {
    const { container } = render(<JpSentence jp="そうですか。" meaningKo="그래요?" />);

    expect(container.querySelector(".jp-sentence.latin")).toBeNull();
  });
});
