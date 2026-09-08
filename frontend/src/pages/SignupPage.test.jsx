// TDD Red — senior-dev 작성 (2026-09-03 판정 D-9)
//
// 가입 화면이 비밀번호를 "6자 이상"이라 말하고 `minLength=6`으로 막는데, 서버 규칙(JoinDTO @Size(min=4))과
// 비밀번호 변경 화면은 **4자**다. 같은 규칙을 두 화면이 다르게 말하고 그중 하나는 사실이 아니다.
// 최소 길이 값 자체(4→6 여부)는 사람 결정(08 F-23 딸린 항목 — 배포 QA 재검토)이고,
// 이 테스트는 "화면이 서버 규칙과 같은 숫자를 말한다"만 고정한다. 값이 바뀌면 세 곳을 같이 바꾼다.
//
// 이 테스트를 수정하지 말 것 — 계약 변경은 senior-dev 경유 (CLAUDE.md TDD 규칙 2).
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it } from "vitest";
import { SignupPage } from "./SignupPage.jsx";

/** 서버 규칙 — src/main/java/com/test/test/jwt/model/JoinDTO.java @Size(min = 4) */
const SERVER_PASSWORD_MIN = 4;

describe("가입 화면의 비밀번호 안내는 서버 규칙과 같은 숫자를 말한다 (D-9)", () => {
  it("안내 문구가 서버 최소 길이(4자)를 말하고 6자를 말하지 않는다", () => {
    render(
      <MemoryRouter>
        <SignupPage />
      </MemoryRouter>,
    );
    const password = screen.getByLabelText("비밀번호");

    expect(password.getAttribute("placeholder")).toMatch(new RegExp(`${SERVER_PASSWORD_MIN}자 이상`));
    expect(password.getAttribute("placeholder")).not.toMatch(/6자/);
  });

  it("브라우저 검증(minLength)도 서버 규칙보다 엄격하지 않다 — 4자 비밀번호를 화면이 먼저 막지 않는다", () => {
    render(
      <MemoryRouter>
        <SignupPage />
      </MemoryRouter>,
    );
    const password = screen.getByLabelText("비밀번호");
    const minLength = password.getAttribute("minlength");

    // minLength가 없거나(서버에 맡김), 있으면 서버 값과 같아야 한다
    expect(minLength === null || Number(minLength) === SERVER_PASSWORD_MIN).toBe(true);
  });
});
