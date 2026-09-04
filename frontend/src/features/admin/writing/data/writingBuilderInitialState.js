export const WRITING_PART_META = [
  { number: 1, title: 'Word completion', summary: 'Answer 5 questions. 1–5 words per answer.' },
  { number: 2, title: 'Short text writing', summary: 'Write 20–30 words.' },
  { number: 3, title: 'Three written responses', summary: 'Write 30–40 words per response.' },
  { number: 4, title: 'Formal and informal writing', summary: 'Informal email: 40–50 words. Formal email: 120–150 words.' },
];

export const INITIAL_WRITING_TEST = {
  id: null,
  mode: 'full',
  details: { title: 'Local food shops', source: 'AptiMate Practice Test', pictureUrl: '' },
  parts: {
    1: { context: 'You want to join a language club. You have 5 messages from a member of the club. Write short answers (1–5 words) to each message.', questions: ['Please tell us about the last book you read.', 'What kind of music do you listen to most?', '', '', ''], sampleAnswers: ['The Great Gatsby', 'Pop music', '', '', ''] },
    2: { instruction: 'You are a new member of the Travel Club. Fill in the form. Write in sentences. Use 20–30 words. Recommended time: 7 minutes.', prompt: 'Why did you join the Travel Club and what would you like to learn?', sampleAnswer: '' },
    3: { context: 'You are a member of the language club. You are talking to other members in the club chat room.', messages: ['Hi! I am a new member. How long have you been in the club and why did you join?', 'Welcome! What is your favourite activity to do here?', ''], sampleAnswers: ['', '', ''] },
    4: { context: 'The club has announced an important change to next month’s programme.', informalPrompt: 'Write an email to a friend in the club. Explain how you feel and suggest what you can do together instead.', informalSample: '', formalPrompt: 'Write an email to the club manager. Explain your concerns and ask for more information about the new arrangements.', formalSample: '' },
  },
};

export function createWritingTestDraft(mode = 'full') {
  return { ...structuredClone(INITIAL_WRITING_TEST), mode };
}
