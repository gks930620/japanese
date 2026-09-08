import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { ProgressBar } from "./ProgressBar.jsx";

/** 진도 막대 (설계/05 §8) — 선형 바 + 숫자 라벨을 항상 함께 쓴다. */
describe("ProgressBar", () => {
  it("진도 0이면 아무것도 렌더링하지 않는다 (빈 막대 금지)", () => {
    const { container } = render(<ProgressBar completed={0} total={20} />);
    expect(container).toBeEmptyDOMElement();
  });

  it("총 유닛이 0이어도(PREPARING) 렌더링하지 않는다 (AC-P-21)", () => {
    const { container } = render(<ProgressBar completed={0} total={0} />);
    expect(container).toBeEmptyDOMElement();
  });

  // 킷(Lets) 교체로 클래스 이름이 바뀐다 — 테스트는 클래스가 아니라 **역할·텍스트·aria**로 본다(2026-09-03 판정 §6-1).
  // 막대 자체는 aria-hidden이므로 "라벨 말고는 접근성 트리에 아무것도 없다"로 검증한다.
  it("숫자 라벨이 접근성 정보를 담당한다 (막대는 aria-hidden)", () => {
    const { container } = render(<ProgressBar completed={7} total={20} />);

    expect(screen.getByText("7 / 20 유닛")).toBeInTheDocument();
    expect(container.querySelector('[role="progressbar"]')).toBeNull();
    // 라벨 외의 요소는 전부 aria-hidden 아래에 있다 — 접근성 트리에 남는 것은 텍스트 하나
    const hidden = container.querySelectorAll('[aria-hidden="true"]');
    expect(hidden.length).toBeGreaterThan(0);
  });

  it("suffix로 라벨 꼬리를 바꾼다 (코스 상세: '완료')", () => {
    render(<ProgressBar completed={7} total={20} suffix="유닛 완료" />);
    expect(screen.getByText("7 / 20 유닛 완료")).toBeInTheDocument();
  });

  /** 채움 요소 — 클래스가 아니라 "인라인 width 스타일을 가진 유일한 요소"로 찾는다(킷 클래스 무관) */
  function fillOf(container) {
    const fills = Array.from(container.querySelectorAll("[style]")).filter((el) => el.style.width);
    expect(fills).toHaveLength(1);
    return fills[0];
  }

  it("완료 수가 총 유닛보다 커도 막대와 라벨이 100%에서 멈춘다", () => {
    const { container } = render(<ProgressBar completed={25} total={20} />);

    expect(fillOf(container)).toHaveStyle({ width: "100%" });
    expect(screen.getByText("20 / 20 유닛")).toBeInTheDocument();
  });

  it("채움 폭은 비율을 그대로 쓴다", () => {
    const { container } = render(<ProgressBar completed={5} total={20} />);
    expect(fillOf(container)).toHaveStyle({ width: "25%" });
  });
});
