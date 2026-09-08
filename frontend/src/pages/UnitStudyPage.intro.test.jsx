import { render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { beforeEach, describe, expect, it } from "vitest";
import { apiError, apiSuccess, stubFetch, unitStudyPayload } from "../test/helpers.jsx";
import { AuthProvider } from "../context/AuthContext.jsx";
import { UserDataProvider } from "../context/UserDataContext.jsx";
import { UnitStudyPage } from "./UnitStudyPage.jsx";

/**
 * 입문 유닛 — 한자 스텝이 없다 (설계/06 §2·§6 판정 J-1 — TDD Red, senior-dev 작성)
 *
 * 서버는 `kanjis: []`를 **필드째** 보낸다(04 §1-3 — 배열은 null이 아니다).
 * 화면은 그것을 읽어 **한자 스텝 자체를 만들지 않는다** — 칩도, 빈 카드도, "한자가 없어요" 안내도 없다.
 * 없는 것을 사과하면 결핍이 부각된다(음성 미지원 기기·획수 미도입과 같은 판단).
 *
 * 이 테스트를 수정하지 말 것 — 계약 변경은 senior-dev 경유.
 */

const INTRO_PAYLOAD = unitStudyPayload({
  courseId: 1,
  courseTitle: "입문",
  unitNo: 1,
  title: "히라가나 あ행·か행 · 첫 인사",
  totalUnits: 10,
  kanjis: [], // ★ 입문의 정의
  grammars: [
    { id: 4001, name: "おはようございます", nameKo: "안녕하세요(아침)", explanation: "설명", examples: [], rules: [] },
    { id: 4002, name: "ありがとうございます", nameKo: "고맙습니다", explanation: "설명", examples: [], rules: [] },
  ],
  vocabularies: [{ id: 4101, word: "あさ", kana: null, meaningKo: "아침", partOfSpeech: "NOUN" }],
});

function renderIntroUnit() {
  stubFetch((url) =>
    url.includes("/api/users/me") ? apiError(401, "NOT_AUTHENTICATED") : apiSuccess(INTRO_PAYLOAD),
  );
  render(
    <MemoryRouter initialEntries={["/courses/1/units/1"]}>
      <AuthProvider>
        <UserDataProvider>
          <Routes>
            <Route element={<UnitStudyPage />} path="/courses/:courseId/units/:unitNo" />
          </Routes>
        </UserDataProvider>
      </AuthProvider>
    </MemoryRouter>,
  );
}

beforeEach(() => {
  window.localStorage.clear();
});

describe("입문 유닛의 스텝 구성 (J-1)", () => {
  it("한자 스텝 칩이 없다", async () => {
    renderIntroUnit();

    await waitFor(() => expect(screen.getByRole("button", { name: "정리" })).toBeInTheDocument());
    expect(screen.queryByRole("button", { name: "한자" })).not.toBeInTheDocument();
  });

  it("한자가 없다는 안내도 없다 — 빈 카드도 만들지 않는다", async () => {
    renderIntroUnit();

    await waitFor(() => expect(screen.getByRole("button", { name: "정리" })).toBeInTheDocument());
    expect(screen.queryByText(/한자가 없|한자 없음/)).not.toBeInTheDocument();
  });

  it("스텝 수가 하나 줄어든다 — 문법2 + 회화 + 어휘 + 정리", async () => {
    renderIntroUnit();

    // 스텝 표시가 전체 6개를 가리킨다 — 문법2 + 회화 + 어휘 + 정리 + 확인 문제.
    // (한자 스텝이 빠진 결과. 일반 코스는 7개다 — 설계/06 §6 판정 J-1)
    await waitFor(() => expect(screen.getByText(/스텝 1 \/ 6/)).toBeInTheDocument());
  });

  it("나머지 스텝은 그대로 있다", async () => {
    renderIntroUnit();

    await waitFor(() => expect(screen.getByRole("button", { name: "회화" })).toBeInTheDocument());
    expect(screen.getByRole("button", { name: "어휘" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "정리" })).toBeInTheDocument();
  });

  it("확인 문제 스텝은 그대로 있고, 한자 재료가 없어도 문제를 만든다", async () => {
    renderIntroUnit();

    await waitFor(() => expect(screen.getByRole("button", { name: "확인 문제" })).toBeInTheDocument());
  });
});
