import { assessSpeaking } from './speaking-assessment';
import { CRITERIA_KEYS, finalizeSpeaking, validateSpeakingAssessment } from './speaking-ai-policy';
import { AssessmentPaper } from '../types/attempt.type';

const paper: AssessmentPaper = { component: 'SPEAKING', mode: 'full', title: 'Speaking', parts: {},
  items: [1,2,3,4].map(partNumber => ({ key: `p${partNumber}:q1`, partNumber, kind: 'AUDIO', points: 0 })) };
const raw = () => ({ responses: [{ key: 'p1:q1', status: 'ASSESSED',
  criteria: { grammarVocabulary: 80, pronunciation: 70, fluency: 90, taskFulfillment: 60 },
  feedback: 'Nói rõ hơn; ví dụ: I enjoy reading.', qualityFlags: [] }], estimatedCefr: 'B2', cefrReason: 'Chỉ ghi một câu; phạm vi bằng chứng hạn chế.' });
describe('Speaking AI policy', () => {
  it('validates exact Part coverage and saves Part feedback without changing scores', () => {
    const feedback = [1, 2, 3, 4].map(partNumber => ({ partNumber, overview: 'Nhận xét tổng hợp.', strengths: [], weaknesses: [], suggestions: ['Trả lời đầy đủ.'] }));
    const input = { ...raw(), partFeedback: feedback };
    const checked = validateSpeakingAssessment(input, ['p1:q1'], false, [1, 2, 3, 4]);
    const result = finalizeSpeaking(paper, {}, checked, 'test', assessSpeaking(paper.items, {}));
    expect(result.score).toBe(9.38);
    expect(result.speaking?.partFeedback?.[0]).toEqual(feedback[0]);
    expect(result.speaking?.partFeedback?.[1].strengths).toEqual([]);
    expect(result.speaking?.partFeedback?.[1].overview).toContain('chưa gửi bản ghi âm');
    expect(() => validateSpeakingAssessment(raw(), ['p1:q1'], false, [1])).toThrow();
    expect(() => validateSpeakingAssessment(input, ['p1:q1'], false, [1])).toThrow();
    expect(() => validateSpeakingAssessment({ ...input, partFeedback: [feedback[0], feedback[0]] }, ['p1:q1'])).toThrow();
    expect(() => validateSpeakingAssessment({ ...input, partFeedback: [{ ...feedback[0], overview: ' ' }] }, ['p1:q1'])).toThrow();
    expect(() => validateSpeakingAssessment({ ...input, partFeedback: [{ ...feedback[0], strengths: ['', 'x'] }] }, ['p1:q1'])).toThrow();
  });
  it('requires all four detailed criteria for new grading and persists feedback without changing scores', () => {
    const input = raw();
    const details = { criterionFeedback: Object.fromEntries(CRITERIA_KEYS.map(key => [key,
      { comment: 'Bạn diễn đạt rõ ý chính.', strengths: [], weaknesses: [], suggestions: ['Bổ sung lý do.'] }])),
      strengths: [], weaknesses: [], suggestions: [], suggestedAnswer: 'I enjoy reading because it helps me relax.' };
    const detailed = { ...input, responses: [{ ...input.responses[0], details }] };
    const checked = validateSpeakingAssessment(detailed, ['p1:q1'], true);
    const result = finalizeSpeaking(paper, {}, checked, 'test', assessSpeaking(paper.items, {}));
    expect(result.score).toBe(9.38);
    expect(result.items[0].assessment?.details).toEqual(details);
    delete details.criterionFeedback.fluency;
    expect(() => validateSpeakingAssessment(detailed, ['p1:q1'], true)).toThrow();
    expect(() => validateSpeakingAssessment(raw(), ['p1:q1'], true)).toThrow();
    expect(() => validateSpeakingAssessment(raw(), ['p1:q1'])).not.toThrow();
  });
  it('live submissions queue AI instead of generating random points', () => {
    const result = assessSpeaking(paper.items, { 'p1:q1': { kind: 'AUDIO', mediaKey: 'https://example.com/audio' } });
    expect(result.method).toBe('PENDING_AI');
    expect(result.score).toBeNull();
    expect(result.items.map(item => item.outcome)).toEqual(['PENDING','SKIPPED','SKIPPED','SKIPPED']);
  });
  it('averages criteria, penalizes skipped tasks and keeps independent AI CEFR', () => {
    const result = finalizeSpeaking(paper, { 'p1:q1': 'I enjoy reading.' }, validateSpeakingAssessment(raw(), ['p1:q1']),
      'gemini-2.5-flash', assessSpeaking(paper.items, {}));
    expect(result.score).toBe(9.38);
    expect(result.speaking?.estimatedCefr).toBe('B2'); // Not converted from internal /50.
    expect(result.parts).toEqual([ { partNumber: 1, score: 37.5, maxScore: 50 },
      ...[2,3,4].map(partNumber => ({ partNumber, score: 0, maxScore: 50 })) ]);
    expect(result.items[0].assessment?.transcript).toBe('I enjoy reading.');
    expect(result.items[1].assessment).toBeUndefined();
    expect(result.counts.skipped).toBe(3);
  });
  it('no recording yields zero practice score and no CEFR, without a provider call', () => {
    const result = finalizeSpeaking(paper, {}, { responses: [], estimatedCefr: null, cefrReason: 'Không có bản ghi âm.' }, 'test', assessSpeaking(paper.items, {}));
    expect(result.score).toBe(0);
    expect(result.speaking?.estimatedCefr).toBeNull();
    expect(result.items.every(item => item.outcome === 'SKIPPED')).toBe(true);
  });
  it('silence cannot receive nonzero scores or a CEFR', () => {
    const input = raw(); input.responses[0].status = 'NO_SPEECH';
    const result = finalizeSpeaking(paper, { 'p1:q1': 'Thank you for watching.' }, validateSpeakingAssessment(input, ['p1:q1']), 'test', assessSpeaking(paper.items, {}));
    expect(result.score).toBe(0);
    expect(result.speaking?.estimatedCefr).toBeNull();
    expect(result.items[0].assessment?.transcript).toBe('');
  });
  it.each([-1,101,NaN,Infinity,'80'])('rejects invalid criterion %s', value => {
    const input = raw(); (input.responses[0].criteria as Record<string, unknown>).fluency = value;
    expect(() => validateSpeakingAssessment(input, ['p1:q1'])).toThrow('AI_INVALID_RESPONSE');
  });
  it('rejects duplicate, unknown or missing response keys', () => {
    expect(() => validateSpeakingAssessment(raw(), ['p2:q1'])).toThrow();
    expect(() => validateSpeakingAssessment({ ...raw(), responses: [] }, ['p1:q1'])).toThrow();
    expect(() => validateSpeakingAssessment({ ...raw(), responses: [raw().responses[0],raw().responses[0]] }, ['p1:q1','p2:q1'])).toThrow();
  });
  it('rejects fabricated CEFR labels', () => {
    expect(() => validateSpeakingAssessment({ ...raw(), estimatedCefr: 'C9' }, ['p1:q1'])).toThrow();
  });
  it('retains practice assistance metadata', () => {
    const previous = { ...assessSpeaking(paper.items, {}), assistance: { revealedKeys: ['p1:q1'] } };
    expect(finalizeSpeaking(paper, {}, validateSpeakingAssessment(raw(), ['p1:q1']), 'test', previous).assistance).toEqual(previous.assistance);
  });
});
