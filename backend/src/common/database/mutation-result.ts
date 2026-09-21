/**
 * TypeORM's PostgreSQL driver may expose a mutation with RETURNING either as
 * `rows` or as `[rows, affectedCount]`, depending on the query path. Keep that
 * driver detail out of repositories and fail loudly when no row was returned.
 */
export function firstMutationRow<T extends object>(result: unknown): T {
  if (!Array.isArray(result)) throw new Error('Database mutation returned an invalid result.');
  const candidate = Array.isArray(result[0]) ? result[0][0] : result[0];
  if (!candidate || typeof candidate !== 'object' || Array.isArray(candidate)) {
    throw new Error('Database mutation did not return a row.');
  }
  return candidate as T;
}
