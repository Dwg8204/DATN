export function countWords(value) {
  return value
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .length;
}
