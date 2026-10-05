import { EntityManager } from 'typeorm';
import { buildSampleTests, SAMPLE_COVER, SAMPLE_LISTENING_AUDIO, SAMPLE_SPEAKING_IMAGES, seedSampleTests } from './seed-sample-tests';
import { GrammarTestsRepository } from '../../features/grammar-tests/repositories/grammar-tests.repository';
import { ReadingTestsRepository } from '../../features/reading-tests/repositories/reading-tests.repository';
import { ListeningTestsRepository } from '../../features/listening-tests/repositories/listening-tests.repository';
import { WritingTestsRepository } from '../../features/writing-tests/repositories/writing-tests.repository';
import { SpeakingTestsRepository } from '../../features/speaking-tests/repositories/speaking-tests.repository';

describe('sample test seed', () => {
  afterEach(() => jest.restoreAllMocks());
  it('validates 28 publishable tests with all skill/part combinations', () => {
    const samples = buildSampleTests();
    expect(samples).toHaveLength(28);
    expect(new Set(samples.map(sample => sample.requestId)).size).toBe(28);
    for (const component of ['GRAMMAR_VOCAB', 'READING', 'LISTENING', 'WRITING', 'SPEAKING']) {
      const skill = samples.filter(sample => sample.component === component);
      expect(skill.filter(sample => sample.test.purpose === 'EXAM').map(sample => sample.test.mode)).toEqual(['full']);
      expect(skill.filter(sample => sample.test.purpose === 'PRACTICE').map(sample => sample.test.mode))
        .toEqual(component === 'GRAMMAR_VOCAB' ? ['full', 'part1', 'part2'] : ['full', 'part1', 'part2', 'part3', 'part4']);
      for (const { test } of skill) {
        expect(test.details.pictureUrl).toBe(SAMPLE_COVER);
        expect(Object.keys(test.parts)).toEqual(test.mode === 'full'
          ? component === 'GRAMMAR_VOCAB' ? ['1', '2'] : ['1', '2', '3', '4']
          : [test.mode.slice(4)]);
      }
    }
  });

  it('uses only the supplied audio and speaking image URLs', () => {
    const serialized = JSON.stringify(buildSampleTests().map(sample => sample.test));
    for (const url of [...SAMPLE_LISTENING_AUDIO, ...SAMPLE_SPEAKING_IMAGES]) expect(serialized).toContain(url);
    const urls = serialized.match(/https:\/\/[^"\\]+/g) ?? [];
    const allowed = new Set<string>([SAMPLE_COVER, ...SAMPLE_LISTENING_AUDIO, ...SAMPLE_SPEAKING_IMAGES]);
    expect(urls.every(url => allowed.has(url))).toBe(true);
  });

  it('skips every existing sample without changing tests or published snapshots', async () => {
    const query = jest.fn(async (sql: string) => {
      if (sql.includes('FROM users')) return [{ id: 'admin-id' }];
      if (sql === 'SELECT id FROM tests WHERE id=$1') return [{ id: 'existing-test' }];
      return [];
    });
    const result = await seedSampleTests({ query } as unknown as EntityManager);
    expect(result).toEqual({ created: 0, skipped: 28, total: 28 });
    expect(query.mock.calls.some(([sql]) => /INSERT|UPDATE|DELETE/.test(sql))).toBe(false);
  });

  it('fails before creating data if an active administrator cannot be selected', async () => {
    const query = jest.fn().mockResolvedValue([]);
    await expect(seedSampleTests({ query } as unknown as EntityManager)).rejects.toThrow('ADMIN');
    expect(query.mock.calls.some(([sql]) => /INSERT|UPDATE|DELETE/.test(sql))).toBe(false);
  });

  it('creates and publishes all samples with UUID audit request IDs', async () => {
    const prototypes = [GrammarTestsRepository.prototype, ReadingTestsRepository.prototype, ListeningTestsRepository.prototype,
      WritingTestsRepository.prototype, SpeakingTestsRepository.prototype];
    for (const prototype of prototypes) {
      (jest.spyOn(prototype, 'create') as jest.SpyInstance).mockImplementation(async (_actor, test) => ({ ...test, id: 'sample-id', version: 1 }));
      (jest.spyOn(prototype, 'publish') as jest.SpyInstance).mockResolvedValue({ outcome: 'SUCCESS', value: {} });
    }
    const query = jest.fn(async (sql: string) => sql.includes('FROM users') ? [{ id: 'admin-id' }] : []);
    expect(await seedSampleTests({ query } as unknown as EntityManager)).toEqual({ created: 28, skipped: 0, total: 28 });
    for (const [index, prototype] of prototypes.entries()) {
      const calls = (prototype.create as jest.Mock).mock.calls;
      expect(calls).toHaveLength(index === 0 ? 4 : 6);
      expect(prototype.publish).toHaveBeenCalledTimes(calls.length);
      for (const [, , audit] of calls) expect(audit.requestId).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-5[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/);
    }
  });
});
