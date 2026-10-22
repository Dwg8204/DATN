import * as assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { withPersonalizationDatabase } from './personalization-fixture';
import { LearningGoalsRepository } from '../../src/features/personalization/repositories/learning-goals.repository';
import { LearningInsightsRepository } from '../../src/features/personalization/repositories/learning-insights.repository';
import { InsightContextService } from '../../src/features/personalization/services/insight-context.service';
import { buildLearnerSnapshot } from '../../src/features/personalization/policies/learner-snapshot';
import { reportSnapshot } from '../../src/features/personalization/ai/report.contract';
import { ChatbotRepository } from '../../src/features/chatbot/chatbot.repository';
import { ChatbotContext } from '../../src/features/chatbot/chatbot.context';
import { ChatbotService } from '../../src/features/chatbot/chatbot.service';
import { ChatbotProvider, GeminiContent } from '../../src/features/chatbot/chatbot.provider';
import { TestAttemptsService } from '../../src/features/test-attempts/services/test-attempts.service';
import { PracticeAttemptsService } from '../../src/features/test-attempts/services/practice-attempts.service';
import { ChatbotKnowledge } from '../../src/features/chatbot/chatbot.knowledge';
import { DictionaryService } from '../../src/features/dictionary/services/dictionary.service';
import { AuthUser } from '../../src/features/auth/types/auth-user.type';

