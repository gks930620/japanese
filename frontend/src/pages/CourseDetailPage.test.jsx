import { screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { apiError, apiSuccess, renderAtRoute, stubFetch } from "../test/helpers.jsx";
import { CourseDetailPage } from "./CourseDetailPage.jsx";

function courseDetail(overrides = {}) {
  return {
    id: 2,
    courseNo: 1,
    levelLabel: "JLPT N5",
    title: "왕초보",
    targetAudience: "왕초보",
    goal: "도달점",
    notice: null,
    description: "코스 소개",
    status: "AVAILABLE",
    summary: { unitCount: 1, grammarCount: 3, kanjiCount: 5, vocabCount: 18 },
    units: [{ unitNo: 1, title: "저는 ○○입니다", grammarCount: 3, kanjiCount: 5, vocabCount: 18 }],
    ...overrides,
  };
}

function renderDetail(courseId = 2) {
  return renderAtRoute(<CourseDetailPage />, { path: "/courses/:courseId", route: `/courses/${courseId}` });
}

describe("CourseDetailPage — 상태 분기", () => {
  it("AVAILABLE이면 summary 집계와 유닛 목록을 보여준다 (숫자 하드코딩 금지 계약)", async () => {
    stubFetch(() => apiSuccess(courseDetail()));
    renderDetail();

    expect(await screen.findByText("코스 소개")).toBeInTheDocument();
    expect(screen.getByText("3")).toBeInTheDocument(); // 문법 집계
    const unitLink = screen.getByRole("link", { name: /저는 ○○입니다/ });
    expect(unitLink).toHaveAttribute("href", "/courses/2/units/1");
  });

  it("PREPARING은 200 응답이지만 준비중 안내로 분기한다 (설계/04 §2-2)", async () => {
    stubFetch(() =>
      apiSuccess(courseDetail({ id: 1, title: "입문", levelLabel: "문자", status: "PREPARING", units: [], description: null })),
    );
    renderDetail(1);

    expect(await screen.findByText(/준비중인 코스예요/)).toBeInTheDocument();
    expect(screen.getByText(/입문\(문자\) 코스는 지금 만들고 있어요/)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "코스 목록으로" })).toHaveAttribute("href", "/courses");
  });

  it("404면 '찾을 수 없는 페이지'", async () => {
    stubFetch(() => apiError(404, "NOT_FOUND"));
    renderDetail(999);

    expect(await screen.findByText(/찾을 수 없는 페이지/)).toBeInTheDocument();
  });

  it("400(비숫자 주소)도 404 화면 — 재시도로 회복 불가하므로 (코드리뷰 판정)", async () => {
    stubFetch(() => apiError(400, "TYPE_MISMATCH"));
    renderDetail("abc");

    expect(await screen.findByText(/찾을 수 없는 페이지/)).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "다시 시도" })).toBeNull();
  });

  it("500은 '다시 시도'가 있는 오류 카드", async () => {
    stubFetch(() => apiError(500, "INTERNAL_ERROR"));
    renderDetail();

    expect(await screen.findByRole("button", { name: "다시 시도" })).toBeInTheDocument();
  });
});
