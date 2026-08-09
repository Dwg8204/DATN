export const WRITING_CONFIG = {
  skillKey: 'writing',
  title: 'WRITING TEST',
  parts: ['part1', 'part2', 'part3', 'part4'],
  tabs: [
    { id: 'part1', label: 'Part 1' },
    { id: 'part2', label: 'Part 2' },
    { id: 'part3', label: 'Part 3' },
    { id: 'part4', label: 'Part 4' },
    { id: 'full', label: 'Full Writing test' },
  ],
  tests: Array.from({ length: 5 }, (_, testIndex) => (
    ['part1', 'part2', 'part3', 'part4', 'full'].map((tabId, partIndex) => ({
      id: `${partIndex + 1}-${testIndex + 1}`,
      title: `${tabId === 'full' ? 'Full Writing Test' : `Writing ${tabId.replace('part', 'Part ')}`} – Set ${testIndex + 1}`,
      desc: tabId === 'full' ? 'Complete all four Aptis Writing tasks\n50 minutes' : 'Aptis Writing practice task\nReal-life communication topic',
      part: tabId === 'full' ? 'Full Test' : tabId.replace('part', 'Part '),
      tabId,
      status: 'Not Started',
    }))
  )).flat(),
};
