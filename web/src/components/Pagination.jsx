import "./Pagination.css";

export default function Pagination({ page, pageSize, total, onPageChange }) {
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const canPrev = page > 1;
  const canNext = page * pageSize < total;

  return (
    <div className="pagination">
      <button
        type="button"
        className="pagination-button"
        onClick={() => onPageChange(page - 1)}
        disabled={!canPrev}
      >
        Previous
      </button>
      <span className="pagination-info">
        Page {page} of {totalPages} · {total} total
      </span>
      <button
        type="button"
        className="pagination-button"
        onClick={() => onPageChange(page + 1)}
        disabled={!canNext}
      >
        Next
      </button>
    </div>
  );
}
