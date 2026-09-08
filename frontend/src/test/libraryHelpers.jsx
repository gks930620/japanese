// 자료실 테스트 공용 헬퍼 — 주소 동기화 검증을 위해 현재 위치를 DOM에 노출한다.
import { render } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { LocationProbe } from "./LocationProbe.jsx";

/** 자료실 페이지를 주소와 함께 렌더한다 */
export function renderLibrary(element, { path, route }) {
  return render(
    <MemoryRouter initialEntries={[route]}>
      <LocationProbe />
      <Routes>
        <Route element={element} path={path} />
      </Routes>
    </MemoryRouter>,
  );
}

/** LibraryPageResponse (설계/04 §3-2 공통 규약 — totalAll 포함) */
export function libraryPage(content, overrides = {}) {
  const totalElements = overrides.totalElements ?? content.length;
  return {
    content,
    page: 0,
    size: 60,
    totalElements,
    totalAll: totalElements,
    totalPages: 1,
    first: true,
    last: true,
    ...overrides,
  };
}

export function kanjiItem(overrides = {}) {
  return { id: 11, letter: "人", meaningKo: "사람 인", onyomi: "ジン・ニン", kunyomi: "ひと", level: "N5", ...overrides };
}

export function grammarItem(overrides = {}) {
  return { id: 37, name: "動詞て形", nameKo: "동사 て형 만들기", level: "N5", hasRules: true, ...overrides };
}

export function vocabItem(overrides = {}) {
  return {
    // 실데이터 형태(설계/04 §3-7): 応援은 N4·N3에서 "응원", N2에서 "지원"으로 나온다.
    // senses는 뜻 기준으로 합쳐지고 출처(learnedIn)는 배열이다 — 같은 뜻이 여러 곳에서 나올 수 있다.
    id: 1217,
    word: "応援",
    kana: "おうえん",
    partOfSpeech: "NOUN",
    levels: ["N4", "N3", "N2"],
    senses: [
      {
        meaningKo: "응원",
        vocabularyIds: [1217, 2375],
        learnedIn: [
          { courseId: 3, courseTitle: "초급", level: "N4", unitNo: 14, unitTitle: "명령형과 금지형" },
          { courseId: 4, courseTitle: "중급", level: "N3", unitNo: 25, unitTitle: "N3 총정리" },
        ],
      },
      {
        meaningKo: "지원",
        vocabularyIds: [3024],
        learnedIn: [
          { courseId: 5, courseTitle: "중상급", level: "N2", unitNo: 2, unitTitle: "하지 않을 수 없다" },
        ],
      },
    ],
    ...overrides,
  };
}
