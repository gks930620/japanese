// frontend-dev 작성 — 코드리뷰 Major 2: 화면·스텝 이탈 시 재생이 실제로 멈춰야 한다(V8).
// 시각 상태만 정리하고 speechSynthesis.cancel을 안 부르면 소리가 계속 난다.
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { TtsButton } from "./TtsControls.jsx";
import { resetTtsForTest, isPlaybackOwner } from "./ttsStore.js";

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

describe("이탈 시 정지 (V8)", () => {
  it("재생 중인 버튼이 언마운트되면 cancel이 불린다", async () => {
    const synth = stubSynth();
    const user = userEvent.setup();
    const { unmount } = render(<TtsButton label="문장" text="いち" />);

    await user.click(screen.getByRole("button", { name: /듣기/ }));
    const cancelsBefore = synth.cancel.mock.calls.length;

    unmount();

    expect(synth.cancel.mock.calls.length).toBeGreaterThan(cancelsBefore);
  });

  it("재생 중이 아닌 버튼의 언마운트는 남의 재생을 끊지 않는다", async () => {
    const synth = stubSynth();
    const user = userEvent.setup();
    const { unmount } = render(<TtsButton label="첫" text="いち" />);
    render(<TtsButton label="둘" text="に" />);

    // 두 번째 버튼이 재생 주체다
    await user.click(screen.getByRole("button", { name: "둘 듣기" }));
    const cancelsBefore = synth.cancel.mock.calls.length;

    unmount(); // 재생 중이 아닌 첫 버튼만 사라진다

    expect(synth.cancel.mock.calls.length).toBe(cancelsBefore);
    expect(isPlaybackOwner(null)).toBe(false); // 재생 주체가 여전히 등록돼 있다
  });
});

describe("재생 주체 레지스트리 (부수 결함)", () => {
  it("정지하면 등록이 해제된다 — 죽은 콜백이 남지 않는다", async () => {
    stubSynth();
    const user = userEvent.setup();
    render(<TtsButton label="문장" text="いち" />);

    await user.click(screen.getByRole("button", { name: /듣기/ }));
    await user.click(screen.getByRole("button", { name: "정지" }));

    expect(screen.getByRole("button", { name: /듣기/ })).toHaveAttribute("aria-pressed", "false");
    expect(isPlaybackOwner(null)).toBe(false);
  });
});
