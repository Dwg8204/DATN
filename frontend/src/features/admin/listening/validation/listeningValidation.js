import { validateExplanations } from '../../shared-test-builder/explanationValidation.js';
import { richTextToPlainText } from '../../../../components/common/richText.js';
const text = value => richTextToPlainText(value).trim();
const normalized = value => String(value || '').trim().toLocaleLowerCase();
const unique = values => new Set(values.map(normalized)).size === values.length;
const validAudio = value => text(value) && /^(https?:\/\/|blob:|data:audio\/)/i.test(value.trim());
const within = (value, max) => String(value || '').trim().length <= max;
const mcqError = question => {
  if (!question || !text(question.text)) return 'question content is required';
  if (!within(question.text, 500)) return 'question content cannot exceed 500 characters';
  if (!Array.isArray(question.options) || question.options.length !== 3) return 'exactly three options are required';
  if (question.options.some(option => !text(option))) return 'all three options are required';
  if (question.options.some(option => !within(option, 300))) return 'each option must contain at most 300 characters';
  if (!unique(question.options)) return 'the three options must be different';
  if (!Number.isInteger(question.correctAnswer) || question.correctAnswer < 0 || question.correctAnswer > 2) return 'select one valid correct answer';
  return '';
};

export function validateListeningPart(number, part = {}) {
  const explanationError = validateExplanations(part);
  if (explanationError) return [explanationError];
  if (number === 1) {
    if (!Array.isArray(part.questions) || part.questions.length !== 13) return ['Part 1 must contain exactly 13 questions.'];
    const ids = part.questions.map(question => question.id);
    if (ids.some(id => id == null) || new Set(ids).size !== 13) return ['Every Part 1 question must have a unique identifier.'];
    for (let index = 0; index < part.questions.length; index += 1) {
      const question = part.questions[index];
      if (!validAudio(question.audioUrl)) return [`Question ${index + 1}: add a valid audio URL or upload an audio file.`];
      const error = mcqError(question);
      if (error) return [`Question ${index + 1}: ${error}.`];
    }
    if (!unique(part.questions.map(question => question.text))) return ['Part 1 question content must not be duplicated.'];
  }
  if (number === 2) {
    if (!validAudio(part.audioUrl)) return ['Add a valid Part 2 audio URL or upload an audio file.'];
    if (!text(part.instruction)) return ['Enter the Part 2 instruction.'];
    if (!within(part.instruction, 800)) return ['Part 2 instruction cannot exceed 800 characters.'];
    if (!Array.isArray(part.speakers) || part.speakers.length !== 4) return ['Part 2 must contain exactly four speakers.'];
    if (part.speakers.some(value => !text(value)) || !unique(part.speakers)) return ['Enter four different speaker labels.'];
    if (part.speakers.some(value => !within(value, 100))) return ['Each speaker label must contain at most 100 characters.'];
    if (!Array.isArray(part.options) || part.options.length !== 5) return ['Part 2 must contain exactly five statements.'];
    if (part.options.some(value => !text(value)) || !unique(part.options)) return ['Enter five different statements.'];
    if (part.options.some(value => !within(value, 500))) return ['Each Part 2 statement must contain at most 500 characters.'];
    if (!Array.isArray(part.answers) || part.answers.length !== 4) return ['Select one statement for each of the four speakers.'];
    if (part.answers.some(value => !part.options.includes(value)) || new Set(part.answers).size !== 4) return ['Match every speaker to a different statement from the answer bank.'];
  }
  if (number === 3) {
    if (!validAudio(part.audioUrl)) return ['Add a valid Part 3 audio URL or upload an audio file.'];
    if (!text(part.context)) return ['Enter the Part 3 context or instruction.'];
    if (!within(part.context, 800)) return ['Part 3 context cannot exceed 800 characters.'];
    if (!text(part.subTitle)) return ['Enter the Part 3 question title.'];
    if (!within(part.subTitle, 300)) return ['Part 3 question title cannot exceed 300 characters.'];
    if (!Array.isArray(part.options) || part.options.length !== 3 || part.options.some(value => !text(value)) || !unique(part.options)) return ['Part 3 must provide three different answer choices.'];
    if (!Array.isArray(part.statements) || part.statements.length !== 4) return ['Part 3 must contain exactly four statements.'];
    const ids = part.statements.map(statement => statement.id);
    if (ids.some(id => id == null) || new Set(ids).size !== 4) return ['Every Part 3 statement must have a unique identifier.'];
    for (let index = 0; index < part.statements.length; index += 1) {
      const statement = part.statements[index];
      if (!text(statement.text)) return [`Statement ${index + 1}: content is required.`];
      if (!within(statement.text, 500)) return [`Statement ${index + 1}: content cannot exceed 500 characters.`];
      if (!part.options.includes(statement.answer)) return [`Statement ${index + 1}: select a valid correct opinion.`];
    }
    if (!unique(part.statements.map(statement => statement.text))) return ['Part 3 statements must not be duplicated.'];
  }
  if (number === 4) {
    if (!Array.isArray(part.recordings) || part.recordings.length !== 2) return ['Part 4 must contain exactly two recordings.'];
    const recordingIds = part.recordings.map(recording => recording.id);
    if (recordingIds.some(id => id == null) || new Set(recordingIds).size !== 2) return ['Every Part 4 recording must have a unique identifier.'];
    for (let index = 0; index < part.recordings.length; index += 1) {
      const recording = part.recordings[index];
      if (!validAudio(recording.audioUrl)) return [`Recording ${index + 1}: add a valid audio URL or upload an audio file.`];
      if (!text(recording.context)) return [`Recording ${index + 1}: context is required.`];
      if (!within(recording.context, 800)) return [`Recording ${index + 1}: context cannot exceed 800 characters.`];
      if (!Array.isArray(recording.subQuestions) || recording.subQuestions.length !== 2) return [`Recording ${index + 1}: exactly two questions are required.`];
      for (let questionIndex = 0; questionIndex < recording.subQuestions.length; questionIndex += 1) {
        const error = mcqError(recording.subQuestions[questionIndex]);
        if (error) return [`Recording ${index + 1}, question ${questionIndex + 1}: ${error}.`];
      }
      if (!unique(recording.subQuestions.map(question => question.text))) return [`Recording ${index + 1}: question content must not be duplicated.`];
    }
    const questionIds = part.recordings.flatMap(recording => recording.subQuestions.map(question => question.id));
    if (questionIds.some(id => id == null) || new Set(questionIds).size !== 4) return ['Every Part 4 question must have a unique identifier.'];
  }
  return [];
}

export function validateListeningTest(test = {}) {
  if (!['part1', 'part2', 'part3', 'part4', 'full'].includes(test.mode)) return ['Select a valid Listening test mode.'];
  if (!text(test.details?.title)) return ['Test title is required.'];
  if (test.details.title.trim().length < 3) return ['Test title must contain at least 3 characters.'];
  if (test.details.title.trim().length > 180) return ['Test title cannot exceed 180 characters.'];
  if (test.details.pictureUrl && !/^(https?:\/\/|data:image\/)/i.test(test.details.pictureUrl)) return ['Use a valid test picture.'];
  const parts = test.mode === 'full' ? [1, 2, 3, 4] : [Number(test.mode.slice(-1))];
  for (const number of parts) {
    const errors = validateListeningPart(number, test.parts?.[number]);
    if (errors.length) return [`Part ${number}: ${errors[0]}`];
  }
  return [];
}
