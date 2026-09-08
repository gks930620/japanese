// 사이트명 — `日本語 학습`으로 확정(설계/08 결정기록 F-1). 바꾸려면 이 파일과 index.html <title> 두 곳.
//    (index.html은 정적 파일이라 이 상수를 참조하지 못한다)
export const SITE_NAME = "日本語 학습";
export const LOGO_GLYPH = "語";

// 시드 고정 ID 계약 (설계/03_데이터모델.md §5) — 왕초보(N5)의 course.id.
// 준비중 안내 화면의 "왕초보(N5) 시작" 링크가 의존한다.
// ※ 일본어 코스 6개(입문·N5~N1)는 전부 AVAILABLE이다(4단계).
//   "시작점 코스"는 이 상수가 아니라 lib/courses.js의 entryCourseNo()가 계산한다
//   (AVAILABLE 중 courseNo 최솟값 — 입문이 열리면 자동으로 그쪽이 시작점이 된다).
export const N5_COURSE_ID = 2;
