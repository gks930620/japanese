import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import { jsonResponse, stubFetch } from "../test/helpers.jsx";
import { renderLibrary } from "../test/libraryHelpers.jsx";
import { LibraryKanjiPage } from "./LibraryKanjiPage.jsx";
import { LibraryGrammarPage } from "./LibraryGrammarPage.jsx";

/**
 * 잘못된 필터 값 — **서버가 정확히 말한 것을 화면이 뭉개지 않는다** (2026-08-25 판정 A-L1)
 *
 * `/library/kanji?level=E1`(영어 레벨을 일본어 자료실에) 같은 주소에 서버는 정확히 답한다:
 *   `400 BUSINESS_RULE_VIOLATION "지원하지 않는 레벨입니다: E1 (INTRO·N5·N4·N3·N2·N1 중 하나)"`
 * 그런데 화면은 이것을 `ApiErrorCard`로 받아 **"네트워크 상태를 확인한 뒤 다시 시도해 주세요" + [다시 시도]** 를 띄운다.
 * 두 가지가 동시에 틀렸다 — ① 원인을 잘못 말한다(네트워크가 아니라 조건이다) ② **몇 번을 눌러도 400이다**(08 C-12 ④).
 *
 * 계약:
 *   ① 400이면 **서버 `message`를 그대로** 보여 준다 — 화면이 원인을 지어내지 않는다(08 B-2).
 *   ② 400에는 [다시 시도]를 주지 않는다. 대신 **[조건 초기화]** 로 실제로 빠져나갈 수 있게 한다.
 *   ③ 5xx·네트워크 실패는 지금 그대로 [다시 시도]다 — 그건 눌러서 회복되는 실패다.
 *
 * 이 테스트를 수정하지 말 것 — 계약 변경은 senior-dev 경유.
 */

const BAD_LEVEL_MESSAGE = "지원하지 않는 레벨입니다: E1 (INTRO·N5·N4·N3·N2·N1 중 하나)";

function renderKanjiWith(status, body) {
  stubFetch(() => jsonResponse(body, status));
  return renderLibrary(<LibraryKanjiPage />, {
    path: "/library/kanji",
    route: "/library/kanji?level=E1",
  });
}

describe("잘못된 필터 값의 400 (A-L1)", () => {
  it("서버가 말한 이유를 그대로 보여 준다 — 네트워크 이야기를 하지 않는다", async () => {
    renderKanjiWith(400, { success: false, message: BAD_LEVEL_MESSAGE, errorCode: "BUSINESS_RULE_VIOLATION" });

    expect(await screen.findByText(BAD_LEVEL_MESSAGE)).toBeInTheDocument();
    expect(screen.queryByText(/네트워크 상태를 확인/)).not.toBeInTheDocument();
  });

  it("[다시 시도] 대신 [조건 초기화]를 준다 — 눌러서 회복되는 실패가 아니다 (08 C-12 ④)", async () => {
    renderKanjiWith(400, { success: false, message: BAD_LEVEL_MESSAGE, errorCode: "BUSINESS_RULE_VIOLATION" });

    expect(await screen.findByRole("button", { name: "조건 초기화" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "다시 시도" })).not.toBeInTheDocument();
  });

  it("[조건 초기화]를 누르면 조건 없는 주소로 다시 조회한다", async () => {
    const fetchMock = stubFetch((url) =>
      String(url).includes("level=")
        ? jsonResponse({ success: false, message: BAD_LEVEL_MESSAGE, errorCode: "BUSINESS_RULE_VIOLATION" }, 400)
        : jsonResponse({ success: true, message: "ok", data: { content: [], page: 0, size: 60, totalElements: 0, totalAll: 0, totalPages: 0 } }, 200),
    );
    renderLibrary(<LibraryKanjiPage />, { path: "/library/kanji", route: "/library/kanji?level=E1" });
    const user = userEvent.setup();

    await user.click(await screen.findByRole("button", { name: "조건 초기화" }));

    const lastUrl = String(fetchMock.mock.calls[fetchMock.mock.calls.length - 1][0]);
    expect(lastUrl).not.toContain("level=");
  });

  it("영어 자료실도 같다 — 같은 규칙이 두 과정에 적용된다", async () => {
    const message = "지원하지 않는 레벨입니다: N5 (E1·E2·E3·E4·E5 중 하나)";
    stubFetch(() => jsonResponse({ success: false, message, errorCode: "BUSINESS_RULE_VIOLATION" }, 400));
    renderLibrary(<LibraryGrammarPage lang="en" />, {
      path: "/en/library/grammar",
      route: "/en/library/grammar?level=N5",
    });

    expect(await screen.findByText(message)).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "다시 시도" })).not.toBeInTheDocument();
  });

  it("500은 지금 그대로 [다시 시도]다 (회귀 — 눌러서 회복되는 실패)", async () => {
    renderKanjiWith(500, { success: false, message: "서버 오류", errorCode: "INTERNAL_SERVER_ERROR" });

    expect(await screen.findByRole("button", { name: "다시 시도" })).toBeInTheDocument();
    expect(screen.getByText(/네트워크 상태를 확인/)).toBeInTheDocument();
  });
});
