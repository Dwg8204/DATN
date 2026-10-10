export function getPart2Texts(part) {
  if (Array.isArray(part?.texts) && part.texts.length) return part.texts;
  if (Array.isArray(part?.sentences)) {
    return [{ id: 'p2-text1', title: part.title || '', sentences: part.sentences }];
  }
  return [];
}

export function getPart2Sentences(part) {
  return getPart2Texts(part).flatMap(text => text.sentences || []);
}

export function getPart2QuestionCount(part) {
  return getPart2Texts(part).reduce((total, text) => (
    total + Math.max(0, (text.sentences || []).length - 1)
  ), 0);
}
