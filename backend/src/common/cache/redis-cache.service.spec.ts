import { ConfigService } from '@nestjs/config';
import { RedisCacheService } from './redis-cache.service';

function fixture() {
  const cache = new RedisCacheService(new ConfigService());
  const client = { status: 'ready', get: jest.fn().mockResolvedValue(null), set: jest.fn().mockResolvedValue('OK'), del: jest.fn().mockResolvedValue(1) };
  (cache as any).client = client;
  return { cache, client };
}

describe('optional Redis cache', () => {
  it('returns the original data when disabled or Redis fails', async () => {
    const disabled = new RedisCacheService(new ConfigService());
    await expect(disabled.getOrLoad('test', 'key', 60, async () => 42)).resolves.toBe(42);
    const { cache, client } = fixture();
    client.get.mockRejectedValue(new Error('connection lost'));
    client.set.mockRejectedValue(new Error('connection lost'));
    await expect(cache.getOrLoad('test', 'key', 60, async () => 42)).resolves.toBe(42);
  });
  it('reuses valid cached values without calling the source and isolates key namespaces', async () => {
    const { cache, client } = fixture();
    client.get.mockResolvedValue('[1,2]');
    const load = jest.fn();
    await expect(cache.getOrLoad('a', 'private query', 60, load)).resolves.toEqual([1, 2]);
    await cache.getOrLoad('b', 'private query', 60, load);
    expect(load).not.toHaveBeenCalled();
    expect(client.get.mock.calls[0][0]).not.toContain('private query');
    expect(client.get.mock.calls[0][0]).not.toBe(client.get.mock.calls[1][0]);
  });
  it('expires values and honors forced refresh', async () => {
    const { cache, client } = fixture();
    client.get.mockResolvedValue('"old"');
    expect(await cache.getOrLoad('test', 'key', 300, async () => 'new', true)).toBe('new');
    expect(client.del).toHaveBeenCalled();
    expect(client.get).not.toHaveBeenCalled();
    expect(client.set).toHaveBeenCalledWith(expect.any(String), '"new"', 'EX', 300);
  });
  it('rejects malformed cache data and never caches provider errors or oversized values', async () => {
    const { cache, client } = fixture();
    client.get.mockResolvedValue('broken json');
    await expect(cache.getOrLoad('test', 'key', 60, async () => { throw new Error('provider'); })).rejects.toThrow('provider');
    expect(client.set).not.toHaveBeenCalled();
    client.get.mockResolvedValue('123');
    const valid = (x: unknown): x is string => typeof x === 'string';
    expect(await cache.getOrLoad('test', 'key', 60, async () => 'fresh', false, valid)).toBe('fresh');
    expect(client.del).toHaveBeenCalled();
    client.set.mockClear(); client.get.mockResolvedValue(null);
    await cache.getOrLoad('test', 'key', 60, async () => 'x'.repeat(300000));
    expect(client.set).not.toHaveBeenCalled();
  });
});
