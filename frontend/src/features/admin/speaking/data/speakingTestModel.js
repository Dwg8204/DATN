export const SPEAKING_PARTS = [
  { number: 1, title: 'My Profile', summary: '3 personal questions · 30 seconds per response.' },
  { number: 2, title: 'Describe and explain', summary: '1 picture and 3 questions · 45 seconds per response.' },
  { number: 3, title: 'Compare and explain', summary: '2 pictures and 3 questions · 45 seconds per response.' },
  { number: 4, title: 'Discuss a topic', summary: '1 picture and 3 questions · 60 seconds preparation, 120 seconds response.' },
];
const questions = prefix => Array.from({ length: 3 }, (_, index) => ({ id: `${prefix}-${index + 1}`, text: '' }));
export function createSpeakingDraft(mode = 'full') {
  return {
    id: null, mode, details: { title: '', pictureUrl: '' }, parts: {
      1: { questions: questions('p1') },
      2: { imageUrl: '', questions: questions('p2') },
      3: { imageUrls: ['', ''], questions: questions('p3') },
      4: { topic: '', imageUrl: '', questions: questions('p4') },
    }
  };
}
