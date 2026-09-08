import { beforeEach, describe, expect, it, vi } from "vitest";
import { speechTextOf, hasJapaneseVoice, createSpeaker, RATES } from "./tts.js";

/**
 * 음성(TTS) 동작 규칙 (설계/09 §4 — TDD Red, senior-dev 작성)
 *
 * 실제 발화·목소리 품질은 jsdom에서 검증할 수 없다(설계/09 §4 한계 — qa 실기기 시나리오).
 * 여기서 고정하는 것은 ①읽을 텍스트 선택 ②노출 게이트 ③단일 재생 ④속도 저장·적용 시점이다.
 *
 * 이 테스트를 수정하지 말 것 — 계약 변경은 senior-dev 경유.
 */

describe("무엇을 읽나 (V3 — kana 계약이 곧 발음 계약)", () => {
  it("kana가 있으면 kana를 읽는다", () => {
    expect(speechTextOf({ jp: "学生です。", kana: "がくせいです。" })).toBe("がくせいです。");
  });

  it("kana가 없으면 원문을 읽는다", () => {
    expect(speechTextOf({ jp: "はじめまして。", kana: null })).toBe("はじめまして。");
  });

  it("빈 문자열 kana는 없는 것과 같다", () => {
    expect(speechTextOf({ jp: "トイレ", kana: "" })).toBe("トイレ");
  });

  it("어휘 행(word 필드)도 같은 규칙이다", () => {
    expect(speechTextOf({ word: "学生", kana: "がくせい" })).toBe("がくせい");
    expect(speechTextOf({ word: "トイレ", kana: null })).toBe("トイレ");
  });
});

describe("노출 게이트 (V11)", () => {
  it("lang이 ja로 시작하는 음성이 있으면 켠다", () => {
    expect(hasJapaneseVoice([{ lang: "en-US" }, { lang: "ja-JP" }])).toBe(true);
    expect(hasJapaneseVoice([{ lang: "ja" }])).toBe(true);
  });

  it("일본어 음성이 하나도 없으면 끈다 — 버튼을 아예 렌더하지 않는 근거", () => {
    expect(hasJapaneseVoice([{ lang: "en-US" }, { lang: "ko-KR" }])).toBe(false);
    expect(hasJapaneseVoice([])).toBe(false);
  });
});

describe("단일 재생 · 속도 (V5·V6·V9·V10)", () => {
  let synth;
  let storage;

  beforeEach(() => {
    synth = {
      spoken: [],
      cancel: vi.fn(),
      speak: vi.fn(function (utterance) {
        this.spoken.push(utterance);
      }),
      getVoices: () => [{ lang: "ja-JP", name: "Kyoko" }],
    };
    const backing = new Map();
    storage = {
      getItem: (k) => (backing.has(k) ? backing.get(k) : null),
      setItem: (k, v) => backing.set(k, v),
    };
  });

  it("새 재생은 항상 이전 재생을 cancel한 뒤 시작한다 (V6 — 두 소리 금지)", () => {
    const speaker = createSpeaker({ synth, storage });
    speaker.speak("がくせいです。");
    speaker.speak("せんせいです。");

    expect(synth.cancel).toHaveBeenCalledTimes(2);
    // cancel이 speak보다 먼저 — 호출 순서를 고정한다
    const cancelOrder = synth.cancel.mock.invocationCallOrder[1];
    const speakOrder = synth.speak.mock.invocationCallOrder[1];
    expect(cancelOrder).toBeLessThan(speakOrder);
  });

  it("stop은 cancel을 부른다 (V5·V8)", () => {
    const speaker = createSpeaker({ synth, storage });
    speaker.speak("がくせいです。");
    speaker.stop();
    expect(synth.cancel).toHaveBeenCalledTimes(2);
  });

  it("기본 속도는 보통(1.0)이고, 느리게는 0.7이다 (V9)", () => {
    const speaker = createSpeaker({ synth, storage });
    speaker.speak("あ");
    expect(synth.spoken[0].rate).toBe(RATES.NORMAL);

    speaker.setRate("SLOW");
    speaker.speak("い");
    expect(synth.spoken[1].rate).toBe(RATES.SLOW);
  });

  it("속도 선택은 저장되고 다음 방문(새 speaker)에도 유지된다 (V9)", () => {
    const first = createSpeaker({ synth, storage });
    first.setRate("SLOW");

    const second = createSpeaker({ synth, storage });
    expect(second.getRate()).toBe("SLOW");
    second.speak("う");
    expect(synth.spoken[0].rate).toBe(RATES.SLOW);
  });

  it("속도 변경은 다음 재생부터다 — 이미 만든 utterance는 건드리지 않는다 (V10)", () => {
    const speaker = createSpeaker({ synth, storage });
    speaker.speak("あ");
    speaker.setRate("SLOW");
    expect(synth.spoken[0].rate).toBe(RATES.NORMAL);
  });

  it("utterance는 일본어로 설정된다 (lang=ja-JP)", () => {
    const speaker = createSpeaker({ synth, storage });
    speaker.speak("がくせい");
    expect(synth.spoken[0].lang).toBe("ja-JP");
  });
});
