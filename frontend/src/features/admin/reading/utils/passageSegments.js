const markers = ['[1]', '[2]', '[3]', '[4]', '[5]'];

export function getPassageSegments(passage = '') {
  if (markers.every(marker => passage.split(marker).length === 2)) return passage.split(/\[[1-5]\]/g);
  return [passage, '', '', '', '', ''];
}

export function buildPassage(segments) {
  return segments.map((segment, index) => `${segment}${index < 5 ? markers[index] : ''}`).join('');
}
