// 적용된 조건의 "칩" 표현 — 주소를 몰라도 지금 뭐가 걸려 있는지 한 줄로 보인다 (작업자(AI)_문서/05 §8).
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

  // 유닛 어휘에서 "그 표제어 하나"로 좁혀 들어온 상태 (작업자(AI)_문서/04 §6-1).
  // 조건이 보이지 않으면 사용자는 왜 한 줄만 나오는지 알 수 없고 돌아갈 길도 없다.
  // ⚠️ **문구는 임시다** — designer 확정 대기(계약이 정하는 것은 "칩이 있다 · 해제하면 ids가 빠진다"까지다).
  if (params.ids?.length) {
    chips.push({
      key: "ids",
      label: "선택한 항목만",
      plain: "선택한 항목만",
      onRemove: () => setParams({ ids: [] }),
    });
  }

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
