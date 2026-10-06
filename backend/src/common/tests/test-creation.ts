import { createHash, randomUUID } from 'node:crypto';
import { EntityManager } from 'typeorm';
import { ApplicationError } from '../errors/application.error';

// A durable identity scoped to creator, skill and draft; no process-local cache.
export function testCreationId(actorId: string, component: string, requestId?: string): string {
  if (!requestId) return randomUUID();
  const bytes = createHash('sha256').update(JSON.stringify([actorId, component, requestId])).digest().subarray(0, 16);
  bytes[6] = (bytes[6] & 0x0f) | 0x50;
  bytes[8] = (bytes[8] & 0x3f) | 0x80;
  const hex = bytes.toString('hex');
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

export async function findCreatedTest<T extends { status: string }>(manager: EntityManager, id: string, requestId?: string): Promise<T | undefined> {
  if (!requestId) return undefined;
  // Lock inside the insertion transaction: concurrent retries cannot both create.
  await manager.query('SELECT pg_advisory_xact_lock(hashtextextended($1, 0))', [id]);
  const [existing] = await manager.query<T[]>('SELECT * FROM tests WHERE id=$1', [id]);
  if (existing?.status === 'ARCHIVED') {
    throw new ApplicationError('TEST_CREATION_ARCHIVED', 'This draft already created an archived test. Start a new draft.', 409);
  }
  return existing;
}
