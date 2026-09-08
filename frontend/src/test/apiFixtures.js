// 계약 픽스처 — **실제 API 응답 shape**만 여기 있다 (설계/08 C-9).
//
// 왜 이 파일이 있나: 3단계 qa에서 치명 3건이 전부 "lib은 정확한데 실제 응답과의 배선이 틀림"이었다.
// 원인은 테스트가 **손으로 지어낸 평평한 모양**을 픽스처로 썼다는 것이다 —
// 단위 테스트는 전부 초록인데 제품은 첫 화면에서 깨졌다.
//
// 규칙: 화면·배선을 테스트할 때는 이 파일의 픽스처를 쓴다. 여기 있는 모양이 서버 DTO와 다르면
// **픽스처가 틀린 것이다**(서버 DTO가 기준). 새 필드가 생기면 여기부터 고친다.
//
// 대조한 DTO: CourseDTO · VocabularyEntryDTO(SenseDTO·LearnedInDTO) · KanjiListItemDTO·KanjiDetailDTO ·
//             GrammarListItemDTO·GrammarDetailDTO · UnitStudyDTO (2026-08-19)

/**
 * ★ 레벨 표기는 두 가지다 — 섞으면 필터가 조용히 빈 결과를 준다(3단계 qa 치명 ①).
 *  - `levelLabel`: 코스의 **표시 문구**. "JLPT N5" / 입문은 "문자"(N 코드가 아예 없다)
 *  - 자료실 `level` 파라미터·응답 필드: **코드**. "N5" — 근거는 `courseNo`이지 levelLabel이 아니다
 */
export const LEVEL_CODE_BY_COURSE_NO = { 0: "INTRO", 1: "N5", 2: "N4", 3: "N3", 4: "N2", 5: "N1" };

/** 한자 자료실의 레벨 선택지 — INTRO는 데이터가 0건이라 선택지에 없다(설계/04 §3-1 표) */
export const KANJI_LEVEL_CODES = ["N5", "N4", "N3", "N2", "N1"];

/**
 * GET /api/courses — courseNo 오름차순 6개.
 * ★ 2026-08-25 정정: 입문·N1이 **개통됐다**(08-21·08-22). 예전 픽스처가 둘을 준비중·유닛 0으로 고정해
 * `entryCourseNo()`가 테스트에서는 N5, 제품에서는 입문을 반환했고 — **실제로 성립하는 분기를 어떤 테스트도 밟지 않았다.**
 * 그것이 "1단계 탈락 시 입문 대신 N5를 추천"하는 결함이 조용히 넘어간 직접 원인이다(08 C-9 위반).
 */
export function coursesFixture() {
  return [
    { id: 1, courseNo: 0, levelCode: "INTRO", levelLabel: "문자", title: "입문", targetAudience: "", goal: "", notice: null, status: "AVAILABLE", unitCount: 10 },
    { id: 2, courseNo: 1, levelCode: "N5", levelLabel: "JLPT N5", title: "왕초보", targetAudience: "", goal: "", notice: "히라가나를 몰라도 시작할 수 있어요", status: "AVAILABLE", unitCount: 20 },
    { id: 3, courseNo: 2, levelCode: "N4", levelLabel: "JLPT N4", title: "초급", targetAudience: "", goal: "", notice: null, status: "AVAILABLE", unitCount: 20 },
    { id: 4, courseNo: 3, levelCode: "N3", levelLabel: "JLPT N3", title: "중급", targetAudience: "", goal: "", notice: null, status: "AVAILABLE", unitCount: 25 },
    { id: 5, courseNo: 4, levelCode: "N2", levelLabel: "JLPT N2", title: "중상급", targetAudience: "", goal: "", notice: null, status: "AVAILABLE", unitCount: 25 },
    { id: 6, courseNo: 5, levelCode: "N1", levelLabel: "JLPT N1", title: "고급", targetAudience: "", goal: "", notice: null, status: "AVAILABLE", unitCount: 25 },
  ];
}

/**
 * GET /api/en/courses — 영어 코스 5개 (설계/04 §8-1).
 * **영어는 levelLabel을 화면에 쓰지 않는다** — 코스명이 곧 단계 이름이다(§B-4).
 * 필드는 일본어 코스와 같은 CourseDTO이므로 level_label에도 코드와 같은 값이 들어 있다.
 */
