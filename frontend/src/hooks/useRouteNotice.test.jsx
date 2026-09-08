// frontend-dev 작성 — 코드리뷰 선택 1: 라우터 state로 온 성공 안내는 한 번만 보이고
// 히스토리에서 지워져야 한다(뒤로가기·새로고침에 다시 나타나면 방금 또 성공한 것처럼 읽힌다).
import { render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter, Route, Routes, useLocation } from "react-router-dom";
import { describe, expect, it } from "vitest";
import { useRouteNotice } from "./useRouteNotice.js";

function Probe() {
  const notice = useRouteNotice();
  const { state } = useLocation();
  return (
    <>
      <p data-testid="notice">{notice ?? "none"}</p>
      <p data-testid="state">{state?.notice ?? "empty"}</p>
    </>
  );
}

function renderAt(entry) {
  return render(
    <MemoryRouter initialEntries={[entry]}>
      <Routes>
        <Route element={<Probe />} path="/mypage" />
      </Routes>
    </MemoryRouter>,
  );
}

describe("useRouteNotice", () => {
  it("state로 온 안내를 돌려주고, 히스토리 state는 비운다", async () => {
    renderAt({ pathname: "/mypage", state: { notice: "수정했어요" } });

    expect(screen.getByTestId("notice")).toHaveTextContent("수정했어요");
    // 표시는 유지되지만 주소의 state는 지워진다 — 뒤로가기로 돌아와도 다시 뜨지 않는다
    await waitFor(() => expect(screen.getByTestId("state")).toHaveTextContent("empty"));
    expect(screen.getByTestId("notice")).toHaveTextContent("수정했어요");
  });

  it("안내가 없으면 null이고 히스토리를 건드리지 않는다", () => {
    renderAt("/mypage");

    expect(screen.getByTestId("notice")).toHaveTextContent("none");
    expect(screen.getByTestId("state")).toHaveTextContent("empty");
  });
});
