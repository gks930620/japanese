// frontend-dev 작성 — 음성 버튼·속도 토글(설계/05 §15-3). 게이트·토글·단일 재생의 화면 결합을 고정한다.
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { TtsButton, TtsRateChip } from "./TtsControls.jsx";
import { resetTtsForTest } from "./ttsStore.js";

function stubSynth() {
  const synth = {
    spoken: [],
    cancel: vi.fn(),
    speak: vi.fn(function (u) {
      this.spoken.push(u);
    }),
    getVoices: () => [{ lang: "ja-JP", name: "Kyoko" }],
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
  };
  vi.stubGlobal("speechSynthesis", synth);
  return synth;
}

beforeEach(() => {
  window.localStorage.clear();
  resetTtsForTest();
});

describe("노출 게이트 (V11)", () => {
  it("일본어 음성이 없으면 버튼·토글이 아예 없다 — 안내도 없다", () => {
    vi.stubGlobal("speechSynthesis", {
      getVoices: () => [{ lang: "en-US" }],
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      cancel: vi.fn(),
    });
    const { container } = render(
      <>
        <TtsButton label="学生です。" text="がくせいです。" />
        <TtsRateChip />
      </>,
    );
    expect(container).toBeEmptyDOMElement();
  });

  it("speechSynthesis 자체가 없어도(jsdom 기본) 조용히 미렌더", () => {
    const { container } = render(<TtsButton label="学生です。" text="がくせいです。" />);
    expect(container).toBeEmptyDOMElement();
  });
});

describe("재생 토글 (V5·V6)", () => {
  it("누르면 kana를 재생하고 aria-pressed가 켜진다", async () => {
    const synth = stubSynth();
    const user = userEvent.setup();
    render(<TtsButton label="学生です。" text="がくせいです。" />);

    await user.click(screen.getByRole("button", { name: /듣기/ }));

    expect(synth.speak).toHaveBeenCalledTimes(1);
    expect(synth.spoken[0].text).toBe("がくせいです。");
    expect(screen.getByRole("button", { name: "정지" })).toHaveAttribute("aria-pressed", "true");
  });

  it("다른 버튼을 누르면 이전 버튼의 재생 상태가 풀린다 (단일 재생)", async () => {
    stubSynth();
    const user = userEvent.setup();
    render(
      <>
        <TtsButton label="첫 문장" text="いち" />
        <TtsButton label="둘째 문장" text="に" />
      </>,
    );

    await user.click(screen.getByRole("button", { name: "첫 문장 듣기" }));
    await user.click(screen.getByRole("button", { name: "둘째 문장 듣기" }));

    // 첫 버튼은 대기 상태로 돌아간다
    expect(screen.getByRole("button", { name: "첫 문장 듣기" })).toHaveAttribute("aria-pressed", "false");
    expect(screen.getByRole("button", { name: "정지" })).toHaveAttribute("aria-pressed", "true");
  });
});

describe("속도 토글 (V9·V10)", () => {
  it("'느리게' 칩을 켜면 저장되고 다음 재생부터 0.7이다", async () => {
    const synth = stubSynth();
    const user = userEvent.setup();
    render(
      <>
        <TtsRateChip />
        <TtsButton label="문장" text="あ" />
      </>,
    );

    await user.click(screen.getByRole("button", { name: "느리게" }));
    await user.click(screen.getByRole("button", { name: "문장 듣기" }));

    expect(screen.getByRole("button", { name: "느리게" })).toHaveAttribute("aria-pressed", "true");
    expect(synth.spoken[0].rate).toBe(0.7);
    expect(JSON.parse(window.localStorage.getItem("jp.tts.v1")).rate).toBe("SLOW");
  });
});
