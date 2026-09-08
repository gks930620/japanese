import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { BookmarkStar } from "./BookmarkStar.jsx";

/** ★ 버튼 (설계/05 §8) — 담을 수 있는 9곳이 전부 이 컴포넌트 하나를 쓴다. */
function renderStar(props) {
  return render(<BookmarkStar name="建" on={false} onToggle={() => {}} {...props} />);
}

describe("BookmarkStar", () => {
  it("담김/안 담김을 글리프와 aria-pressed로 알린다", () => {
    const { rerender } = renderStar({ on: false });
    const star = screen.getByRole("button");
    expect(star).toHaveAttribute("aria-pressed", "false");
    expect(star).toHaveTextContent("☆");

    rerender(<BookmarkStar name="建" on onToggle={() => {}} />);
    expect(screen.getByRole("button")).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByRole("button")).toHaveTextContent("★");
  });

  it("aria-label에 대상 이름이 들어간다", () => {
    renderStar({ name: "建" });
    expect(screen.getByRole("button", { name: /建/ })).toBeInTheDocument();
  });

  it("누르면 반대 상태를 콜백으로 넘긴다", async () => {
    const user = userEvent.setup();
    const onToggle = vi.fn();
    renderStar({ on: false, onToggle });

    await user.click(screen.getByRole("button"));

    expect(onToggle).toHaveBeenCalledWith(true);
  });

  it("클릭이 부모(행·타일 링크)로 번지지 않는다 (AC-B-03·AC-X-02)", async () => {
    const user = userEvent.setup();
    const onParentClick = vi.fn();
    render(
      <a href="/library/kanji/12" onClick={onParentClick}>
        <BookmarkStar name="建" on={false} onToggle={() => {}} />
      </a>,
    );

    await user.click(screen.getByRole("button"));

    expect(onParentClick).not.toHaveBeenCalled();
  });
});
