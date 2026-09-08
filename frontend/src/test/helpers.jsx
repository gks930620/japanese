// 테스트 공용 헬퍼 — fetch 목킹 + 라우터 렌더 (설계 §7-2)
// API 목킹은 MSW 없이 fetch 스텁으로 시작한다(의존성 최소). 분기 시나리오가 늘면 MSW를 재검토.
import { render } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { vi } from "vitest";

/** lib/http.js가 기대하는 최소 Response 형태 */
export function jsonResponse(body, status = 200) {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: async () => body,
    clone() {
      return this;
    },
  };
}

/** 성공 응답(ApiResponse 래퍼) */
export function apiSuccess(data) {
  return jsonResponse({ success: true, message: "ok", data });
}

/** 에러 응답(ErrorResponse) */
export function apiError(status, errorCode = "NOT_FOUND", message = "에러") {
  return jsonResponse({ success: false, message, errorCode }, status);
}

/**
 * global fetch를 스텁한다.
 * @param {(url: string) => object|Promise<object>} handler URL별 응답을 돌려주는 함수
 * @returns {import('vitest').Mock} 호출 검증용 목
 */
export function stubFetch(handler) {
  const mock = vi.fn(async (url) => handler(String(url)));
  vi.stubGlobal("fetch", mock);
  return mock;
}

/** 라우트 경로가 필요한 페이지 렌더용 (useParams 사용 컴포넌트) */
export function renderAtRoute(element, { path, route }) {
  return render(
    <MemoryRouter initialEntries={[route]}>
      <Routes>
        <Route element={element} path={path} />
      </Routes>
    </MemoryRouter>,
  );
}

/** 유닛 학습 응답의 최소 형태 — 테스트마다 필요한 필드만 덮어쓴다 */
export function unitStudyPayload(overrides = {}) {
  return {
    courseId: 2,
    courseTitle: "왕초보",
    unitNo: 1,
    title: "테스트 유닛",
    totalUnits: 20,
    prevUnitNo: null,
    nextUnitNo: 2,
    nextCourse: null,
    review: null,
    grammars: [
      {
        id: 1,
        name: "名詞+です",
        nameKo: "명사입니다",
        explanation: "설명",
        examples: [{ jp: "学生です。", kana: "がくせいです。", meaningKo: "학생입니다." }],
        rules: [],
      },
    ],
    dialog: {
      id: 1,
      title: "첫 만남",
      lines: [
        { speaker: "김", jp: "はじめまして。", kana: null, meaningKo: "처음 뵙겠습니다." },
        { speaker: "田中", jp: "田中です。", kana: "たなかです。", meaningKo: "다나카입니다." },
      ],
    },
    kanjis: [
      { id: 1, letter: "人", meaningKo: "사람 인", onyomi: "ジン", kunyomi: "ひと", words: [] },
    ],
    vocabularies: [
      { id: 1, word: "学生", kana: "がくせい", meaningKo: "학생", partOfSpeech: "NOUN" },
    ],
    ...overrides,
  };
}
