import { useEffect, useId, useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { getPagination, isValidPageInput, MAX_PAGE_SIZE, pageNumbers } from './paginationUtils';
import styles from './Pagination.module.css';
import { useTranslation } from 'react-i18next';

export default function Pagination({ page, totalItems, pageSize, onPageChange, onPageSizeChange }) {
  const { t } = useTranslation();
  const sizesId = useId();
  const { total, current } = getPagination(totalItems, page, pageSize);
  const [target, setTarget] = useState(String(current));
  const [size, setSize] = useState(String(pageSize));

  useEffect(() => setTarget(String(current)), [current]);
  useEffect(() => setSize(String(pageSize)), [pageSize]);
  const validPage = isValidPageInput(target, total);
  const validSize = isValidPageInput(size, MAX_PAGE_SIZE);
  const changeSize = event => {
    event.preventDefault();
    if (!validSize) return;
    onPageSizeChange(Number(size));
  };
  const goToPage = event => {
    event.preventDefault();
    if (validPage) onPageChange(Number(target));
  };

  return (
    <div className={styles.pagination}>
      <form onSubmit={changeSize}>
        <label>
          {t('common.rowsPerPage')}
          <input
            aria-label={t('common.rowsPerPage')}
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
        <button type="submit" disabled={!validSize}>{t('common.apply')}</button>
      </form>

      <nav aria-label={t('common.pagination')}>
        <button type="button" aria-label={t('common.previousPage')} disabled={current === 1} onClick={() => onPageChange(current - 1)}>
          <ChevronLeft />
        </button>
        {pageNumbers(current, total).map(number => typeof number === 'string'
          ? <span key={number}>…</span>
          : <button type="button" key={number} aria-current={number === current ? 'page' : undefined} onClick={() => onPageChange(number)}>{number}</button>
        )}
        <button type="button" aria-label={t('common.nextPage')} disabled={current === total} onClick={() => onPageChange(current + 1)}>
          <ChevronRight />
        </button>
      </nav>

      <form onSubmit={goToPage}>
        <label>
          {t('common.goToPage')}
          <input aria-label={t('common.goToPage')} type="number" min="1" max={total} required value={target} onChange={event => setTarget(event.target.value)} />
        </label>
        <span>{t('common.ofPages', { total })}</span>
        <button type="submit" disabled={!validPage}>{t('common.go')}</button>
      </form>
    </div>
  );
}
