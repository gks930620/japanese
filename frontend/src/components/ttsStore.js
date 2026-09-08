import { useEffect, useState } from "react";
import { createSpeaker, hasJapaneseVoice } from "../lib/tts.js";

// 음성 재생의 모듈 상태·훅 — 컴포넌트 파일과 분리(react-refresh 규칙).
//
// **재생 주체는 한 번에 하나다**(V5·V6). 주체를 콜백이 아니라 안정적인 토큰(owner)으로 식별한다 —
// 렌더마다 새로 만들어지는 함수로 비교하면 해제가 no-op이 되어 죽은 콜백이 레지스트리에 남는다(코드리뷰 부수 결함).
let sharedSpeaker = null;
let owner = null; // { token, stopVisual }

export function speaker() {
  if (!sharedSpeaker) sharedSpeaker = createSpeaker({});
  return sharedSpeaker;
}

/** 지금 재생 주체가 이 토큰인가 (null을 주면 "아무도 재생 중이 아닌가"를 묻는 것과 같다) */
export function isPlaybackOwner(token) {
  return owner != null && owner.token === token;
}

/** 새 재생 직전 — 이전 주체의 시각 상태를 풀고 이 토큰을 주체로 등록한다 */
export function claimPlayback(token, stopVisual) {
  if (owner && owner.token !== token) owner.stopVisual?.();
  owner = { token, stopVisual };
}

/** 재생 종료 — 이 토큰이 주체일 때만 등록을 푼다 */
export function releasePlayback(token) {
  if (isPlaybackOwner(token)) owner = null;
}

/**
 * 이 토큰이 재생 중이면 **실제로 멈춘다**(V8 — 화면·스텝 이탈).
 * 시각 상태만 정리하면 소리는 계속 난다.
 */
export function stopIfOwner(token) {
  if (!isPlaybackOwner(token)) return;
  speaker().stop();
  owner = null;
}

/** 테스트 전용 — 모듈 전역(speaker·재생 레지스트리)을 초기화한다 */
export function resetTtsForTest() {
  sharedSpeaker = null;
  owner = null;
}

function getSynth() {
  return typeof speechSynthesis !== "undefined" ? speechSynthesis : null;
}

/** ja 음성 존재 여부 — 크롬은 목록이 비동기라 voiceschanged까지 기다린 뒤 판정한다(설계/05 §15-3) */
export function useJapaneseVoice() {
  const [available, setAvailable] = useState(() => hasJapaneseVoice(getSynth()?.getVoices?.() ?? []));

  useEffect(() => {
    const synth = getSynth();
    if (!synth?.addEventListener) return undefined;
    const check = () => setAvailable(hasJapaneseVoice(synth.getVoices?.() ?? []));
    check();
    synth.addEventListener("voiceschanged", check);
    return () => synth.removeEventListener("voiceschanged", check);
  }, []);

  return available;
}
