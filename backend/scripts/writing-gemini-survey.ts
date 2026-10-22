import 'reflect-metadata';
import 'dotenv/config';
import { ConfigService } from '@nestjs/config';
import db from '../src/database/data-source';
import { GeminiProvider } from '../src/common/ai/providers/gemini.provider';
import { AiError } from '../src/common/ai/ai-error';
import { WritingAiConfig } from '../src/features/writing-assessment/writing-ai-config.service';
import { WritingInputBuilder } from '../src/features/writing-assessment/services/writing-input-builder.service';
import { WritingAssessmentService } from '../src/features/writing-assessment/services/writing-assessment.service';
import { WritingAssessmentValidator } from '../src/features/writing-assessment/services/writing-assessment-validator.service';

// Diagnostic only: SELECTs and provider calls; never enqueue, save scores, or change an attempt.
async function main() {
  const requested = Number(process.argv.find(arg => arg.startsWith('--requests='))?.split('=')[1] ?? 16);
  if (!Number.isInteger(requested) || requested < 1 || requested > 24) throw new Error('SURVEY_REQUESTS_MUST_BE_1_TO_24');
  const configService = new ConfigService(process.env);
  const config = new WritingAiConfig(configService); config.assertReady();
  const settings = config.snapshot('vi');
  await db.initialize();
  try {
    const rows = await db.query(`SELECT a.id,a.scope,a.result,s.snapshot,p.answers,md5(a.result::text) AS result_hash
      FROM test_attempts a JOIN test_snapshots s ON s.id=a.snapshot_id JOIN attempt_progress p ON p.attempt_id=a.id
      WHERE a.component='WRITING' AND a.status='SUBMITTED' AND p.sealed_at IS NOT NULL
      AND EXISTS(SELECT 1 FROM writing_grading_jobs j WHERE j.attempt_id=a.id)
      ORDER BY a.submitted_at DESC LIMIT 8`);
    const builder = new WritingInputBuilder();
    const samples = rows.map((row: any) => ({ ...row,
      input: builder.build(row.snapshot, row.answers, row.scope, 'vi', row.result?.assistance?.revealedKeys, 2) }))
      .filter((row: any) => row.input.parts.some((part: any) => part.questions.some((q: any) => q.response.trim())));
    console.log(JSON.stringify({ event: 'survey_plan', model: settings.model, requests: requested, uniqueAttempts: samples.length,
      concurrency: 2, diagnosticRollingLimit: '12 per 65 seconds', minimumSpacingMs: 5500,
      writesResults: false, execute: process.argv.includes('--execute') }));
    if (!process.argv.includes('--execute') || !samples.length) return;
    const started = Date.now(), reservations: number[] = [], sentAt: number[] = [], results: any[] = [];
    let index = 0, cooldown = 0, gate: Promise<unknown> = Promise.resolve();
    const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));
    let stopping = false; process.once('SIGINT', () => { stopping = true; });
    function reserve(): Promise<boolean> {
      const pending = gate.then(async () => {
        let reportedBusy = false;
        while (!stopping && Date.now() - started < 600000) {
          const now = Date.now();
          while (reservations.length && reservations[0] <= now - 65000) reservations.shift();
          const next = Math.max(cooldown, (reservations.at(-1) ?? 0) + 5500,
            reservations.length >= 12 ? reservations[0] + 65000 : 0);
          if (next > now) { await sleep(Math.min(5000, next - now)); continue; }
          const [busy] = await db.query(`SELECT
            EXISTS(SELECT 1 FROM writing_grading_jobs WHERE (status='PROCESSING' AND lease_expires_at>now()) OR (status='QUEUED' AND available_at<=now()))
            OR EXISTS(SELECT 1 FROM speaking_grading_jobs WHERE (status='PROCESSING' AND lease_until>now()) OR (status='QUEUED' AND next_run_at<=now())) AS active`);
          if (busy.active) {
            if (!reportedBusy) console.log(JSON.stringify({ event: 'paused_for_live_grading' }));
            reportedBusy = true; await sleep(5000); continue;
          }
          const sent = Date.now(); reservations.push(sent); sentAt.push(sent); return true;
        }
        return false;
      });
      gate = pending.catch(() => undefined); return pending;
    }
    async function worker() {
      while (!stopping) {
        const n = index++; if (n >= requested) return;
        if (!await reserve()) return;
        const sample = samples[n % samples.length], callStarted = Date.now();
        let http = 'NOT_RECEIVED';
        const actual = new GeminiProvider(configService);
        const provider = { generateStructured: async (request: Parameters<GeminiProvider['generateStructured']>[0]) => {
          const raw = await actual.generateStructured(request); http = '200'; return raw;
        } };
        const row: any = { event: 'sample', n: n + 1, attemptId: sample.id, startedAt: new Date(callStarted).toISOString(), words: sample.input.parts
          .flatMap((p: any) => p.questions).reduce((sum: number, q: any) => sum + q.wordCount, 0) };
        try {
          await new WritingAssessmentService(provider, new WritingAssessmentValidator()).assess(sample.input, settings);
          row.code = 'VALID';
        } catch (error) {
          row.code = error instanceof AiError ? error.code : 'DIAGNOSTIC_FAILED';
          row.rule = error instanceof AiError ? error.validationRule ?? null : null;
          if (/^GEMINI_HTTP_\d+$/.test(row.code)) http = row.code.slice('GEMINI_HTTP_'.length);
          if (http === '429') cooldown = Date.now() + Math.max(65000, error instanceof AiError ? error.retryAfterMs ?? 0 : 0);
        }
        row.http = http; row.elapsedMs = Date.now() - callStarted;
        results.push(row); console.log(JSON.stringify(row));
      }
    }
    await Promise.all([worker(), worker()]);
    const counts = results.reduce((out: Record<string, number>, row: any) => ({ ...out, [row.code]: (out[row.code] ?? 0) + 1 }), {});
    const nowRows = await db.query('SELECT id,md5(result::text) AS result_hash FROM test_attempts WHERE id=ANY($1::uuid[])', [samples.map((s: any) => s.id)]);
    console.log(JSON.stringify({ event: 'survey_summary', model: settings.model, requested, completed: results.length,
      uniqueAttempts: new Set(results.map(r => r.attemptId)).size, counts,
      http503Percent: results.length ? Math.round(10000 * results.filter(r => r.http === '503').length / results.length) / 100 : null,
      peakDiagnosticRequestsIn60Seconds: sentAt.reduce((peak, time) => Math.max(peak, sentAt.filter(t => t > time - 60000 && t <= time).length), 0),
      elapsedMs: Date.now() - started, resultHashesUnchanged: samples.every((s: any) => nowRows.find((r: any) => r.id === s.id)?.result_hash === s.result_hash),
      note: 'Small diagnostic sample, not a provider-wide failure rate. External project traffic cannot be counted here.' }));
  } finally { await db.destroy(); }
}
main().catch(error => { console.error(error instanceof AiError ? error.code : 'SURVEY_CONFIGURATION_OR_DATABASE_FAILED'); process.exitCode = 1; });
