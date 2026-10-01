export function shuffleSentences(sentences, random = Math.random) {
  const items = sentences.filter(sentence => sentence.correctPosition !== 1);
  const original = items.map(sentence => sentence.id).join('|');
  for (let i = items.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [items[i], items[j]] = [items[j], items[i]];
  }
  if (items.length > 1 && items.map(sentence => sentence.id).join('|') === original) items.push(items.shift());
  return items;
}