export function enCoursesFixture() {
  return [
    { id: 101, courseNo: 1, levelCode: "E1", levelLabel: "E1", title: "다시 세우기", targetAudience: "", goal: "", notice: null, status: "AVAILABLE", unitCount: 2 },
    { id: 102, courseNo: 2, levelCode: "E2", levelLabel: "E2", title: "일상 말하기", targetAudience: "", goal: "", notice: null, status: "PREPARING", unitCount: 0 },
    { id: 103, courseNo: 3, levelCode: "E3", levelLabel: "E3", title: "이어 말하기", targetAudience: "", goal: "", notice: null, status: "PREPARING", unitCount: 0 },
    { id: 104, courseNo: 4, levelCode: "E4", levelLabel: "E4", title: "뉘앙스", targetAudience: "", goal: "", notice: null, status: "PREPARING", unitCount: 0 },
    { id: 105, courseNo: 5, levelCode: "E5", levelLabel: "E5", title: "실전과 격식", targetAudience: "", goal: "", notice: null, status: "PREPARING", unitCount: 0 },
  ];
}

/**
 * GET /api/en/courses/{id} — EnCourseDetailDTO (설계/04 §8-1).
 * 일본어 CourseDetailDTO에서 한자 집계 자리가 **표현 집계**다.
 */
export function enCourseDetailFixture(overrides = {}) {
  return {
    id: 101,
    courseNo: 1,
    levelCode: "E1",
    levelLabel: "E1",
    title: "다시 세우기",
    targetAudience: "단어는 아는데 문장이 안 만들어지는 사람",
    goal: "문장 만드는 규칙 다시 세우기",
    notice: "지금은 맛보기 유닛 2개만 열려 있어요",
    description: "학교에서 배운 조각들을 문장 만드는 규칙으로 다시 세웁니다",
    status: "AVAILABLE",
    summary: { unitCount: 2, grammarCount: 5, expressionCount: 14, vocabCount: 32 },
    units: [
      { unitNo: 1, title: "첫 문장 다시 세우기", grammarCount: 3, expressionCount: 7, vocabCount: 16 },
      { unitNo: 2, title: "묻고 답하기", grammarCount: 2, expressionCount: 7, vocabCount: 16 },
    ],
    ...overrides,
  };
}

/**
 * GET /api/en/courses/{id}/units/{n} — EnUnitStudyDTO (설계/04 §8-1).
 * **`kanjis` 필드가 없다**(빈 배열이 아니라 부재) — 입문의 `kanjis: []`와 구별되는 지점이다.
 * 문장 필드 이름은 일본어와 같은 `jp`다(계약상 "원문"으로 재정의 — 기술 부채로 남긴 이름).
 */
export function enUnitStudyPayload(overrides = {}) {
  return {
    courseId: 101,
    courseTitle: "다시 세우기",
    unitNo: 1,
    title: "첫 문장 다시 세우기",
    totalUnits: 2,
    prevUnitNo: null,
    nextUnitNo: 2,
    nextCourse: null,
    grammars: [
      {
        id: 6001,
        name: "be동사 현재형",
        nameKo: "~이다",
        explanation: "주어에 따라 am·is·are로 갈린다",
        examples: [{ id: 1, jp: "I am a student.", kana: null, meaningKo: "나는 학생이다." }],
        rules: [],
      },
    ],
    dialog: {
      id: 6100,
      title: "아침 인사",
      lines: [
        { id: 1, speaker: "A", jp: "Good morning!", kana: null, meaningKo: "좋은 아침!" },
        { id: 2, speaker: "B", jp: "Morning. Did you sleep well?", kana: null, meaningKo: "안녕. 잘 잤어?" },
      ],
    },
    expressions: [
      {
        id: 6200,
        text: "get up",
        meaningKo: "잠자리에서 일어나다",
        usageNote: "아침에 몸을 일으키는 동작에 쓴다",
        ipa: "/ɡet ʌp/",
        koApprox: "겟 업",
        examples: [{ id: 1, en: "I get up at seven every morning.", meaningKo: "나는 매일 아침 7시에 일어난다." }],
      },
      {
        id: 6201,
        text: "look for",
        meaningKo: "~을 찾다",
        usageNote: null,
        ipa: null,
        koApprox: null,
        examples: [],
      },
    ],
    vocabularies: [
      { id: 6300, entryId: 6300, word: "apple", ipa: "/ˈæpəl/", koApprox: "애플", meaningKo: "사과", partOfSpeech: "NOUN" },
      { id: 6301, entryId: 6301, word: "get", ipa: null, koApprox: null, meaningKo: "얻다·받다", partOfSpeech: "VERB" },
    ],
    review: null,
    ...overrides,
  };
}

