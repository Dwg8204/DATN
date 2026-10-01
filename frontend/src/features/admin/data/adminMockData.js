const names = ['Milk and Butter', 'Going to the cinema', 'Local food shops', 'Language Club', 'Weekend Exhibition', 'Learning a new skill', 'Community Garden', 'Travel Club', 'Book Club'];
const components = ['Reading', 'Listening', 'Writing', 'Grammar & Vocab', 'Speaking'];
export const ADMIN_TESTS = Array.from({ length: 45 }, (_, index) => ({
  id: `writing-${index + 1}`,
  name: names[index % names.length] + (index >= names.length ? ` ${Math.floor(index / names.length) + 1}` : ''),
  component: components[index % components.length],
  section: index % 4 === 3 ? 'Full Test' : `Part ${(index % 4) + 1}`,
  status: index % 3 === 0 ? 'Done' : 'Not Yet',
  dateAdded: new Date(2025, index % 12, (index * 7) % 27 + 1).toISOString(),
  attempts: 30 + index * 11,
  questionType:['Table','Line Graph','Map','Map','Map','Process'][index%6],
}));
