// TDD Red — senior-dev 작성 (2026-11-14, qa 결함 4)
//
// 유닛 어휘가 자료실을 **표제어 하나**로 여는 쪽(링크)은 `UnitStudyPage.entryLink.test.jsx`가 고정한다.
// 이 파일은 받는 쪽이다: 자료실 목록이 주소의 `ids`를 **목록 상태의 일부로** 읽어야 한다.
//
// ── 계약 (senior-dev, 작업자(AI)_문서/04 §6-1 · §6-7) ────────────────
//   · `?ids=9391` → params.ids = [9391]   (콤마 구분, 숫자만, 순서 유지, 중복 제거, 최대 200 — §6-7)
//   · API URL에 `ids`를 그대로 넘긴다 — 서버는 이미 이 파라미터를 받는다(새 API가 없다)
//   · **적용 조건 1개로 센다** → [조건 초기화]가 뜨고, 해제 칩이 생긴다.
//     조건이 안 보이면 사용자는 왜 한 줄만 나오는지 알 수 없고 돌아갈 길도 없다(05 §9 "주소가 단일 출처").
//   · 칩 **문구**는 designer의 것이다. 여기서 고정하는 것은 "칩이 있다 · 해제하면 ids가 빠진다"까지다.
//
// 이 테스트를 수정하지 말 것 — 계약 변경은 senior-dev 경유 (CLAUDE.md TDD 규칙 2).
import { describe, expect, it, vi } from "vitest";
import { appliedChips } from "./libraryChips.js";
import {
  buildLibraryApiUrl,
  buildLibrarySearch,
  countAppliedFilters,
  parseLibraryParams,
} from "./libraryQuery.js";

describe("parseLibraryParams — ids (작업자(AI)_문서/04 §6-7)", () => {
  it("콤마 구분 숫자를 순서대로 읽는다", () => {
    expect(parseLibraryParams("?ids=9391").ids).toEqual([9391]);
    expect(parseLibraryParams("?ids=9391,9390").ids).toEqual([9391, 9390]);
  });

  it("ids가 없으면 빈 배열 — null을 주지 않는다(화면이 .length로 분기한다)", () => {
    expect(parseLibraryParams("").ids).toEqual([]);
    expect(parseLibraryParams("?q=close").ids).toEqual([]);
  });

  it("숫자가 아닌 값·중복은 버린다 — 주소는 사용자가 손으로 고칠 수 있는 입력이다", () => {
    expect(parseLibraryParams("?ids=9391,abc,9391,,0.5").ids).toEqual([9391]);
  });

  it("200개를 넘기지 않는다 — 서버가 400으로 거절하는 요청을 화면이 먼저 만들지 않는다(§6-7)", () => {
    const many = Array.from({ length: 250 }, (_, i) => i + 1);
    expect(parseLibraryParams(`?ids=${many.join(",")}`).ids).toHaveLength(200);
  });
});

describe("ids는 목록 상태의 일부다", () => {
  it("API URL에 그대로 실린다", () => {
    const params = parseLibraryParams("?ids=9391");
    expect(buildLibraryApiUrl("/api/en/library/vocabulary", params, 50)).toMatch(/[?&]ids=9391(&|$)/);
  });

  it("ids가 없으면 API URL에 키를 만들지 않는다", () => {
    expect(buildLibraryApiUrl("/api/library/vocabulary", parseLibraryParams(""), 50)).not.toMatch(/ids=/);
  });

  it("화면 주소로 되돌려 쓴다 — 조건을 바꿔도 ids가 사라지지 않는다(왕복)", () => {
    const params = parseLibraryParams("?ids=9391");
    expect(buildLibrarySearch(params)).toBe("?ids=9391");
    expect(parseLibraryParams(buildLibrarySearch({ ...params, page: 2 })).ids).toEqual([9391]);
  });

  it("적용된 조건으로 센다 — [조건 초기화]가 보여야 돌아갈 길이 있다", () => {
    expect(countAppliedFilters(parseLibraryParams("?ids=9391"))).toBe(1);
    expect(countAppliedFilters(parseLibraryParams("?ids=9391&q=close"))).toBe(2);
  });

  it("해제 칩이 있고, 누르면 ids만 빠진다 (문구는 designer의 것이라 보지 않는다)", () => {
    const setParams = vi.fn();
    const params = parseLibraryParams("?ids=9391&q=close");

    const chip = appliedChips(params, setParams).find((item) => item.key === "ids");
    expect(chip, "ids 칩이 없다 — 한 줄만 나오는 이유를 화면이 말하지 못한다").toBeDefined();

    chip.onRemove();
    expect(setParams).toHaveBeenCalledTimes(1);
    expect(setParams.mock.calls[0][0]).toMatchObject({ ids: [] });
  });
});
