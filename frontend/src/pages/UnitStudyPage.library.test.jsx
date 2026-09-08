// frontend-dev 작성 — 자료실 이터레이션에서 유닛 학습에 추가된 분기(복습 블록·자료실 나가는 링크).
// senior-dev의 UnitStudyPage.test.jsx는 건드리지 않는다.
import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import { apiSuccess, renderAtRoute, stubFetch, unitStudyPayload } from "../test/helpers.jsx";
import { UnitStudyPage } from "./UnitStudyPage.jsx";

function renderUnit(payload, { courseId = 2, unitNo = 1 } = {}) {
  stubFetch(() => apiSuccess(payload));
  return renderAtRoute(<UnitStudyPage />, {
    path: "/courses/:courseId/units/:unitNo",
    route: `/courses/${courseId}/units/${unitNo}`,
  });
}

async function goToStep(user, label) {
  await user.click(await screen.findByRole("button", { name: label }));
}

describe("UnitStudyPage — 복습 블록 (설계/04 §2-3 review)", () => {
  it("review가 null이면 '지금까지 배운 것' 블록을 렌더하지 않는다", async () => {
    const user = userEvent.setup();
    renderUnit(unitStudyPayload({ review: null }));
    await goToStep(user, "정리");

    expect(screen.queryByText("지금까지 배운 것")).toBeNull();
  });

  it("review가 있으면 구간과 문법 명칭을 보여준다", async () => {
    const user = userEvent.setup();
    renderUnit(
      unitStudyPayload({
        unitNo: 5,
        review: { fromUnitNo: 1, toUnitNo: 5, grammarNames: ["名詞+です", "これ・それ・あれ"] },
      }),
      { unitNo: 5 },
    );
    await goToStep(user, "정리");

    expect(screen.getByText("지금까지 배운 것")).toBeInTheDocument();
    expect(screen.getByText(/유닛 1~5 문법/)).toBeInTheDocument();
    expect(screen.getByText("これ・それ・あれ")).toBeInTheDocument();
  });

  it("복습 블록에는 자료실 링크를 넣지 않는다 (설계/05 §8 각주)", async () => {
    const user = userEvent.setup();
    renderUnit(
      unitStudyPayload({ unitNo: 5, review: { fromUnitNo: 1, toUnitNo: 5, grammarNames: ["名詞+です"] } }),
      { unitNo: 5 },
    );
    await goToStep(user, "정리");

    expect(screen.queryByRole("link", { name: /자료실/ })).toBeNull();
  });
});

describe("UnitStudyPage — 자료실 나가는 링크 (설계/05 §11, 인수 29~31)", () => {
  it("문법 스텝: '자료실에서 보기'가 문법 상세를 새 탭으로 연다", async () => {
    renderUnit(unitStudyPayload());

    const link = await screen.findByRole("link", { name: /자료실에서 보기/ });
    expect(link).toHaveAttribute("href", "/library/grammar/1");
    expect(link).toHaveAttribute("target", "_blank");
    expect(link).toHaveAttribute("rel", expect.stringContaining("noopener"));
  });

  it("한자 스텝: 큰 글자가 한자 상세로 가는 새 탭 링크다", async () => {
    const user = userEvent.setup();
    renderUnit(unitStudyPayload());
    await goToStep(user, "한자");

    const link = screen.getByRole("link", { name: /人/ });
    expect(link).toHaveAttribute("href", "/library/kanji/1");
    expect(link).toHaveAttribute("target", "_blank");
  });

  it("어휘 스텝: 단어 셀이 자료실 검색(q=단어)으로 열린다", async () => {
    const user = userEvent.setup();
    renderUnit(unitStudyPayload());
    await goToStep(user, "어휘");

    const link = screen.getByRole("link", { name: /学生/ });
    expect(link).toHaveAttribute("href", `/library/vocabulary?q=${encodeURIComponent("学生")}`);
    expect(link).toHaveAttribute("target", "_blank");
    expect(screen.getByText(/단어를 누르면 자료실에서 열려요/)).toBeInTheDocument();
  });
});
