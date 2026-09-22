import { firstMutationRow } from './mutation-result';

describe('firstMutationRow', () => {
  it.each([
    [[{ id: 'row-id', version: 2 }]],
    [[[{ id: 'row-id', version: 2 }], 1]],
  ])('unwraps PostgreSQL RETURNING result shape %#', result => {
    expect(firstMutationRow<{ id: string; version: number }>(result)).toEqual({ id: 'row-id', version: 2 });
  });

  it('rejects a mutation that returned no row', () => {
    expect(() => firstMutationRow([])).toThrow('did not return a row');
  });
});
