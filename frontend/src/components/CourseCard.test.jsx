import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it } from "vitest";
import { CourseCard } from "./CourseCard.jsx";

function course(overrides = {}) {
  return {
    id: 2,
    courseNo: 1,
    levelLabel: "JLPT N5",
    title: "왕초보",
    targetAudience: "히라가나부터 시작하는 왕초보",
    goal: "일상 기초 문장을 읽고 말할 수 있어요",
    notice: null,
    status: "AVAILABLE",
    ...overrides,
  };
}

function renderCard(props) {
  return render(
    <MemoryRouter>
      <CourseCard {...props} />
    </MemoryRouter>,
  );
}

describe("CourseCard — 배지 분기 (설계/05 §3-3)", () => {
  it("첫 AVAILABLE 코스만 '여기서 시작하세요'", () => {
    renderCard({ course: course(), isEntry: true });
    expect(screen.getByText("여기서 시작하세요")).toBeInTheDocument();
  });

  it("그 외 AVAILABLE 코스는 '바로 볼 수 있어요' (동일 배지 반복 금지)", () => {
    renderCard({ course: course({ id: 3, courseNo: 2, title: "초급" }), isEntry: false });
    expect(screen.getByText("바로 볼 수 있어요")).toBeInTheDocument();
    expect(screen.queryByText("여기서 시작하세요")).toBeNull();
  });

  it("AVAILABLE 카드는 코스 상세로 가는 링크다", () => {
    renderCard({ course: course(), isEntry: true });
    expect(screen.getByRole("link")).toHaveAttribute("href", "/courses/2");
  });

  it("PREPARING은 '준비중' 배지 + 링크가 아니다 (인수 10)", () => {
    renderCard({ course: course({ id: 1, courseNo: 0, title: "입문", status: "PREPARING" }), isEntry: false });
    expect(screen.getByText("준비중")).toBeInTheDocument();
    expect(screen.queryByRole("link")).toBeNull();
  });

  it("compact(홈 미리보기)에서도 배지 분기는 같다", () => {
    renderCard({ course: course({ id: 4, courseNo: 3, title: "중급" }), isEntry: false, compact: true });
    expect(screen.getByText("바로 볼 수 있어요")).toBeInTheDocument();
  });
});

describe("CourseCard — 진도 반영 (설계/05 §8)", () => {
  it("badge 코드가 오면 그 문구를 쓰고 강조도 코드에서 파생된다", () => {
    renderCard({ course: course({ unitCount: 20 }), badge: "CONTINUE", completedCount: 7 });

    // 배지 문구의 단일 출처는 lib/badgeView.test.js다(C-11) — 2026-09 결정 D-2로 "학습 중인 코스"가 됐다
    expect(screen.getByText("학습 중인 코스")).toBeInTheDocument();
    expect(screen.getByRole("link").className).toContain("entry");
  });

  it("완주 코스는 무채색 배지이고 강조되지 않는다", () => {
    renderCard({ course: course({ unitCount: 20 }), badge: "DONE", completedCount: 20 });

    expect(screen.getByText("✓ 완주")).toBeInTheDocument();
    expect(screen.getByRole("link").className).not.toContain("entry");
  });

  it("완료 유닛이 있으면 진도 막대가 보인다", () => {
    renderCard({ course: course({ unitCount: 20 }), badge: "CONTINUE", completedCount: 7 });
    expect(screen.getByText("7 / 20 유닛")).toBeInTheDocument();
  });

  // 진도 막대의 존재는 클래스가 아니라 **라벨 텍스트**("n / m 유닛")로 판정한다 —
  // 막대와 라벨은 항상 함께 그려지므로(ProgressBar 계약) 라벨이 없으면 막대도 없다(2026-09-03 판정 §6-1).
  it("진도가 0이면 막대가 아예 없다 (현행 화면과 동일)", () => {
    renderCard({ course: course({ unitCount: 20 }), badge: "START", completedCount: 0 });
    expect(screen.queryByText(/\d+ \/ \d+ 유닛/)).toBeNull();
  });

  it("PREPARING 코스에는 진도 막대가 없다 (AC-P-21)", () => {
    renderCard({
      course: course({ id: 1, courseNo: 0, status: "PREPARING", unitCount: 0 }),
      badge: "PREPARING",
      completedCount: 3,
    });
    expect(screen.queryByText(/\d+ \/ \d+ 유닛/)).toBeNull();
    expect(screen.getByText("준비중")).toBeInTheDocument();
  });

  it("badge가 없으면 현행 규칙(isEntry)으로 떨어진다 — 진도 조회 실패 시 화면이 같다 (AC-P-28)", () => {
    renderCard({ course: course(), isEntry: true });
    expect(screen.getByText("여기서 시작하세요")).toBeInTheDocument();
  });
});
