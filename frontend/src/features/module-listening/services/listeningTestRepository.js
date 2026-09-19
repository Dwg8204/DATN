import { listeningTestsApi } from '../../admin/listening/services/listeningTestsApi';

const adaptQuestion = question => ({ ...question, answer: question.correctAnswer ?? question.answer });

export async function getListeningTestParts(id, signal) {
  const test = await listeningTestsApi.getPublished(id, signal);
  if (!test || !test.parts) throw new Error('Test not found');

  return {
    part1: test.parts[1]?.questions?.map(adaptQuestion) || [],
    part2: test.parts[2] || { speakers: [], options: [], answers: [] },
    part3: test.parts[3] ? {
      ...test.parts[3],
      answers: Object.fromEntries(test.parts[3].statements.map(statement => [statement.id, statement.answer]))
    } : { statements: [], answers: {} },
    part4: test.parts[4]?.recordings?.map(recording => ({
      ...recording,
      subQuestions: recording.subQuestions.map(adaptQuestion)
    })) || []
  };
}
