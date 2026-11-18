import 'reflect-metadata';
import 'dotenv/config';
import { ConfigService } from '@nestjs/config';
import { createHash, randomUUID } from 'node:crypto';
import { strict as assert } from 'node:assert';
import Redis from 'ioredis';
import { RedisCacheService } from '../src/common/cache/redis-cache.service';

async function main() {
  const prefix = `aptimate:cache-smoke:${randomUUID()}`;
  const url = process.env.REDIS_URL || 'redis://127.0.0.1:6379';
  const probe = new Redis(url, { lazyConnect: true, connectTimeout: 1000, commandTimeout: 1000, retryStrategy: () => null });
  probe.on('error', () => undefined);
  const config = new ConfigService({ REDIS_ENABLED: true, REDIS_URL: url, REDIS_KEY_PREFIX: prefix });
  const a = new RedisCacheService(config), b = new RedisCacheService(config);
  const key = `${prefix}:smoke:${createHash('sha256').update('shared').digest('hex')}`;
  try {
    await probe.connect(); assert.equal(await probe.ping(), 'PONG');
    a.onModuleInit(); b.onModuleInit();
    await new Promise(resolve => setTimeout(resolve, 500));
    let calls = 0;
    const load = async () => ({ value: ++calls });
    assert.deepEqual(await a.getOrLoad('smoke', 'shared', 1, load), { value: 1 });
    assert.deepEqual(await b.getOrLoad('smoke', 'shared', 1, load), { value: 1 });
    assert.equal(calls, 1); assert.equal(await probe.ttl(key), 1);
    await new Promise(resolve => setTimeout(resolve, 1100));
    assert.deepEqual(await b.getOrLoad('smoke', 'shared', 1, load), { value: 2 });
    let catalogReads = 0;
    const catalogLoad = async () => ({ tests: [{ id: 'smoke', version: ++catalogReads }], total: 1 });
    await a.catalog('writing', { page: 1 }, catalogLoad);
    await b.catalog('writing', { page: 1 }, catalogLoad);
    assert.equal(catalogReads, 1);
    await a.invalidateCatalog();
    await b.catalog('writing', { page: 1 }, catalogLoad);
    assert.equal(catalogReads, 2);
    a.onModuleDestroy();
    assert.deepEqual(await a.getOrLoad('smoke', 'shared', 1, load), { value: 3 });
    console.info('PASS: shared cache, TTL expiry, catalog cross-client invalidation, disconnected fallback; only UUID smoke namespace touched.');
  } finally {
    a.onModuleDestroy(); b.onModuleDestroy();
    if (probe.status === 'ready') {
      let cursor = '0';
      do {
        const [next, keys] = await probe.scan(cursor, 'MATCH', `${prefix}:*`, 'COUNT', 100);
        cursor = next;
        if (keys.length) await probe.del(...keys);
      } while (cursor !== '0');
    }
    probe.disconnect();
  }
}
main().catch(() => { console.error('Cache smoke failed. Check Redis is running and REDIS_URL points to it.'); process.exitCode = 1; });
