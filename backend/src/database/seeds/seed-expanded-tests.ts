import 'reflect-metadata';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { EntityManager } from 'typeorm';
import { GrammarTestsRepository } from '../../features/grammar-tests/repositories/grammar-tests.repository';
import { GrammarTestContentService } from '../../features/grammar-tests/services/grammar-test-content.service';
import { ReadingTestsRepository } from '../../features/reading-tests/repositories/reading-tests.repository';
import { ReadingTestContentService } from '../../features/reading-tests/services/reading-test-content.service';
import { ListeningTestsRepository } from '../../features/listening-tests/repositories/listening-tests.repository';
import { ListeningTestContentService } from '../../features/listening-tests/services/listening-test-content.service';
import { WritingTestsRepository } from '../../features/writing-tests/repositories/writing-tests.repository';
import { WritingTestContentService } from '../../features/writing-tests/services/writing-test-content.service';
import { SpeakingTestsRepository } from '../../features/speaking-tests/repositories/speaking-tests.repository';
import { SpeakingTestContentService } from '../../features/speaking-tests/services/speaking-test-content.service';
import { persistSeedDefinitions, skillDefinitions } from './seed-sample-tests';
import { grammarForm, readingForm, speakingForm, themes, writingForm } from './expanded-content';
import { AudioManifest, buildAudioScripts, listeningForm } from './expanded-listening';

export const EXPANDED_NAMESPACE = 'aptimate-expanded-tests-v1';
export const AUDIO_MANIFEST_PATH = resolve(__dirname, 'expanded-audio-manifest.json');

export function readAudioManifest(): AudioManifest {
  return JSON.parse(readFileSync(AUDIO_MANIFEST_PATH, 'utf8')) as AudioManifest;
}

/** No manifest means content-only validation; these preview URLs can never be persisted. */
export function buildExpandedTests(manifest?: AudioManifest) {
  return themes.flatMap((theme, i) => {
    const prefix = `Bộ ${i + 1} · ${theme.name}`;
    const namespace = `${EXPANDED_NAMESPACE}:form-${i + 1}`;
    return [
      ...skillDefinitions<ReturnType<typeof grammarForm>>('GRAMMAR_VOCAB', `Grammar & Vocabulary · ${prefix}`, grammarForm(i), 2, new GrammarTestContentService(), GrammarTestsRepository, namespace),
      ...skillDefinitions<ReturnType<typeof readingForm>>('READING', `Reading · ${prefix}`, readingForm(i), 4, new ReadingTestContentService(), ReadingTestsRepository, namespace),
      ...skillDefinitions<ReturnType<typeof listeningForm>>('LISTENING', `Listening · ${prefix}`, listeningForm(i, manifest), 4, new ListeningTestContentService(), ListeningTestsRepository, namespace),
      ...skillDefinitions<ReturnType<typeof writingForm>>('WRITING', `Writing · ${prefix}`, writingForm(i), 4, new WritingTestContentService(), WritingTestsRepository, namespace),
      ...skillDefinitions<ReturnType<typeof speakingForm>>('SPEAKING', `Speaking · ${prefix}`, speakingForm(i), 4, new SpeakingTestContentService(), SpeakingTestsRepository, namespace),
    ];
  });
}

export async function seedExpandedTests(manager: EntityManager, manifest: AudioManifest, adminId?: string) {
  // Reject missing/stale media before any SQL, including callers bypassing the CLI.
  if (!manifest) throw new Error('Audio manifest is required.');
  return persistSeedDefinitions(manager, buildExpandedTests(manifest), EXPANDED_NAMESPACE, adminId);
}

async function main() {
  if (process.argv.includes('--dry-run')) {
    const tests = buildExpandedTests(process.argv.includes('--with-audio') ? readAudioManifest() : undefined);
    const counts = new Map<string, number>();
    for (const { component, test } of tests) {
      const key = `${component} / ${test.purpose} / ${test.mode}`;
      counts.set(key, (counts.get(key) ?? 0) + 1);
    }
    console.table([...counts].map(([category, count]) => ({ category, count })));
    console.info(`Validated ${tests.length} tests, ${buildAudioScripts().length} audio scripts. No database writes.`);
    return;
  }
  if (!process.argv.includes('--apply')) throw new Error('Use --dry-run to validate or --apply to add the 140 published tests.');
  const manifest = readAudioManifest();
  buildExpandedTests(manifest);
  // Check every remote file before opening the database transaction.
  for (const script of buildAudioScripts()) {
    const response = await fetch(manifest[script.key].url, { method: 'HEAD', signal: AbortSignal.timeout(15000) });
    if (!response.ok || !response.headers.get('content-type')?.startsWith('audio/')) throw new Error(`Audio unavailable: ${script.key}`);
  }
  const { default: dataSource } = await import('../data-source');
  await dataSource.initialize();
  try {
    console.info(await dataSource.transaction(manager => seedExpandedTests(manager, manifest, process.env.SAMPLE_SEED_ADMIN_ID)));
  } finally { await dataSource.destroy(); }
}

if (require.main === module) main().catch(error => {
  console.error(error instanceof Error ? error.message : 'Expanded seed failed.');
  process.exitCode = 1;
});