withPersonalizationDatabase(async (db, alice, bob) => {
  const goals = new LearningGoalsRepository(db), insights = new LearningInsightsRepository(db);
  const goal = await goals.create(alice, { targetCefr: 'B2', targetTests: 40, durationDays: 30, startDate: '2026-10-01', timezone: 'Asia/Bangkok' });
  const full = buildLearnerSnapshot(alice, goal, { kind: 'GOAL' }, new Date('2026-10-14T02:00Z'), {
    attempts: [], scoredAttempts: [], reviewDates: [], learningCount: 0, mistakes: [], planItems: [],
  });
  const learner = reportSnapshot({ ...full, inputHash: 'fixture' }, 7);
  learner.goal!.completed = 12; learner.cumulative.completed = 12;
  const prepared = { learner, candidates: [{ testId: 'PRIVATE_TEST', questionKeys: ['PRIVATE_QUESTION'] }], plan: { private: true } };
  const reportIds: string[] = [];
  for (const [index, kind] of (['WEEKLY', 'MIDTERM', 'FINAL'] as const).entries()) {
    const row = await insights.createPending(alice, { goalId: goal.id, kind, periodKey: kind === 'FINAL' ? 'FINAL' : `W${index + 1}`,
      weekIndex: kind === 'FINAL' ? undefined : index + 1, coversFrom: '2026-10-01', coversTo: '2026-10-14', snapshotVersion: 1,
      inputHash: String(index).repeat(64), snapshot: prepared });
    reportIds.push(row!.id);
    await db.query('UPDATE learning_insights SET status=$2,content=$3 WHERE id=$1', [row!.id, kind === 'FINAL' ? 'FALLBACK' : 'READY', {
      source: kind === 'FINAL' ? 'RULE' : 'AI', report: { headline: 'Báo cáo thử', narrative: 'Tiếp tục ôn tập.' }, generationKey: 'PRIVATE_KEY',
    }]);
  }
  const readonly = new InsightContextService(insights);
  const context = new ChatbotContext(db, {} as TestAttemptsService, {} as PracticeAttemptsService, undefined, readonly);
  const repo = new ChatbotRepository(db);
  let calls = 0, failNext = false;
  const seen: Array<{ id: string; source: string }> = [];
  const provider = { assertReady: () => {}, generate: async (system: string, contents: GeminiContent[]) => {
    calls++;
    assert.match(system, /không thay thế số trong báo cáo lịch sử/);
    const saved = JSON.parse(contents[0].parts[0].text!).reportContext;
    assert.equal(saved.snapshot.goal.completed, 12);
    assert.equal(saved.snapshot.period.completed, 7);
    assert.equal(saved.snapshot.goal.targetTests, 40);
    assert.equal(saved.snapshot.band.overallEstimate, null);
    for (const secret of ['PRIVATE_TEST', 'PRIVATE_QUESTION', 'PRIVATE_KEY', alice, bob]) assert.ok(!JSON.stringify(saved).includes(secret));
    seen.push({ id: saved.insightId, source: saved.source });
    if (failNext) { failNext = false; throw new Error('fixture failure'); }
    return { role: 'model', parts: [{ text: JSON.stringify({ text: 'Trong tuần có 7 bài; tiến độ mục tiêu là 12/40 bài. Chưa đủ dữ liệu để ước lượng band.', citationIds: [], actions: [{ code: 'OPEN_STUDY_PLAN' }, { code: 'OPEN_MISTAKE_REVIEW' }] }) }] };
  } } as unknown as ChatbotProvider;
  const chat = new ChatbotService(repo, provider, context, {} as ChatbotKnowledge, {} as DictionaryService);
  const actor = { id: alice, role: 'STUDENT' } as AuthUser;
  for (const insightId of reportIds) {
    const sessionId = randomUUID();
    await assert.rejects(() => chat.create({ ...actor, id: bob }, { id: randomUUID(), insightId }));
    await chat.create(actor, { id: sessionId, insightId });
    await chat.create(actor, { id: sessionId, insightId });
    await assert.rejects(() => chat.create(actor, { id: sessionId }));
    assert.equal((await repo.sessions(alice, 1)).items.find((s: { id: string }) => s.id === sessionId).insightId, insightId);
    const reply = await chat.send(actor, sessionId, { clientMessageId: randomUUID(), content: 'Giải thích số liệu báo cáo.' });
    assert.equal(reply.status, 'COMPLETED'); assert.match(reply.content, /12\/40/);
    assert.deepEqual(reply.actions, [{ code: 'OPEN_STUDY_PLAN' }, { code: 'OPEN_MISTAKE_REVIEW' }]);
    const [stored] = await db.query('SELECT context FROM chat_messages WHERE id=$1', [reply.id]);
    assert.equal(stored.context.insightId, insightId);
    assert.equal((await insights.findById(alice, insightId))!.read_at, null, 'chat context access is read-only');
    await assert.rejects(() => chat.send({ ...actor, id: bob }, sessionId, { clientMessageId: randomUUID(), content: 'Other user' }));
  }
  assert.equal(seen.at(-1)!.source, 'RULE');
  const sessionId = randomUUID(), insightId = reportIds[0];
  await chat.create(actor, { id: sessionId, insightId });
  failNext = true;
  const failed = await chat.send(actor, sessionId, { clientMessageId: randomUUID(), content: 'Try again' });
  assert.equal(failed.status, 'FAILED');
  const before = calls;
  await db.query("UPDATE learning_insights SET snapshot='{}' WHERE id=$1", [insightId]);
  const denied = await chat.retry(actor, sessionId, failed.id);
  assert.equal(denied.status, 'FAILED'); assert.equal(denied.errorCode, 'CHAT_INSIGHT_UNAVAILABLE');
  assert.equal(calls, before, 'unavailable report must not reach the provider on retry');
  await db.query('UPDATE learning_insights SET snapshot=$2 WHERE id=$1', [insightId, prepared]);
  await db.query("UPDATE chat_messages SET created_at=now()-interval '2 minutes' WHERE status<>'PENDING'");
  const recovered = await chat.retry(actor, sessionId, denied.id);
  assert.equal(recovered.status, 'COMPLETED');
  assert.equal((await repo.messages(alice, sessionId, 1)).items.filter((m: { role: string }) => m.role === 'user').length, 1);
  const newService = new ChatbotService(repo, provider, context, {} as ChatbotKnowledge, {} as DictionaryService);
  await newService.send(actor, sessionId, { clientMessageId: randomUUID(), content: 'Continue from the saved session' });
  assert.equal(seen.at(-1)!.id, insightId);
  await db.query('DELETE FROM learning_insights WHERE id=$1', [insightId]);
  assert.equal((await repo.owned(alice, sessionId)).context_insight_id, null);
  console.log('PASS GĐ9: owned WEEKLY/MIDTERM/FINAL, read-only projection, private mappings excluded, exact saved statistics in context, actions, replay conflict, retry revalidation, restoration and deletion.');
}).catch(error => { console.error(error); process.exitCode = 1; });
