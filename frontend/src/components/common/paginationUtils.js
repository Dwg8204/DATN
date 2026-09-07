export const MAX_PAGE_SIZE = 1000;

export function isValidPageInput(value, max) {
  return /^\d+$/.test(String(value)) && Number.isSafeInteger(Number(value)) && Number(value) >= 1 && Number(value) <= max;
}

export function getPagination(totalItems, page, pageSize) {
  const size = isValidPageInput(pageSize, MAX_PAGE_SIZE) ? Number(pageSize) : 10;
  const total = Math.max(1, Math.ceil(Math.max(0, totalItems) / size));
  const current = Math.max(1, Math.min(Number.isSafeInteger(Number(page)) ? Number(page) : 1, total));
  return { total, current, size, start: (current - 1) * size, end: current * size };
}

export function pageNumbers(page, total) {
  const numbers = [...new Set([1, total, page - 1, page, page + 1])].filter(n => n >= 1 && n <= total).sort((a, b) => a - b);
  return numbers.flatMap((n, i) => i && n - numbers[i - 1] > 1 ? [`gap-${n}`, n] : [n]);
}

export function paginate(items, page, pageSize) {
  const { total, current, start, end } = getPagination(items.length, page, pageSize);
  return { items: items.slice(start, end), totalPages: total, page: current };
}
