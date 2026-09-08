/**
 * ★ 보관함 별 (설계/05 §8) — 담을 수 있는 9곳(자료실 목록·상세 3종, 유닛 학습 3스텝, 보관함)이
 * 전부 이 컴포넌트 하나를 쓴다. 글리프는 텍스트(웹폰트·SVG 추가 없음), 그라디언트 0개.
 *
 * 별을 눌렀는데 상세로 이동하면 안 된다 → 클릭 전파를 반드시 막는다 (AC-B-03·AC-X-02).
 */
export function BookmarkStar({ on, name, onToggle, className = "" }) {
  const handleClick = (event) => {
    event.preventDefault();
    event.stopPropagation();
    onToggle(!on);
  };

  return (
    <button
      aria-label={`${name} 보관함에 ${on ? "빼기" : "담기"}`}
      aria-pressed={on}
      className={`bm-star${on ? " on" : ""} ${className}`.trim()}
      type="button"
      onClick={handleClick}
    >
      {on ? "★" : "☆"}
    </button>
  );
}
