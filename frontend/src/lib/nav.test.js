import { describe, expect, it } from "vitest";
import { NAV_ITEMS, isNavItemActive, COURSE_TRACKS, activeTrack } from "./nav.js";

describe("GNB 메뉴 — 채팅 제거 후 3개 (2026-08-17 사용자 결정, 설계/04 §5)", () => {
  // 채팅 메뉴 제거의 Red — frontend-dev가 NAV_ITEMS에서 채팅을 지우면 Green이 된다
  it("순서는 학습 → 자료실 → 커뮤니티 (채팅 없음)", () => {
    expect(NAV_ITEMS.map((item) => item.label)).toEqual(["학습", "자료실", "커뮤니티"]);
  });

  it("자료실은 기본 탭인 한자 목록으로 간다 (인수 2)", () => {
    expect(NAV_ITEMS.find((item) => item.label === "자료실").to).toBe("/library/kanji");
  });
});

describe("isNavItemActive — 접두 판정 (인수 4)", () => {
  const library = NAV_ITEMS.find((item) => item.label === "자료실");
  const study = NAV_ITEMS.find((item) => item.label === "학습");

  it("자료실은 /library로 시작하는 모든 경로에서 활성 (다른 탭·상세 포함)", () => {
    expect(isNavItemActive("/library/kanji", library)).toBe(true);
    expect(isNavItemActive("/library/grammar", library)).toBe(true);
    expect(isNavItemActive("/library/kanji/12", library)).toBe(true);
    expect(isNavItemActive("/library", library)).toBe(true);
  });

  it("학습은 /courses 하위에서 활성, 자료실 경로에서는 비활성", () => {
    expect(isNavItemActive("/courses/2/units/3", study)).toBe(true);
    expect(isNavItemActive("/library/kanji", study)).toBe(false);
    expect(isNavItemActive("/library/kanji", library)).toBe(true);
  });

  it("접두가 겹치는 다른 경로를 활성으로 오인하지 않는다", () => {
    expect(isNavItemActive("/coursesomething", study)).toBe(false);
    expect(isNavItemActive("/", study)).toBe(false);
  });
});

describe("과정 스위처 — 일본어 / 영어 (설계/05 §16)", () => {
  it("두 과정만 있고 각 진입점은 코스 목록이다 — GNB는 늘리지 않는다", () => {
    expect(COURSE_TRACKS.map((track) => track.label)).toEqual(["일본어", "영어"]);
    expect(COURSE_TRACKS.map((track) => track.to)).toEqual(["/courses", "/en/courses"]);
  });

  it("/en 하위에서는 영어 과정이 활성이다", () => {
    expect(activeTrack("/en/courses").label).toBe("영어");
    expect(activeTrack("/en/courses/101").label).toBe("영어");
    expect(activeTrack("/en/start").label).toBe("영어");
    expect(activeTrack("/en").label).toBe("영어");
  });

  it("그 밖의 경로는 모두 일본어 과정이다 — /english 같은 이름에 속지 않는다", () => {
    expect(activeTrack("/courses").label).toBe("일본어");
    expect(activeTrack("/library/kanji").label).toBe("일본어");
    expect(activeTrack("/").label).toBe("일본어");
    expect(activeTrack("/english-club").label).toBe("일본어");
  });
});
