import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { beforeEach, describe, expect, it } from "vitest";
import { apiError, apiSuccess, stubFetch, unitStudyPayload } from "../test/helpers.jsx";
import { libraryPageFixture } from "../test/apiFixtures.js";
import { AuthProvider } from "../context/AuthContext.jsx";
import { UserDataProvider } from "../context/UserDataContext.jsx";
import { UnitStudyPage } from "./UnitStudyPage.jsx";

/**
 * 확인 문제의 **오답 풀 레벨 조건** (2026-08-25 판정, 감사 높음 2 — 설계/05 §15-1).
 *
 * 오답 풀을 레벨 필터 없이 자료실 첫 페이지에서 가져오면, 학습 순서 정렬이라 **낮은 레벨만** 담긴다.
 * N1 유닛의 보기가 `INTRO | N4 | N1(정답) | N4` 로 나오면 **문제를 읽지 않고 레벨만 봐도 풀린다** —
 * 3단계에서 "같은 품사 우선"을 고친 것과 같은 종류의 품질 결함이다.
 *
 * 판정: **오답 후보는 정답과 같은 레벨에서 먼저 채운다.** 유닛 확인 문제의 풀은 그 유닛이 속한 코스의 레벨이다.
 *
 * 이 테스트를 수정하지 말 것 — 계약 변경은 senior-dev 경유.
 */

/** N1 유닛 — 문법 2개뿐이라 오답 풀 없이는 4지선다를 만들 수 없다 */
const N1_UNIT = unitStudyPayload({
  courseId: 6,
  courseTitle: "고급",
  levelCode: "N1", // ★ 유닛 응답이 코스 레벨 코드를 함께 준다(호출 한 번 계약 유지 — B-7)
  unitNo: 1,
  grammars: [
    { id: 5001, name: "〜んとする", nameKo: "~하려고 하다", explanation: "설명", examples: [], rules: [] },
    { id: 5002, name: "〜まじき", nameKo: "~해서는 안 될", explanation: "설명", examples: [], rules: [] },
  ],
});

function renderUnit() {
  const fetchMock = stubFetch((url) => {
    if (url.includes("/api/users/me")) return apiError(401, "NOT_AUTHENTICATED");
    if (url.includes("/api/library/grammar")) {
      return apiSuccess(
        libraryPageFixture([
          { id: 5003, name: "〜きらいがある", nameKo: "~하는 경향이 있다", level: "N1", hasRules: false },
          { id: 5004, name: "〜べからず", nameKo: "~하지 말 것", level: "N1", hasRules: false },
          { id: 5005, name: "〜をおいて", nameKo: "~을 제외하고", level: "N1", hasRules: false },
        ]),
      );
    }
    return apiSuccess(N1_UNIT);
  });

  render(
    <MemoryRouter initialEntries={["/courses/6/units/1"]}>
      <AuthProvider>
        <UserDataProvider>
          <Routes>
            <Route element={<UnitStudyPage />} path="/courses/:courseId/units/:unitNo" />
          </Routes>
        </UserDataProvider>
      </AuthProvider>
    </MemoryRouter>,
  );
  return fetchMock;
}

beforeEach(() => {
  window.localStorage.clear();
});

describe("오답 풀은 같은 레벨에서 가져온다 (감사 높음 2)", () => {
  it("확인 문제를 열면 그 유닛의 레벨로 자료실 문법을 조회한다", async () => {
    const fetchMock = renderUnit();
    const user = userEvent.setup();

    await user.click(await screen.findByRole("button", { name: "확인 문제" }));

    await waitFor(() => {
      const grammarCalls = fetchMock.mock.calls
        .map(([url]) => decodeURIComponent(String(url)))
        .filter((url) => url.includes("/api/library/grammar"));

      expect(grammarCalls.length).toBeGreaterThan(0);
      // 레벨 필터가 없으면 학습 순서 정렬 때문에 INTRO·N5·N4만 담긴다
      grammarCalls.forEach((url) => expect(url).toContain("level=N1"));
    });
  });
});
