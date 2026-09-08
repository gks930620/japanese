import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import { apiError, apiSuccess, renderAtRoute, stubFetch, unitStudyPayload } from "../test/helpers.jsx";
import { UnitStudyPage } from "./UnitStudyPage.jsx";

function renderUnit(payload, { courseId = 2, unitNo = 1 } = {}) {
  stubFetch((url) => (url.includes("/units/") ? apiSuccess(payload) : apiSuccess({ id: 1, title: "입문", levelLabel: "문자" })));
  return renderAtRoute(<UnitStudyPage />, {
    path: "/courses/:courseId/units/:unitNo",
    route: `/courses/${courseId}/units/${unitNo}`,
  });
}

/** 정리(마지막) 스텝으로 이동 */
async function goToSummary(user) {
  await user.click(await screen.findByRole("button", { name: "정리" }));
}

describe("UnitStudyPage — 완료 분기 (설계/04 §2-3 nextUnitNo·nextCourse)", () => {
  it("마지막 유닛이 아니면 '다음 유닛' 버튼이 보인다", async () => {
    const user = userEvent.setup();
    renderUnit(unitStudyPayload({ nextUnitNo: 2, nextCourse: null }));
    await goToSummary(user);

    expect(screen.getByRole("link", { name: /다음 유닛/ })).toHaveAttribute("href", "/courses/2/units/2");
    expect(screen.queryByRole("link", { name: /시작하기/ })).toBeNull();
  });

  it("마지막 유닛 + 다음 코스 AVAILABLE → '다음 코스 시작하기'가 다음 코스 상세로 간다", async () => {
    const user = userEvent.setup();
    renderUnit(
      unitStudyPayload({
        unitNo: 20,
        nextUnitNo: null,
        nextCourse: { id: 3, courseNo: 2, levelLabel: "JLPT N4", title: "초급", status: "AVAILABLE" },
      }),
      { unitNo: 20 },
    );
    await goToSummary(user);

    const link = screen.getByRole("link", { name: /시작하기/ });
    expect(link).toHaveAttribute("href", "/courses/3");
    expect(screen.queryByRole("link", { name: /다음 유닛/ })).toBeNull();
  });

  it("마지막 유닛 + 다음 코스 PREPARING → '코스 목록으로' + 준비중 안내", async () => {
    const user = userEvent.setup();
    renderUnit(
      unitStudyPayload({
        unitNo: 25,
        nextUnitNo: null,
        nextCourse: { id: 6, courseNo: 5, levelLabel: "JLPT N1", title: "고급", status: "PREPARING" },
      }),
      { courseId: 5, unitNo: 25 },
    );
    await goToSummary(user);

    expect(screen.getByRole("link", { name: /코스 목록으로/ })).toHaveAttribute("href", "/courses");
    expect(screen.getByText(/준비하고 있어요/)).toBeInTheDocument();
    expect(screen.queryByRole("link", { name: /시작하기/ })).toBeNull();
  });

  it("마지막 유닛 + nextCourse null → '코스 목록으로'", async () => {
    const user = userEvent.setup();
    renderUnit(unitStudyPayload({ unitNo: 20, nextUnitNo: null, nextCourse: null }), { unitNo: 20 });
    await goToSummary(user);

    expect(screen.getByRole("link", { name: /코스 목록으로/ })).toHaveAttribute("href", "/courses");
  });
});

describe("UnitStudyPage — 오류 분기 (§7-10 ①·코드리뷰 400 판정)", () => {
  it("COURSE_PREPARING(404)이면 준비중 안내를 보여준다", async () => {
    stubFetch((url) =>
      url.includes("/units/")
        ? apiError(404, "COURSE_PREPARING", "준비중")
        : apiSuccess({ id: 6, title: "고급", levelLabel: "JLPT N1" }),
    );
    renderAtRoute(<UnitStudyPage />, {
      path: "/courses/:courseId/units/:unitNo",
      route: "/courses/6/units/1",
    });

    expect(await screen.findByText(/준비중인 코스예요/)).toBeInTheDocument();
  });

  it("404(NOT_FOUND)면 '찾을 수 없는 페이지'를 보여준다", async () => {
    stubFetch(() => apiError(404, "NOT_FOUND"));
    renderAtRoute(<UnitStudyPage />, {
      path: "/courses/:courseId/units/:unitNo",
      route: "/courses/2/units/99",
    });

    expect(await screen.findByText(/찾을 수 없는 페이지/)).toBeInTheDocument();
  });

  it("400(잘못된 주소)도 404 화면으로 — 재시도 버튼을 주지 않는다", async () => {
    stubFetch(() => apiError(400, "TYPE_MISMATCH"));
    renderAtRoute(<UnitStudyPage />, {
      path: "/courses/:courseId/units/:unitNo",
      route: "/courses/2/units/abc",
    });

    expect(await screen.findByText(/찾을 수 없는 페이지/)).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "다시 시도" })).toBeNull();
  });

  it("그 밖의 오류(500)는 '다시 시도' 버튼이 있는 오류 카드 (인수 21)", async () => {
    stubFetch(() => apiError(500, "INTERNAL_ERROR"));
    renderAtRoute(<UnitStudyPage />, {
      path: "/courses/:courseId/units/:unitNo",
      route: "/courses/2/units/1",
    });

    expect(await screen.findByRole("button", { name: "다시 시도" })).toBeInTheDocument();
  });

  it("'다시 시도'를 누르면 같은 API를 다시 호출한다", async () => {
    const user = userEvent.setup();
    let attempt = 0;
    stubFetch(() => {
      attempt += 1;
      return attempt === 1 ? apiError(500, "INTERNAL_ERROR") : apiSuccess(unitStudyPayload());
    });
    renderAtRoute(<UnitStudyPage />, {
      path: "/courses/:courseId/units/:unitNo",
      route: "/courses/2/units/1",
    });

    await user.click(await screen.findByRole("button", { name: "다시 시도" }));

    await waitFor(() => expect(screen.getByText("名詞+です")).toBeInTheDocument());
  });
});
