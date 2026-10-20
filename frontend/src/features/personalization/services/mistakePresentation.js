import { readingResultSections } from '../../module-reading/utils/readingResultSections.js';

export function mistakeSections(detail) {
  const { paper = {}, component, partNumber } = detail;
  let sections;
  if (component === 'READING')
    sections = readingResultSections(paper, partNumber).map((section) => ({
      ...section,
      context:
        partNumber === 1
          ? paper.passageHtml || paper.passage
          : partNumber === 3
            ? (paper.speakers ?? [])
                .map((s) => `${s.name}: ${s.post}`)
                .join('\n\n')
            : section.openingSentence,
    }));
  else if (component === 'GRAMMAR_VOCAB' && partNumber === 2)
    sections = (paper.sets ?? []).map((set) => ({
      id: set.setId,
      context: set.instruction,
      rows: (set.targetWords ?? []).map((word) => ({
        key: word.key,
        prompt: word.word,
        options: set.options ?? [],
      })),
    }));
  else if (component === 'LISTENING' && partNumber === 4)
    sections = (paper.recordings ?? []).map((recording) => ({
      id: recording.id,
      context: recording.context,
      audioUrl: recording.audioUrl,
      rows: (recording.subQuestions ?? []).map((question) => ({
        ...question,
        prompt: question.text,
      })),
    }));
  else
    sections = [
      {
        id: `part${partNumber}`,
        context: paper.instruction || paper.context,
        audioUrl: paper.audioUrl,
        rows: (paper.questions ?? paper.speakers ?? paper.statements ?? []).map(
          (question) => ({
            ...question,
            prompt: question.text || question.name,
            options: question.options ?? paper.options ?? [],
          }),
        ),
      },
    ];
  const outcomes = new Map(detail.items.map((item) => [item.key, item]));
  return sections
    .map((section) => ({
      ...section,
      rows: section.rows
        .filter((row) => outcomes.has(row.key))
        .map((row) => {
          const outcome = outcomes.get(row.key);
          return {
            ...row,
            outcome,
            selected:
              row.options.find(
                (option) => option.id === outcome.selectedAnswer?.optionId,
              )?.text ?? null,
            correct:
              row.options.find((option) => option.id === outcome.correctAnswer)
                ?.text ?? null,
          };
        }),
    }))
    .filter((section) => section.rows.length);
}
