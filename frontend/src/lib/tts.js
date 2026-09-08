// 음성(TTS) 동작 규칙 (설계/09 §4) — speechSynthesis 래핑. synth·storage를 주입받아 결정적으로 테스트한다.
// 서버 계약은 없다 — 이 파일의 동작 규칙이 계약이다(판정 ③).

/** 속도 2단계 — 보통 1.0 / 느리게 0.7 (V9) */
export const RATES = { NORMAL: 1.0, SLOW: 0.7 };

const STORAGE_KEY = "jp.tts.v1"; // {"rate":"SLOW"} — 로그인 무관 브라우저 설정

/**
 * 읽을 텍스트 = `kana ?? 원문` — kana 계약(06 §1)이 곧 발음 계약이다(V3).
 * 문장(`jp`)과 어휘 행(`word`)이 같은 규칙을 쓴다. 빈 문자열 kana는 없는 것과 같다.
 */
export function speechTextOf(item) {
  return item.kana || item.jp || item.word || "";
}

/**
 * 노출 게이트 (V11) — lang이 `ja`로 시작하는 음성이 하나도 없으면
 * 재생 버튼을 **렌더하지 않는다**(안내도 없다). 화면은 이 판정만 쓴다.
 */
export function hasJapaneseVoice(voices) {
  return (voices ?? []).some((voice) => typeof voice.lang === "string" && voice.lang.startsWith("ja"));
}

function makeUtterance(text) {
  // jsdom에는 SpeechSynthesisUtterance가 없다 — 같은 필드를 가진 평범한 객체로 대체(테스트 주입 경로)
  if (typeof SpeechSynthesisUtterance !== "undefined") return new SpeechSynthesisUtterance(text);
  return { text };
}

/**
 * 재생기 — **전역 단일 재생**이 규칙이다(V5·V6·V8):
 * 새 재생은 항상 cancel 후 시작, 정지는 cancel, 화면·스텝 이탈 시에도 cancel.
 *
 * @param {{synth?: SpeechSynthesis, storage?: Storage}} deps 주입(기본: 브라우저 전역)
 */
export function createSpeaker({ synth, storage } = {}) {
  const synthesis = synth ?? (typeof window !== "undefined" ? window.speechSynthesis : null);
  const store = storage ?? (typeof window !== "undefined" ? window.localStorage : null);

  function readRate() {
    try {
      const raw = store?.getItem(STORAGE_KEY);
      if (!raw) return "NORMAL";
      const parsed = JSON.parse(raw);
      return parsed?.rate === "SLOW" ? "SLOW" : "NORMAL";
    } catch {
      return "NORMAL";
    }
  }

  let rateKey = readRate();

  return {
    /** 현재 속도 키 ("NORMAL" | "SLOW") — 저장값이 초기값이다(V9) */
    getRate() {
      return rateKey;
    },

    /** 속도 변경 — 저장하고, **다음 재생부터** 적용한다(재생 중 utterance는 건드리지 않는다 — V10) */
    setRate(nextKey) {
      rateKey = nextKey === "SLOW" ? "SLOW" : "NORMAL";
      try {
        store?.setItem(STORAGE_KEY, JSON.stringify({ rate: rateKey }));
      } catch {
        // 저장 실패해도 이번 세션에는 적용
      }
    },

    /**
     * 재생 — 항상 cancel을 먼저 부른다(두 소리 금지 — V6).
     * utterance는 ja-JP + 첫 번째 ja 보이스 명시 지정(화자 선택 없음 — 설계/09 §4).
     */
    speak(text, { onEnd, onError } = {}) {
      if (!synthesis) return;
      synthesis.cancel();

      const utterance = makeUtterance(text);
      utterance.text = text;
      utterance.lang = "ja-JP";
      utterance.rate = RATES[rateKey];
      const voice = (synthesis.getVoices?.() ?? []).find(
        (candidate) => typeof candidate.lang === "string" && candidate.lang.startsWith("ja"),
      );
      if (voice) utterance.voice = voice;
      if (onEnd) utterance.onend = onEnd;
      if (onError) utterance.onerror = onError;

      synthesis.speak(utterance);
    },

    /** 정지 — 같은 버튼 재클릭·화면 이탈이 부른다(V5·V8) */
    stop() {
      synthesis?.cancel();
    },
  };
}
