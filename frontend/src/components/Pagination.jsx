/**
 * 페이지네이션 — 킷 `.k-pager`.
 * 현재 쪽은 클래스가 아니라 `aria-current="page"`로 표시한다(킷 §6).
 */
export function Pagination({ page, totalPages, onChange }) {
  if (!totalPages || totalPages <= 1) {
    return null;
  }

  const maxButtons = 5;
  const end = Math.min(totalPages - 1, Math.max(0, page - 2) + (maxButtons - 1));
  const start = Math.max(0, end - (maxButtons - 1));
  const pages = [];
  for (let i = start; i <= end; i += 1) {
    pages.push(i);
  }

  return (
    <div className="k-pager">
      <button disabled={page <= 0} type="button" onClick={() => onChange(page - 1)}>
        <span className="material-icons">chevron_left</span>
      </button>
      {pages.map((num) => (
        <button
          key={num}
          aria-current={num === page ? "page" : undefined}
          type="button"
          onClick={() => onChange(num)}
        >
          {num + 1}
        </button>
      ))}
      <button disabled={page >= totalPages - 1} type="button" onClick={() => onChange(page + 1)}>
        <span className="material-icons">chevron_right</span>
      </button>
    </div>
  );
}
