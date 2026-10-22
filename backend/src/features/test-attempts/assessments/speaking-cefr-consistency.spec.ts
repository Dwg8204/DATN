import { speakingCefrNeedsRepair, speakingCompletionContext } from './speaking-cefr-consistency';
import { AiAssessment, finalizeSpeaking } from './speaking-ai-policy';
import { assessSpeaking } from './speaking-assessment';
import { AssessmentPaper } from '../types/attempt.type';

const paper: AssessmentPaper = { component: 'SPEAKING', mode: 'full', title: 'Full', parts: {},
  items: [1, 2, 3, 4].flatMap(partNumber => Array.from({ length: partNumber === 4 ? 1 : 3 }, (_, i) => ({
    key: `p${partNumber}:q${i + 1}`, partNumber, kind: 'AUDIO' as const, points: 0,
  }))) };
const assessment = (count = 9): AiAssessment => ({ responses: paper.items.slice(0, count).map(item => ({
  key: item.key, status: 'ASSESSED', criteria: { grammarVocabulary: 80, pronunciation: 80, fluency: 80, taskFulfillment: 80 },
  feedback: 'Diễn đạt rõ ý.', qualityFlags: [],
})), estimatedCefr: 'B2', cefrReason: 'Ước lượng dựa trên lời nói; bỏ một câu nên còn hạn chế về mức độ hoàn thành.' });

describe('Speaking full-test completion and CEFR', () => {
  it('keeps a CEFR with one skipped question while the zero lowers /50', () => {
    const assessed = assessment();
    const full = finalizeSpeaking(paper, {}, assessment(10), 'test', assessSpeaking(paper.items, {}));
    const partial = finalizeSpeaking(paper, {}, assessed, 'test', assessSpeaking(paper.items, {}));
    expect(full.score).toBe(40);
    expect(partial.score).toBe(36);
    expect(partial.speaking?.estimatedCefr).toBe('B2');
    expect(speakingCefrNeedsRepair(paper, assessed)).toBe(false);
    expect(speakingCompletionContext(paper, assessed)).toMatchObject({ assessmentScope: 'FULL_SKILL',
      totalQuestions: 10, recordedQuestions: 9, assessableQuestions: 9, practiceScoreOutOf50: 36, skippedKeys: ['p4:q1'] });
  });
  it('requests repair for null or Part-only excuses even with partial coverage', () => {
    expect(speakingCefrNeedsRepair(paper, { ...assessment(), estimatedCefr: null })).toBe(true);
    expect(speakingCefrNeedsRepair(paper, { ...assessment(1), estimatedCefr: null })).toBe(true);
    expect(speakingCefrNeedsRepair(paper, { ...assessment(), cefrReason: 'Một phần thi không thể xác định trình độ CEFR tổng thể.' })).toBe(true);
  });
  it('does not invent CEFR for empty/silent audio or Part practice', () => {
    expect(speakingCefrNeedsRepair(paper, { ...assessment(0), estimatedCefr: null })).toBe(false);
    const silent = assessment(1);
    silent.responses[0].status = 'NO_SPEECH'; silent.estimatedCefr = null;
    expect(speakingCefrNeedsRepair(paper, silent)).toBe(false);
    expect(speakingCompletionContext(paper, silent).practiceScoreOutOf50).toBe(0);
    expect(speakingCefrNeedsRepair({ ...paper, mode: 'part1' }, { ...assessment(1), estimatedCefr: null })).toBe(false);
  });
});
