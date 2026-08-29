import { getStoredWritingTest, getStoredWritingTests } from '../../admin/writing/data/writingTestStorage';

export function getAdminWritingListItems() {
  return getStoredWritingTests().map((test) => ({
    id: test.id,
    title: test.details.title,
    desc: `${test.mode === 'full' ? 'Complete all four Aptis Writing tasks' : `Aptis Writing ${test.mode.replace('part', 'Part ')} practice`}\n${test.details.source}`,
    part: test.mode === 'full' ? 'Full Test' : test.mode.replace('part', 'Part '),
    tabId: test.mode,
    status: 'Not Started',
    pictureUrl: test.details.pictureUrl,
    isAdminTest: true,
  }));
}

export function getAdminWritingTask(testId, part) {
  const test = getStoredWritingTest(testId);
  if (!test) return null;
  const number = Number(part.replace('part', ''));
  const data = test.parts[number];
  if (!data) return null;
  if (number === 1) return { title: 'Part 1 – Word-level writing', instruction: data.context, questions: data.questions, type: 'short', wordGuide: '1–5 words', sampleAnswers: data.sampleAnswers };
  if (number === 2) return { title: 'Part 2 – Short text writing', instruction: data.instruction, questions: [data.prompt], type: 'long', wordGuide: '20–30 words', sampleAnswers: [data.sampleAnswer] };
  if (number === 3) return { title: 'Part 3 – Three written responses', instruction: data.context, questions: data.messages, type: 'long', wordGuide: '30–40 words each', sampleAnswers: data.sampleAnswers };
  return { title: 'Part 4 – Formal and informal writing', instruction: data.context, questions: [data.informalPrompt, data.formalPrompt], type: 'email', wordGuides: ['40–50 words', '120–150 words'], sampleAnswers: [data.informalSample, data.formalSample] };
}
