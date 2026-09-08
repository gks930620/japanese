import { useEffect, useRef, useState } from "react";
import {
  claimPlayback,
  releasePlayback,
  speaker,
  stopIfOwner,
  useJapaneseVoice,
} from "./ttsStore.js";

/**
 * 음성 재생 버튼·속도 토글 (설계/05 §15-3) — 붙는 자리 전부 이 컴포넌트 하나다.
 *
 * - **게이트(V11)**: ja 음성이 하나도 없으면(또는 speechSynthesis 자체가 없으면 — jsdom 포함)
 *   버튼·토글을 렌더하지 않는다. 안내도 없다. 전부 줄 끝 append 방식이라 미렌더 시 레이아웃이 현행과 같다.
 * - **단일 재생(V5·V6)**: 재생 주체를 모듈 레지스트리가 토큰으로 식별한다.
 * - **이탈 시 정지(V8)**: 언마운트에서 **자신이 재생 주체일 때만** 실제로 cancel한다.
 */

/**
 * 재생 버튼 — 같은 버튼이 재생/정지 토글(V5). 클릭 전파 차단(행 클릭·아코디언으로 번지지 않게).
 * @param {string} text 읽을 텍스트 — 호출부가 `speechTextOf()`로 만든다(kana ?? 원문)
 * @param {string} label 접근 이름용 원문
 */
export function TtsButton({ text, label }) {
  const available = useJapaneseVoice();
  const [playing, setPlaying] = useState(false);
  const [token] = useState(() => ({})); // 렌더와 무관하게 안정적인 신원(ref를 렌더 중에 읽지 않는다)

  // 화면·스텝 이탈 시 재생 정지(V8) — 내가 재생 중일 때만 남의 재생을 끊지 않고 멈춘다
  useEffect(() => {
    return () => stopIfOwner(token);
  }, [token]);

  if (!available) return null;

  const toggle = (event) => {
    event.preventDefault();
    event.stopPropagation();
    if (playing) {
      speaker().stop();
      setPlaying(false);
      releasePlayback(token);
      return;
    }
    claimPlayback(token, () => setPlaying(false));
    speaker().speak(text, {
      onEnd: () => {
        setPlaying(false);
        releasePlayback(token);
      },
    });
    setPlaying(true);
  };

  return (
    <button
      aria-label={playing ? "정지" : `${label} 듣기`}
      aria-pressed={playing}
      className={`tts-btn${playing ? " playing" : ""}`}
      type="button"
      onClick={toggle}
    >
      <span aria-hidden="true" className="material-icons">
        {playing ? "stop" : "volume_up"}
      </span>
    </button>
  );
}

/** 속도 토글 — 화면당 1개. 켜짐 = 느리게(0.7), 저장은 lib/tts가 한다(다음 재생부터 — V10) */
export function TtsRateChip() {
  const available = useJapaneseVoice();
  const [slow, setSlow] = useState(() => speaker().getRate() === "SLOW");

  if (!available) return null;

  const toggle = () => {
    const next = !slow;
    speaker().setRate(next ? "SLOW" : "NORMAL");
    setSlow(next);
  };

  return (
    <button aria-pressed={slow} className={`chip${slow ? " sel" : ""}`} type="button" onClick={toggle}>
      느리게
    </button>
  );
}

/**
 * 회화 [전체 재생] (V7) — 줄 배열을 순차 재생, 현재 줄 인덱스를 콜백으로 알린다(강조는 화면 몫).
 * 개별 버튼이 끼어들면 레지스트리가 시퀀스의 시각 상태를 풀고, 시퀀스는 이어 재생하지 않는다.
 */
export function TtsPlayAllButton({ texts, onLineChange }) {
  const available = useJapaneseVoice();
  const [playing, setPlaying] = useState(false);
  const [token] = useState(() => ({}));
  const sessionRef = useRef(null);

  useEffect(() => {
    return () => {
      if (sessionRef.current) sessionRef.current.cancelled = true;
      stopIfOwner(token);
      onLineChange?.(null);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  if (!available) return null;

  const stopVisual = () => {
    setPlaying(false);
    onLineChange?.(null);
  };

  const playFrom = (index, session) => {
    if (session.cancelled || index >= texts.length) {
      stopVisual();
      releasePlayback(token);
      return;
    }
    onLineChange?.(index);
    speaker().speak(texts[index], { onEnd: () => playFrom(index + 1, session) });
  };

  const toggle = () => {
    if (playing) {
      speaker().stop();
      if (sessionRef.current) sessionRef.current.cancelled = true;
      stopVisual();
      releasePlayback(token);
      return;
    }
    const session = { cancelled: false };
    sessionRef.current = session;
    claimPlayback(token, () => {
      session.cancelled = true;
      stopVisual();
    });
    setPlaying(true);
    playFrom(0, session);
  };

  return (
    <button aria-pressed={playing} className="btn ghost" type="button" onClick={toggle}>
      {playing ? "■ 정지" : "▶ 전체 재생"}
    </button>
  );
}
