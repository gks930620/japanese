/**
 * 시작점 코스의 courseNo — AVAILABLE 중 courseNo 최솟값 (설계/05 §3-3).
 * "N5"를 하드코딩하지 않는다: 입문(코스 0)이 열리면 자동으로 그쪽이 시작점이 된다.
 *
 * @param {Array<{courseNo: number, status: string}>|null} courses 코스 목록 응답
 * @returns {number|null} 시작점 courseNo, AVAILABLE이 없으면 null
 */
export function entryCourseNo(courses) {
  const available = (courses ?? []).filter((course) => course.status === "AVAILABLE");
  if (available.length === 0) return null;
  return available.reduce((min, course) => Math.min(min, course.courseNo), available[0].courseNo);
}
