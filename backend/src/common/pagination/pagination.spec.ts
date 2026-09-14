import { paginate } from './pagination.dto';

describe('paginate', () => {
  it('returns consistent pagination metadata', () => {
    expect(paginate(['row'], 21, { page: 2, pageSize: 10 })).toEqual({
      data: ['row'],
      pagination: { page: 2, pageSize: 10, totalItems: 21, totalPages: 3 },
    });
  });

  it('uses zero total pages for an empty result', () => {
    expect(paginate([], 0, { page: 1, pageSize: 10 }).pagination.totalPages).toBe(0);
  });
});
