import { EntityManager } from 'typeorm';
import { buildExpandedTests, seedExpandedTests } from './seed-expanded-tests';
import { buildAudioScripts, AudioManifest, listeningForm } from './expanded-listening';
import { grammarForm, readingForm, writingForm } from './expanded-content';
import { buildSampleTests } from './seed-sample-tests';

const manifest = (): AudioManifest => Object.fromEntries(buildAudioScripts().map(script => [script.key, {
  url: `https://res.cloudinary.com/test/video/upload/${script.key}.mp3`, sha256: script.sha256, duration: 20,
}]));

describe('expanded test seed', () => {
  it('validates exactly five tests in every requested skill/purpose/mode and isolates the old seed', () => {
    const tests = buildExpandedTests(manifest());
    expect(tests).toHaveLength(140);
    expect(new Set(tests.map(t => t.requestId)).size).toBe(140);
    const oldIds = new Set(buildSampleTests().map(t => t.requestId));
    expect(tests.some(t => oldIds.has(t.requestId))).toBe(false);
    const groups = new Map<string, typeof tests>();
    for (const test of tests) {
      const key = `${test.component}:${test.test.purpose}:${test.test.mode}`;
      groups.set(key, [...(groups.get(key) ?? []), test]);
      expect(Object.keys(test.test.parts)).toEqual(test.test.mode === 'full'
        ? test.component === 'GRAMMAR_VOCAB' ? ['1', '2'] : ['1', '2', '3', '4']
        : [test.test.mode.slice(4)]);
    }
    expect(groups.size).toBe(28);
    for (const group of groups.values()) {
      expect(group).toHaveLength(5);
      expect(new Set(group.map(t => JSON.stringify(t.test.parts))).size).toBe(5);
    }
    expect(tests.filter(t => t.test.purpose === 'EXAM')).toHaveLength(25);
  });

  it('requires 85 distinct scripts and binds media to the exact script hash before SQL', async () => {
    const scripts = buildAudioScripts();
    expect(scripts).toHaveLength(85);
    expect(new Set(scripts.map(script => script.sha256)).size).toBe(85);
    const query = jest.fn();
    const bad = manifest();
    bad['form-3-p3'].sha256 = 'stale';
    await expect(seedExpandedTests({ query } as unknown as EntityManager, bad)).rejects.toThrow('stale audio');
    await expect(seedExpandedTests({ query } as unknown as EntityManager, {})).rejects.toThrow('Missing');
    expect(query).not.toHaveBeenCalled();
    for (let i = 0; i < 5; i++) {
      const form = listeningForm(i, manifest());
      for (const [j, question] of form.parts[1]!.questions.entries()) {
        const script = scripts.find(s => s.key === `form-${i + 1}-p1-${j + 1}`)!;
        expect(script.turns[0].text).toContain(question.options[question.correctAnswer]);
        expect(question.explanation).toBe(script.turns[0].text);
      }
      const dialogue = scripts.find(s => s.key === `form-${i + 1}-p3`)!;
      expect(new Set(dialogue.turns.map(turn => turn.voice)).size).toBe(2);
    }
  });

  it('keeps vocabulary matches and reading ordering valid, without pre-solved ordering', () => {
    for (let i = 0; i < 5; i++) {
      for (const set of grammarForm(i).parts[2]!.sets) {
        expect(new Set(set.options.map(option => option.text)).size).toBe(10);
        expect(new Set(set.targetWords.map(word => word.correctAnswer)).size).toBe(5);
        for (const word of set.targetWords) expect(set.options.some(option => option.label === word.correctAnswer)).toBe(true);
      }
      for (const text of readingForm(i).parts[2].texts) {
        expect(text.sentences.map((s: { correctPosition: number }) => s.correctPosition)).not.toEqual([1, 2, 3, 4, 5, 6]);
      }
    }
  });

  it('provides writing examples within the stated word ranges', () => {
    const count = (s: string) => s.trim().split(/\s+/).length;
    for (let i = 0; i < 5; i++) {
      const { parts } = writingForm(i);
      const answers: Array<[string, number, number]> = [
        ...parts[1]!.sampleAnswers.map(s => [s, 1, 5] as [string, number, number]),
        [parts[2]!.sampleAnswer, 20, 30], ...parts[3]!.sampleAnswers.map(s => [s, 30, 40] as [string, number, number]),
        [parts[4]!.informalSample, 40, 50], [parts[4]!.formalSample, 120, 150],
      ];
      for (const [answer, min, max] of answers) {
        expect({ form: i + 1, words: count(answer), valid: count(answer) >= min && count(answer) <= max }).toMatchObject({ valid: true });
      }
    }
  });

  it('preserves every existing test on rerun, including edited or archived tests', async () => {
    const query = jest.fn(async (sql: string) => sql.includes('FROM users') ? [{ id: 'admin-id' }]
      : sql === 'SELECT id FROM tests WHERE id=$1' ? [{ id: 'existing' }] : []);
    expect(await seedExpandedTests({ query } as unknown as EntityManager, manifest())).toEqual({ created: 0, skipped: 140, total: 140 });
    expect(query.mock.calls.some(([sql]) => /INSERT|UPDATE|DELETE/.test(sql))).toBe(false);
  });
});
