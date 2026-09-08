import { TtsButton } from "./TtsControls.jsx";
import { speechTextOf } from "../lib/tts.js";

/**
 * 3줄 병기 블록 (설계/05 §6) — 원문 / 가나 읽기 / 한국어 뜻.
 * kana가 null이면 가나 줄을 렌더링하지 않는다 (API 명세 §2 — 원문이 전부 가나면 null).
 *
 * latin=true면 자형만 본문 폰트로 되돌린다(설계/05 §16-4). 영어 데이터는 kana가 항상 null이라
 * 가나 줄은 자동으로 사라지고 2줄 병기가 된다 — 새 분기가 필요 없다. 영어에는 음성이 없다(§0-2).
 */
export function JpSentence({ jp, kana, meaningKo, latin = false }) {
  return (
    <div className={`jp-sentence${latin ? " latin" : ""}`}>
      <div className="jp-line">
        {jp}
        {/* ja 음성이 없으면 미렌더 — 레이아웃이 현행과 같다(V11) */}
        {!latin && <TtsButton label={jp} text={speechTextOf({ jp, kana })} />}
      </div>
      {kana != null && <div className="kana-line">{kana}</div>}
      <div className="mean-line">{meaningKo}</div>
    </div>
  );
}