/** 자료실 목록 봉투 — LibraryPageResponse<T> (04 §3-2) */
export function libraryPageFixture(content, overrides = {}) {
  return {
    content,
    page: 0,
    size: content.length,
    totalElements: content.length,
    totalPages: 1,
    totalAll: content.length,
    ...overrides,
  };
}

/**
 * GET /api/library/vocabulary 의 한 행 — ★ **뜻은 평평하지 않다.**
 * 표기+읽기로 병합된 표제어이고 뜻은 `senses[]`, 그 안에 `vocabularyIds[]`·`learnedIn[]`이 **인덱스 정렬**로 들어 있다.
 */
export function vocabularyEntryFixture({ id, word, kana, partOfSpeech = "NOUN", meanings = ["뜻"] }) {
  return {
    id,
    word,
    kana,
    partOfSpeech,
    levels: ["N5"],
    senses: meanings.map((meaningKo, i) => ({
      meaningKo,
      vocabularyIds: [id + i],
      learnedIn: [{ courseId: 2, courseTitle: "왕초보", level: "N5", unitNo: 1, unitTitle: "첫 만남" }],
    })),
  };
}

/** GET /api/library/kanji 의 한 행 — 목록에는 words가 없다(상세에만 있다) */
export function kanjiListItemFixture({ id, letter, meaningKo, onyomi = null, kunyomi = null }) {
  return { id, letter, meaningKo, onyomi, kunyomi, level: "N5" };
}

/** GET /api/library/kanji/{id} — words[]에 **id가 있다**(편집 패널이 그 값으로 PUT을 조립한다) */
export function kanjiDetailFixture({ id, letter, meaningKo, onyomi = null, kunyomi = null, words = [] }) {
  return {
    id, letter, meaningKo, onyomi, kunyomi, level: "N5",
    words: words.map((w, i) => ({ id: id * 10 + i, word: w.word, kana: w.kana ?? null, meaningKo: w.meaningKo })),
    learnedIn: { courseId: 2, courseTitle: "왕초보", level: "N5", unitNo: 1, unitTitle: "첫 만남" },
  };
}

/** GET /api/library/grammar 의 한 행 */
export function grammarListItemFixture({ id, name, nameKo, hasRules = false }) {
  return { id, name, nameKo, level: "N5", hasRules };
}

/** GET /api/library/grammar/{id} — examples[]·rules[]에 id가 있다 */
export function grammarDetailFixture({ id, name, nameKo, explanation = "설명", examples = [], rules = [] }) {
  return {
    id, name, nameKo, explanation, level: "N5",
    examples: examples.map((ex, i) => ({ id: id * 10 + i, jp: ex.jp, kana: ex.kana ?? null, meaningKo: ex.meaningKo })),
    rules: rules.map((r, i) => ({ id: id * 100 + i, groupLabel: r.groupLabel, pattern: r.pattern, exampleBefore: r.exampleBefore, exampleAfter: r.exampleAfter })),
    learnedIn: { courseId: 2, courseTitle: "왕초보", level: "N5", unitNo: 1, unitTitle: "첫 만남" },
  };
}

/** GET /api/en/library/expressions — ExpressionListItemDTO (설계/04 §8-2) */
export function expressionListItemFixture({ id, text, meaningKo, ipa = null, koApprox = null, level = "E1" }) {
  return { id, text, meaningKo, ipa, koApprox, level };
}

/** GET /api/en/library/expressions/{id} — ExpressionDetailDTO */
export function expressionDetailFixture({
  id,
  text,
  meaningKo,
  usageNote = null,
  ipa = null,
  koApprox = null,
  level = "E1",
  examples = [],
  learnedIn = { courseId: 101, courseTitle: "다시 세우기", level: "E1", unitNo: 1, unitTitle: "첫 문장 다시 세우기" },
}) {
  return { id, text, meaningKo, usageNote, ipa, koApprox, level, examples, learnedIn };
}

/** GET /api/en/library/vocabulary — 일본어 표제어 DTO와 같은 구조 + ipa·koApprox (설계/04 §8-2) */
export function enVocabularyEntryFixture({ id, word, ipa = null, koApprox = null, partOfSpeech = "NOUN", meanings = ["뜻"] }) {
  return {
    id,
    word,
    kana: null,
    ipa,
    koApprox,
    partOfSpeech,
    levels: ["E1"],
    senses: meanings.map((meaningKo, i) => ({
      meaningKo,
      vocabularyIds: [id + i],
      learnedIn: [
        { courseId: 101, courseTitle: "다시 세우기", level: "E1", unitNo: 1, unitTitle: "첫 문장 다시 세우기" },
      ],
    })),
  };
}
