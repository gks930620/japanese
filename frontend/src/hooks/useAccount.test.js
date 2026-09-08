import { describe, expect, it } from "vitest";
import { loginMethodLabel, providerLabel } from "./useAccount.js";

/**
 * 소셜 분기의 근거는 `passwordChangeable`·`emailEditable` 플래그이고(설계/04 §4-1),
 * `provider` 문자열은 **문구를 고를 때만** 쓴다. 이 파일은 그 문구 함수만 고정한다.
 */
describe("providerLabel — 문구 전용", () => {
  it("제공자 이름을 한국어로 바꾼다", () => {
    expect(providerLabel("kakao")).toBe("카카오");
    expect(providerLabel("google")).toBe("구글");
  });

  it("모르는 값은 로컬 취급 문구로 떨어진다", () => {
    expect(providerLabel("LOCAL")).toBe("아이디");
    expect(providerLabel(undefined)).toBe("아이디");
  });
});

describe("loginMethodLabel — 프로필 카드의 '로그인 방식'", () => {
  it("로컬은 아이디로 로그인", () => {
    expect(loginMethodLabel("LOCAL")).toBe("아이디로 로그인");
  });

  it("소셜은 제공자 이름을 반복하지 않는다 (같은 화면의 안내가 이미 말한다)", () => {
    expect(loginMethodLabel("kakao")).toBe("소셜 로그인");
    expect(loginMethodLabel("google")).toBe("소셜 로그인");
  });
});
