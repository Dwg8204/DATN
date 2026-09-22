export const DASHBOARD_PERIODS = [
  { value: 'this-year', label: 'This year' },
  { value: '12-months', label: '12 months' },
  { value: '6-months', label: '6 months' },
  { value: '30-days', label: '30 days' },
  { value: 'week', label: 'Week' },
  { value: '24-hours', label: '24 hours' },
];

export const DASHBOARD_SKILLS = [
  { value: 'ALL', label: 'All skills' },
  { value: 'READING', label: 'Reading' },
  { value: 'LISTENING', label: 'Listening' },
  { value: 'WRITING', label: 'Writing' },
  { value: 'GRAMMAR_VOCAB', label: 'Grammar & Vocab' },
  { value: 'SPEAKING', label: 'Speaking' },
];

export const SKILL_COLORS = {
  READING: '#8b7cf6',
  LISTENING: '#ff8e8e',
  WRITING: '#42bfc9',
  GRAMMAR_VOCAB: '#e51d2a',
  SPEAKING: '#f2a84a',
};

export const formatCount = value => new Intl.NumberFormat('en-US').format(value ?? 0);

export function formatGeneratedAt(value) {
  if (!value) return '';
  return new Intl.DateTimeFormat('en-GB', {
    hour: '2-digit', minute: '2-digit', day: '2-digit', month: 'short', timeZone: 'Asia/Bangkok',
  }).format(new Date(value));
}
