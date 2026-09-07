import { useEffect, useId, useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { getPagination, isValidPageInput, MAX_PAGE_SIZE, pageNumbers } from './paginationUtils';
import styles from './Pagination.module.css';

export default function Pagination({ page, totalItems, pageSize, onPageChange, onPageSizeChange }) {
  const sizesId = useId();
  const { total, current } = getPagination(totalItems, page, pageSize);
  const [target, setTarget] = useState(String(current));
  const [size, setSize] = useState(String(pageSize));

  useEffect(() => setTarget(String(current)), [current]);
  useEffect(() => setSize(String(pageSize)), [pageSize]);
  useEffect(() => {
    if (current !== page) onPageChange(current);
  }, [current, page, onPageChange]);

  const validPage = isValidPageInput(target, total);
  const validSize = isValidPageInput(size, MAX_PAGE_SIZE);
  const changeSize = event => {
    event.preventDefault();
    if (!validSize) return;
    onPageSizeChange(Number(size));
    onPageChange(1);
  };
  const goToPage = event => {
    event.preventDefault();
    if (validPage) onPageChange(Number(target));
  };

  return (
    <div className={styles.pagination}>
      <form onSubmit={changeSize}>
        <label>
          Rows per page
          <input
            aria-label="Rows per page"
            title={`Enter 1–${MAX_PAGE_SIZE} rows`}
            type="number"
            min="1"
            max={MAX_PAGE_SIZE}
            required
            value={size}
            onChange={event => setSize(event.target.value)}
            list={sizesId}
          />
        </label>
        <datalist id={sizesId}>
          {[5, 10, 20, 50, 100].map(number => <option key={number} value={number} />)}
        </datalist>
        <button type="submit" disabled={!validSize}>Apply</button>
      </form>

      <nav aria-label="Pagination">
        <button type="button" aria-label="Previous page" disabled={current === 1} onClick={() => onPageChange(current - 1)}>
          <ChevronLeft />
        </button>
        {pageNumbers(current, total).map(number => typeof number === 'string'
          ? <span key={number}>…</span>
          : <button type="button" key={number} aria-current={number === current ? 'page' : undefined} onClick={() => onPageChange(number)}>{number}</button>
        )}
        <button type="button" aria-label="Next page" disabled={current === total} onClick={() => onPageChange(current + 1)}>
          <ChevronRight />
        </button>
      </nav>

      <form onSubmit={goToPage}>
        <label>
          Go to page
          <input aria-label="Go to page" type="number" min="1" max={total} required value={target} onChange={event => setTarget(event.target.value)} />
        </label>
        <span>of {total}</span>
        <button type="submit" disabled={!validPage}>Go</button>
      </form>
    </div>
  );
}
