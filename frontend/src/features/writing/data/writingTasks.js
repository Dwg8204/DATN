export const WRITING_TASKS = {
  part1: {
    title: 'Part 1 – Word-level writing',
    instruction: 'Write five pieces of information. Use a single word or a short phrase for each answer.',
    questions: [
      'What do you do?',
      'What did you do yesterday?',
      'What is your favourite colour?',
      'What is the weather like today?',
      'How do you get to work?',
    ],
    type: 'short',
    wordGuide: '1–5 words',
  },
  part2: {
    title: 'Part 2 – Short text writing',
    instruction: 'You have joined a photography club. Complete the membership form in sentences. Write 20–30 words.',
    questions: ['Why are you interested in photography, and what would you like to learn from the club?'],
    type: 'long',
    wordGuide: '20–30 words',
  },
  part3: {
    title: 'Part 3 – Three written responses',
    instruction: 'Respond to three club members on the social network. Write 30–40 words for each response.',
    questions: [
      'Maria: What kind of photographs do you enjoy taking most?',
      'Daniel: Tell us about a memorable photograph you have taken.',
      'Sophie: How can the club help new photographers improve?',
    ],
    type: 'long',
    wordGuide: '30–40 words each',
  },
  part4: {
    title: 'Part 4 – Formal and informal writing',
    instruction: 'The club has cancelled this weekend’s exhibition. Write an informal email to a friend and a formal email to the club manager.',
    questions: [
      'Write an informal email to your friend. Explain how you feel and suggest an alternative activity.',
      'Write a formal email to the club manager. Explain your concerns and ask what arrangements will be made.',
    ],
    type: 'email',
    wordGuides: ['40–50 words', '120–150 words'],
  },
};
