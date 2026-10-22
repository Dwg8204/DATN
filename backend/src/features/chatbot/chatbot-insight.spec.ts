import { plainToInstance } from 'class-transformer';
import { validateSync } from 'class-validator';
import { CreateChatDto } from './chatbot.dto';
import { ChatbotService, parseChatReply } from './chatbot.service';
import { InsightContextService } from '../personalization/services/insight-context.service';

const id = '00000000-0000-4000-8000-000000000001';
describe('report chatbot context', () => {
  it('validates insight UUID and rejects spoofed fields', () => {
    expect(validateSync(plainToInstance(CreateChatDto, { id, insightId: id }))).toHaveLength(0);
    expect(validateSync(plainToInstance(CreateChatDto, { id, insightId: 'wrong' }))).not.toHaveLength(0);
    expect(validateSync(plainToInstance(CreateChatDto, { id, insightId: id, userId: 'other' }), { whitelist: true, forbidNonWhitelisted: true })).not.toHaveLength(0);
  });
  it('rejects mixed report/result contexts before reading or creating', async () => {
    const create = jest.fn(), insight = jest.fn();
    const service = new ChatbotService({ create } as any, {} as any, { insight } as any, {} as any, {} as any);
    for (const extra of [{ attemptId: id }, { questionKey: 'p1:q1' }])
      await expect(service.create({ id: 'me' } as any, { id, insightId: id, ...extra })).rejects.toThrow();
    expect(create).not.toHaveBeenCalled(); expect(insight).not.toHaveBeenCalled();
  });
  it('does not create a session when the report cannot be read', async () => {
    const create = jest.fn();
    const service = new ChatbotService({ create } as any, {} as any, { insight: jest.fn().mockRejectedValue(new Error('not owned')) } as any, {} as any, {} as any);
    await expect(service.create({ id: 'me' } as any, { id, insightId: id })).rejects.toThrow();
    expect(create).not.toHaveBeenCalled();
  });
  it('uses only fixed action codes, discarding model-supplied URLs and identifiers', () => {
    const reply = parseChatReply(JSON.stringify({ text: 'Tiếp tục học.', citationIds: [], actions: [
      { code: 'OPEN_STUDY_PLAN', url: 'https://evil.invalid', goalId: 'other' },
      { code: 'OPEN_MISTAKE_REVIEW', itemId: 'other' },
    ] }), [], new Map());
    expect(reply.actions).toEqual([{ code: 'OPEN_STUDY_PLAN' }, { code: 'OPEN_MISTAKE_REVIEW' }]);
  });
  it('rejects missing, unprepared and non-report insights', async () => {
    const findById = jest.fn();
    const service = new InsightContextService({ findById } as any);
    for (const row of [null, { kind: 'FINAL', snapshot: { awaitingFinalSnapshot: true } }, { kind: 'COMMENT', snapshot: { learner: {} } }]) {
      findById.mockResolvedValueOnce(row);
      await expect(service.read('me', id)).rejects.toThrow();
    }
    expect(findById).toHaveBeenCalledWith('me', id);
  });
  it('projects exact report counts without private candidates, plans or generation metadata', async () => {
    const group = { component: 'READING', purpose: 'EXAM', scope: 'FULL_SKILL', partNumber: null, sampleSize: 200, scores: Array(200).fill({ score: 7, maxScore: 10 }), parts: [] };
    const row = { id, kind: 'FINAL', snapshot: { learner: { goal: { completed: 205 }, statistics: [group], cumulative: { completed: 205, statistics: [group] }, period: { completed: 205 } }, candidates: ['private-test'], plan: { private: 'private-plan' } }, content: { source: 'RULE', generationKey: 'private-key', report: { narrative: 'Fallback' } } };
    const read = await new InsightContextService({ findById: async () => row } as any).read('me', id);
    expect(read.snapshot.goal!.completed).toBe(205);
    expect(read.snapshot.cumulative.statistics[0].sampleSize).toBe(200);
    expect(read.snapshot.cumulative.statistics[0].scores).toHaveLength(5);
    expect(JSON.stringify(read)).not.toContain('private-');
    expect(read.source).toBe('RULE');
  });
});
