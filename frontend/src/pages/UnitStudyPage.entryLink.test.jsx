// TDD Red — senior-dev 작성 (2026-11-14, qa 결함 4)
//
// ── 무엇이 문제였나 ──────────────────────────────────────────────────
// 유닛 어휘 표의 단어를 누르면 자료실이 **검색어**로 열린다(`?q=close`). 표기 하나에 줄 하나였을 때는
// 맞아 보였지만, **동철이음어를 별개 행으로 가른 뒤**(04 §8-2 · 08 A-8) 거짓이 됐다:
// E2 유닛의 `close`(/kloʊz/ 닫다)를 눌러도 E1의 `close`(/kloʊs/ 가까운)까지 **두 줄이 나온다.**
// 유닛 응답은 어느 줄인지 이미 알고 있다 — `vocabularies[].entryId`. 링크가 그 값을 버린 것이 결함이다.
//
// ── 계약 (senior-dev, 작업자(AI)_문서/04 §6-1 "유닛 어휘 → 자료실 링크는 entryId 기반이다") ──
//   href = `{/en}/library/vocabulary?ids={entryId}`  — `q`를 함께 싣지 않는다
//   근거 값은 `entryId`이고 **행의 `id`가 아니다**(병합된 표제어는 둘이 다르다).
//   서버는 새 API가 필요 없다 — `ids`는 이미 있는 계약이다(§6-7, 어휘는 표제어 대표 id 기준).
//   자료실 화면이 주소의 `ids`를 읽는 쪽 계약은 `lib/libraryQuery.ids.test.js`가 고정한다.
//
// ⚠️ 이 계약은 `UnitStudyPage.library.test.jsx`(frontend-dev 작성)의 "단어 셀이 자료실 검색(q=단어)으로 열린다"를
//    **대체한다.** 그 단언은 더 이상 참이 아니므로 구현과 함께 frontend-dev가 자기 파일에서 갱신한다.
//
// 이 테스트를 수정하지 말 것 — 계약 변경은 senior-dev 경유 (CLAUDE.md TDD 규칙 2).
import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import { apiSuccess, renderAtRoute, stubFetch, unitStudyPayload } from "../test/helpers.jsx";
import { enUnitStudyPayload } from "../test/apiFixtures.js";
import { UnitStudyPage } from "./UnitStudyPage.jsx";

/** 서로를 가르는 쌍 — 표기가 같고 발음·뜻이 다른 두 표제어(04 §8-2의 실제 예) */
const CLOSE_ADJECTIVE = { id: 9390, entryId: 9390, word: "close", ipa: "/kloʊs/", koApprox: "클로우스", meaningKo: "가까운", partOfSpeech: "ADJECTIVE" };
const CLOSE_VERB = { id: 9391, entryId: 9391, word: "close", ipa: "/kloʊz/", koApprox: "클로우즈", meaningKo: "닫다", partOfSpeech: "VERB" };

/** 병합된 표제어 — 행의 id와 대표 id(entryId)가 다르다. 링크는 **대표 id**로 걸려야 한다 */
const MERGED_ROW = { id: 7001, entryId: 6300, word: "leave", ipa: "/liːv/", koApprox: "리브", meaningKo: "떠나다", partOfSpeech: "VERB" };

function renderEnUnit(vocabularies) {
  stubFetch(() => apiSuccess(enUnitStudyPayload({ vocabularies })));
  return renderAtRoute(<UnitStudyPage lang="en" />, {
    path: "/en/courses/:courseId/units/:unitNo",
    route: "/en/courses/102/units/1",
  });
}

async function openVocabStep() {
  const user = userEvent.setup();
  await user.click(await screen.findByRole("button", { name: "어휘" }));
}

/** 어휘 표의 단어 셀 링크들 */
function wordLinks() {
  return [...document.querySelectorAll("a.vocab-word-link")];
}

describe("유닛 어휘 → 자료실 링크는 entryId로 건다 (qa 결함 4)", () => {
  it("검색어가 아니라 그 표제어 하나를 가리킨다", async () => {
    renderEnUnit([CLOSE_VERB]);
    await openVocabStep();

    const [link] = wordLinks();
    expect(link).not.toBeUndefined();
    const href = link.getAttribute("href");
    expect(href).toBe(`/en/library/vocabulary?ids=${CLOSE_VERB.entryId}`);
    // `q`가 함께 실리면 표기가 같은 다른 표제어까지 다시 끌려온다 — 결함이 그대로 남는다
    expect(href).not.toMatch(/[?&]q=/);
  });

  it("표기가 같은 두 어휘는 서로 다른 줄로 열린다 — 가른 것을 링크가 다시 뭉개지 않는다", async () => {
    renderEnUnit([CLOSE_ADJECTIVE]);
    await openVocabStep();
    const adjectiveHref = wordLinks()[0].getAttribute("href");

    expect(adjectiveHref).toBe(`/en/library/vocabulary?ids=${CLOSE_ADJECTIVE.entryId}`);
    expect(adjectiveHref).not.toBe(`/en/library/vocabulary?ids=${CLOSE_VERB.entryId}`);
  });

  it("행의 id가 아니라 표제어 대표 id(entryId)를 쓴다 — 병합된 어휘에서 둘은 다르다", async () => {
    renderEnUnit([MERGED_ROW]);
    await openVocabStep();

    expect(wordLinks()[0].getAttribute("href")).toBe(`/en/library/vocabulary?ids=${MERGED_ROW.entryId}`);
  });

  it("일본어도 같은 규칙이다 — 언어별 분기를 만들지 않는다", async () => {
    stubFetch(() =>
      apiSuccess(
        unitStudyPayload({
          vocabularies: [{ id: 4210, entryId: 4100, word: "学生", kana: "がくせい", meaningKo: "학생", partOfSpeech: "NOUN" }],
        }),
      ),
    );
    renderAtRoute(<UnitStudyPage />, {
      path: "/courses/:courseId/units/:unitNo",
      route: "/courses/2/units/1",
    });
    await openVocabStep();

    expect(wordLinks()[0].getAttribute("href")).toBe("/library/vocabulary?ids=4100");
  });
});
