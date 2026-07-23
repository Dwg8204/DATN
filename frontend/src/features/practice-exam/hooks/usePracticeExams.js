const PRACTICE_EXAMS = [
  {
    id: 'pe-001',
    title: 'Reading - Unit 1',
    duration: '45 phút',
    level: 'B1',
  },
  {
    id: 'pe-002',
    title: 'Listening - Mock Test',
    duration: '30 phút',
    level: 'B2',
  },
  {
    id: 'pe-003',
    title: 'Combined Practice Set',
    duration: '60 phút',
    level: 'B1+',
  },
];

export default function usePracticeExams() {
  return {
    exams: PRACTICE_EXAMS,
    loading: false,
    error: null,
  };
}
