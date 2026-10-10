import { examDurationMinutes } from './exam-time.policy';

describe('exam deadlines', () => {
  it('gives the full Reading Test a 35-minute server deadline', () => {
    expect(examDurationMinutes('READING')).toBe(35);
  });

  it('keeps the timing of the other skills unchanged', () => {
    expect(examDurationMinutes('GRAMMAR_VOCAB')).toBe(25);
    expect(examDurationMinutes('LISTENING')).toBe(40);
    expect(examDurationMinutes('WRITING')).toBe(50);
    expect(examDurationMinutes('SPEAKING')).toBe(12);
  });
});
