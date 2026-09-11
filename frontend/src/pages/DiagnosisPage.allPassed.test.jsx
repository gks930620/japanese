import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { describe, expect, it } from "vitest";
import { apiError, apiSuccess, stubFetch } from "../test/helpers.jsx";
import {
  coursesFixture,
  grammarListItemFixture,
  libraryPageFixture,
  vocabularyEntryFixture,
} from "../test/apiFixtures.js";
import { passEveryStage } from "../test/diagnosisHelpers.js";
import { DiagnosisPage } from "./DiagnosisPage.jsx";

/**
 * 진단 결과의 "그 위 코스" 안내 — **오지 않을 약속을 하지 않는다** (2026-08-25 판정 M4)
 *
 * N1은 JLPT 최상위이자 마지막 코스다. 그 위에는 코스가 없고 준비 중인 것도 없다 —
 * 전 단계를 통과한 사람에게만 보이는 문구가 하필 **사실이 아닌 약속**이 되면 안 된다.
 * 판정: 이 안내는 **실제로 PREPARING 코스가 있을 때만** 그린다.
 *
 * ★ 2026-09-10 개편 반영: 계단이 **입문부터 6단계**가 되고, 한 단계는 **6문항을 한 번에 제출**한다.
 *   (기존 파일은 "한 문항씩 클릭"으로 전 단계를 통과시켰다 — 그 조작이 더 이상 존재하지 않는다.)
 *
 * 이 테스트를 수정하지 말 것 — 계약 변경은 senior-dev 경유.
 */

/** 지문 번호와 보기 번호가 짝지어진 재료 — 무작위 출제에도 정답을 특정할 수 있다 */
const VOCAB = libraryPageFixture(
  Array.from({ length: 8 }, (_, i) =>
    vocabularyEntryFixture({ id: 100 + i, word: `たんご${i + 1}`, kana: `たんご${i + 1}`, meanings: [`뜻${i + 1}`] }),
  ),
);
const GRAMMAR = libraryPageFixture(
  Array.from({ length: 8 }, (_, i) =>
    grammarListItemFixture({
      id: 300 + i,
      name: `〜ぶんぽう${i + 1}`,
      nameKo: `문법뜻${i + 1}`,
      examples: [{ jp: `これは ぶんぽう${i + 1}です。`, meaningKo: `예문뜻${i + 1}` }],
    }),
  ),
);

function renderPage(courses) {
  stubFetch((url) => {
    if (url.includes("/api/users/me")) return apiError(401, "NOT_AUTHENTICATED");
    if (url.includes("/api/courses")) return apiSuccess(courses);
    if (url.includes("/api/library/grammar")) return apiSuccess(GRAMMAR);
    if (url.includes("/api/library/vocabulary")) return apiSuccess(VOCAB);
    return apiSuccess(null);
  });
  render(
    <MemoryRouter initialEntries={["/diagnosis"]}>
      <Routes>
        <Route element={<DiagnosisPage />} path="/diagnosis" />
      </Routes>
    </MemoryRouter>,
  );
}

describe("전체 통과 안내 (M4)", () => {
  it("준비중 코스가 하나도 없으면 '그 위 코스는 준비 중' 안내를 하지 않는다", async () => {
    const courses = coursesFixture(); // 실제 상태 — 6개 전부 AVAILABLE, N1이 마지막이다
    expect(courses.every((course) => course.status === "AVAILABLE")).toBe(true);

    renderPage(courses);
    const user = userEvent.setup();
    await user.click(await screen.findByRole("button", { name: "시작하기" }));
    await passEveryStage(user);

    expect(screen.getByRole("link", { name: /고급\(JLPT N1\) 코스 시작하기/ })).toBeInTheDocument();
    expect(screen.queryByText(/준비하고 있어요/)).not.toBeInTheDocument();
    // 여섯 단계를 전부 진행했으므로 근거 표의 행도 여섯이다(A19)
    expect(screen.getByRole("row", { name: /문자/ })).toBeInTheDocument();
    expect(screen.getByRole("row", { name: /JLPT N1/ })).toBeInTheDocument();
  });

  it("정말로 준비중인 코스가 있으면 그때는 안내한다", async () => {
    // N1만 준비중으로 되돌린다 — 계단은 입문~N2 다섯 단계가 되고, 그 위(N1)는 실제로 준비 중이다
    const courses = coursesFixture().map((course) =>
      course.courseNo === 5 ? { ...course, status: "PREPARING", unitCount: 0 } : course,
    );

    renderPage(courses);
    const user = userEvent.setup();
    await user.click(await screen.findByRole("button", { name: "시작하기" }));
    await passEveryStage(user);

    expect(await screen.findByText(/준비하고 있어요/)).toBeInTheDocument();
  });
});
