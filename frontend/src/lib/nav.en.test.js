import { describe, expect, it } from "vitest";
import { navItems, isNavItemActive, NAV_ITEMS } from "./nav.js";

/**
 * GNB는 **보고 있는 과정을 따라간다** (2026-08-25 판정 A-H1 · 설계/05 §16-4 · 인수 A-5·A-6)
 *
 * `NAV_ITEMS`는 상수 하나라 과정에 따라 갈리지 않는다. 그래서 영어 화면에서 "자료실"을 누르면
 * **한자 1,350자 목록**에 떨어지고(설계/05 §16-4가 "구조적으로 줄인다"고 한 바로 그 사고가 기본 동작이다),
 * 접두가 `/library`라 `/en/library`에서는 **어느 메뉴에도 활성 표시가 없다** — 사용자는 "메뉴 밖 어딘가"에 선다.
 *
 * 계약: **`navItems(pathname)`** 하나가 지금 경로를 보고 목적지와 접두를 갈아 끼운다.
 *   - `/en` 하위  → 학습 `/en/courses`(접두 `/en/courses`) · 자료실 `/en/library/expressions`(접두 `/en/library`)
 *   - 그 밖       → 지금과 같다(`/courses` · `/library/kanji`)
 *   - 커뮤니티는 **과정 공용**이라 갈리지 않는다(설계/05 §16-4 — 메뉴를 언어별로 늘리지 않는다)
 * 활성 판정은 기존 `isNavItemActive`를 그대로 쓴다 — 새 판정 규칙을 만들지 않는다.
 *
 * 이 테스트를 수정하지 말 것 — 계약 변경은 senior-dev 경유.
 */

const labelOf = (items, label) => items.find((item) => item.label === label);

describe("navItems — 과정을 따라가는 GNB (A-H1)", () => {
  it("일본어 경로에서는 지금과 같다 (회귀)", () => {
    expect(navItems("/courses")).toEqual(NAV_ITEMS);
    expect(navItems("/library/kanji")).toEqual(NAV_ITEMS);
    expect(navItems("/")).toEqual(NAV_ITEMS);
  });

  it("영어 경로에서는 학습·자료실이 영어 과정으로 간다", () => {
    const items = navItems("/en/library/expressions");

    expect(labelOf(items, "학습").to).toBe("/en/courses");
    expect(labelOf(items, "자료실").to).toBe("/en/library/expressions");
  });

  it("메뉴는 세 개 그대로다 — 과정별로 늘리지 않는다 (설계/05 §16-4)", () => {
    expect(navItems("/en/courses").map((item) => item.label)).toEqual(["학습", "자료실", "커뮤니티"]);
    expect(labelOf(navItems("/en/courses"), "커뮤니티")).toEqual(labelOf(NAV_ITEMS, "커뮤니티"));
  });

  it("영어 화면에서 활성 표시가 켜진다 — 접두도 함께 갈린다", () => {
    const items = navItems("/en/library/expressions");
    expect(isNavItemActive("/en/library/expressions", labelOf(items, "자료실"))).toBe(true);
    expect(isNavItemActive("/en/library/grammar", labelOf(items, "자료실"))).toBe(true);
    expect(isNavItemActive("/en/library/expressions", labelOf(items, "학습"))).toBe(false);

    const study = labelOf(navItems("/en/courses/101/units/1"), "학습");
    expect(isNavItemActive("/en/courses/101/units/1", study)).toBe(true);
  });

  it("일본어 접두가 영어 경로를 삼키지 않는다 — 지금 활성 표시가 꺼지는 원인", () => {
    // /en/courses는 일본어 학습(접두 /courses)에 걸리지 않는다. 그래서 과정별 접두가 필요하다
    expect(isNavItemActive("/en/courses", labelOf(NAV_ITEMS, "학습"))).toBe(false);
    expect(isNavItemActive("/en/library/expressions", labelOf(NAV_ITEMS, "자료실"))).toBe(false);
  });

  it("`/english-club` 같은 이름에 속지 않는다", () => {
    expect(navItems("/english-club")).toEqual(NAV_ITEMS);
  });
});
