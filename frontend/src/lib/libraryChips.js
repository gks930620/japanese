// 적용된 조건의 "칩" 표현 — 주소를 몰라도 지금 뭐가 걸려 있는지 한 줄로 보인다 (설계/05 §8).
import { partOfSpeechLabel } from "../constants/partOfSpeech.js";
import { levelText } from "./libraryQuery.js";

/**
 * @param {object} params parseLibraryParams 결과
 * @param {(patch: object) => void} setParams 조건 변경 함수
 * @returns {Array<{key: string, label: string, plain: string, onRemove: () => void}>}
 *          label = 칩에 보이는 문구, plain = 0건 안내에서 조건을 되읽을 때 쓰는 짧은 표기
 */
export function appliedChips(params, setParams) {
  const chips = [];

  if (params.q) {
    chips.push({
      key: "q",
      label: `검색 "${params.q}"`,
      plain: `'${params.q}'`,
      onRemove: () => setParams({ q: "" }),
    });
  }

  params.levels.forEach((level) => {
    chips.push({
      key: `level-${level}`,
      // 칩 줄에 없는 코드(한자 탭의 INTRO)도 적용 칩에는 뜬다 — 해제할 수 있어야 한다(§5-5)
      label: levelText(level),
      plain: levelText(level),
      onRemove: () => setParams({ levels: params.levels.filter((item) => item !== level) }),
    });
  });

  params.pos.forEach((code) => {
    chips.push({
      key: `pos-${code}`,
      label: partOfSpeechLabel(code),
      plain: partOfSpeechLabel(code),
      onRemove: () => setParams({ pos: params.pos.filter((item) => item !== code) }),
    });
  });

  if (params.hasRules) {
    chips.push({
      key: "hasRules",
      label: "활용표만",
      plain: "활용표만",
      onRemove: () => setParams({ hasRules: false }),
    });
  }

  if (params.sort === "KANA") {
    chips.push({
      key: "sort",
      label: "가나순",
      plain: "가나순",
      onRemove: () => setParams({ sort: "LEARNING" }),
    });
  }

  return chips;
}
