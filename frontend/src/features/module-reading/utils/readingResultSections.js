const records = value => Array.isArray(value) ? value.filter(item => item && typeof item === 'object') : [];

// Part 2 now contains separate texts, each with its own options and positions.
// Keep legacy one-text results readable without mixing options between texts.
export function readingResultSections(paper, partNumber) {
  if (!paper || typeof paper !== 'object') return [];
  if (partNumber === 2) {
    const texts = Array.isArray(paper.texts) ? records(paper.texts) : [paper];
    return texts.map((text, index) => ({
      id: text.id || `p2-text${index + 1}`,
      title: `Text ${index + 1}${text.title ? ` · ${text.title}` : ''}`,
      openingSentence: text.openingSentence || '',
      rows: records(text.positions).map(item => ({
        key: item.key, prompt: `Position ${item.position}`, options: records(text.options),
      })),
    }));
  }
  let rows;
  if (partNumber === 1) rows = records(paper.questions).map(item => ({
    key: item.key, prompt: `Gap ${item.position}`, options: records(item.options),
  }));
  else if (partNumber === 3) rows = records(paper.questions).map(item => ({
    key: item.key, prompt: item.statement,
    options: records(paper.speakers).map(speaker => ({ id: speaker.id, text: speaker.name })),
  }));
  else if (partNumber === 4) rows = records(paper.paragraphs).map(item => ({
    key: item.key, prompt: item.content, options: records(paper.headings),
  }));
  else return [];
  return [{ id: `part${partNumber}`, rows }];
}
