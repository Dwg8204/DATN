export function filterTests(tests, { query, component, section, status }) {
  const normalized = query.trim().toLocaleLowerCase();
  return tests.filter((test) => (
    (!normalized || test.name.toLocaleLowerCase().includes(normalized))
    && (component === 'All' || test.component === component)
    && (section === 'All' || (test.section === 'Full Writing' ? 'Full Test' : test.section) === section)
    && (status === 'All' || test.status === status)
  ));
}

export function formatAdminDate(value) {
  return new Intl.DateTimeFormat('en-US', { month: 'short', day: '2-digit', year: 'numeric' }).format(new Date(value));
}

export function paginate(items, page, pageSize) {
  const totalPages = Math.max(1, Math.ceil(items.length / pageSize));
  const safePage = Math.min(page, totalPages);
  return { items: items.slice((safePage - 1) * pageSize, safePage * pageSize), totalPages, page: safePage };
}
