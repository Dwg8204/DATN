import { ListeningTestContentService } from './listening-test-content.service';
import { ListeningTestAggregate } from '../types/listening-test.type';

describe('Listening draft persistence', () => {
  const service = new ListeningTestContentService();
  const draft = (): ListeningTestAggregate => ({
    mode: 'part1', purpose: 'PRACTICE', details: { title: 'Incomplete draft' },
    parts: { 1: { questions: Array.from({ length: 13 }, (_, index) => ({
      id: String(index + 1), text: '', audioUrl: '', options: ['', '', ''], correctAnswer: 0,
    })) } },
  });

  it('saves unfinished questions without requiring audio or answers', () => {
    expect(() => service.assertDraftShape(draft())).not.toThrow();
  });
  it('still rejects publishing the same unfinished draft', () => {
    expect(() => service.assertPublishable(draft())).toThrow();
  });
  it('rejects malformed collections before repository persistence', () => {
    const test = draft();
    test.parts[1]!.questions[0].options = [];
    expect(() => service.assertDraftShape(test)).toThrow('invalid draft structure');
  });
  it('continues to require full scope for mock tests', () => {
    const test = draft();
    test.purpose = 'EXAM';
    expect(() => service.assertDraftShape(test)).toThrow('Exam tests must contain the full skill.');
  });
});
