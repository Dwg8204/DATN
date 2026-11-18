import { ConfigService } from '@nestjs/config';
import { ExecutionContext } from '@nestjs/common';
import { lastValueFrom, of, throwError } from 'rxjs';
import { RedisCacheService } from './redis-cache.service';
import { CatalogInvalidationInterceptor } from './catalog-invalidation.interceptor';

function fixture() {
  const stored = new Map<string, string>();
  const client = {
    status: 'ready',
    get: jest.fn(async (key: string) => stored.get(key) ?? null),
    set: jest.fn(async (key: string, value: string, ...args: unknown[]) => {
      if (args.includes('NX') && stored.has(key)) return null;
      stored.set(key, value); return 'OK';
    }),
    del: jest.fn(async (key: string) => Number(stored.delete(key))),
  };
  const cache = new RedisCacheService(new ConfigService());
  (cache as any).client = client;
  return { cache, client, stored };
}

describe('published catalog cache', () => {
  it('shares canonical filters, caches for 120 seconds, separates skills and filters', async () => {
    const { cache, client } = fixture();
    const load = jest.fn(async () => ({ tests: [{ id: 'public-id' }], total: 1 }));
    await cache.catalog('writing', { page: 1, purpose: 'EXAM' }, load);
    await cache.catalog('writing', { purpose: 'EXAM', page: 1 }, load);
    expect(load).toHaveBeenCalledTimes(1);
    await cache.catalog('speaking', { page: 1, purpose: 'EXAM' }, load);
    await cache.catalog('writing', { page: 2, purpose: 'EXAM' }, load);
    await cache.catalog('writing', { page: 1, purpose: 'PRACTICE' }, load);
    expect(load).toHaveBeenCalledTimes(4);
    expect(client.set).toHaveBeenCalledWith(expect.stringContaining('published-catalog'), expect.any(String), 'EX', 120);
  });

  it('invalidates all filtered pages after edits and rejects an old loader generation', async () => {
    const { cache } = fixture();
    let release!: (value: string) => void;
    const old = cache.catalog('writing', { page: 1 }, () => new Promise<string>(resolve => { release = resolve; }));
    // Allow generation lookup and cache miss to reach the database loader.
    while (!release) await new Promise(resolve => setImmediate(resolve));
    await cache.invalidateCatalog();
    release('old');
    expect(await old).toBe('old');
    const load = jest.fn(async () => 'updated');
    expect(await cache.catalog('writing', { page: 1 }, load)).toBe('updated');
    expect(await cache.catalog('writing', { page: 1 }, load)).toBe('updated');
    expect(load).toHaveBeenCalledTimes(1);
  });

  it('falls back without Redis and does not hide database failures', async () => {
    const { cache, client } = fixture();
    client.get.mockRejectedValue(new Error('offline'));
    expect(await cache.catalog('reading', {}, async () => 'db')).toBe('db');
    await expect(cache.catalog('reading', {}, async () => { throw new Error('db failed'); })).rejects.toThrow('db failed');
    client.status = 'end';
    await expect(cache.invalidateCatalog()).resolves.toBeUndefined();
  });

  it('invalidates successful admin mutations, never reads or failed mutations', async () => {
    const cache = { invalidateCatalog: jest.fn().mockResolvedValue(undefined) };
    const interceptor = new CatalogInvalidationInterceptor(cache as unknown as RedisCacheService);
    const context = (method: string) => ({ switchToHttp: () => ({ getRequest: () => ({ method }) }) }) as ExecutionContext;
    await lastValueFrom(interceptor.intercept(context('GET'), { handle: () => of('list') }));
    await expect(lastValueFrom(interceptor.intercept(context('PUT'), { handle: () => throwError(() => new Error('conflict')) }))).rejects.toThrow('conflict');
    expect(cache.invalidateCatalog).not.toHaveBeenCalled();
    for (const method of ['POST', 'PUT', 'PATCH', 'DELETE']) {
      expect(await lastValueFrom(interceptor.intercept(context(method), { handle: () => of('saved') }))).toBe('saved');
    }
    expect(cache.invalidateCatalog).toHaveBeenCalledTimes(4);
  });
});
