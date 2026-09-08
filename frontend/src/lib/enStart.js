// 영어 자가진단 `/en/start` (설계/06 §11-12) — 채점이 아니라 **자기 선택**이다.
// 서버 엔드포인트가 없다: GET /api/en/courses 응답만으로 선택지를 만든다.
//
// 열쇠는 **levelCode**다(설계/05 §16-2). 영어에는 levelLabel을 화면·필터 어디에도 쓰지 않는다 —
// 표기가 둘로 갈리는 순간 3단계 치명 결함(라벨을 필터에 넘김)이 언어별로 되풀이된다.

/** 학습 순서 = 이 배열 순서. courseNo에서 파생하지 않는다(언어마다 규칙이 갈린다 — 설계/03 §1) */
export const EN_LEVEL_CODES = ["E1", "E2", "E3", "E4", "E5"];

/** 학습자가 읽는 자기 진단 문장 (설계/06 §11-12) — 코스명이 아니라 이 문장이 선택 기준이다 */
export const CAN_DO_BY_LEVEL_CODE = {
  E1: "단어는 아는데 문장이 안 만들어져요",
  E2: "짧게는 말하는데 시제가 헷갈려요",
  E3: "문장은 되는데 길게 못 이어요",
  E4: "말은 통하는데 어색하대요",
  E5: "회의·이메일에서 막혀요",
};

/**
 * can-do 선택지 — 영어 코스를 학습 순서로 세우고 문장을 붙인다.
 * 준비중 코스도 남긴다: 골라도 막지 않고 코스 상세로 보낸다(유닛만 막힌다 — 설계/06 §11-12).
 * 영어 코드가 아닌 코스(일본어)는 섞여 들어와도 선택지가 되지 않는다.
 */
export function canDoChoices(courses) {
  return (courses ?? [])
    .filter((course) => CAN_DO_BY_LEVEL_CODE[course?.levelCode] != null)
    .sort(
      (a, b) => EN_LEVEL_CODES.indexOf(a.levelCode) - EN_LEVEL_CODES.indexOf(b.levelCode),
    )
    .map((course) => ({
      courseId: course.id,
      levelCode: course.levelCode,
      title: course.title,
      sentence: CAN_DO_BY_LEVEL_CODE[course.levelCode],
    }));
}
