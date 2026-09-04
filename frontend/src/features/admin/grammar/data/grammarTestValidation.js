const text = (value) => String(value ?? '').trim();
const normalized = (value) => text(value).toLocaleLowerCase();
const hasDuplicates = (values) => new Set(values.map(normalized)).size !== values.length;
const LETTERS = 'ABCDEFGHIJ'.split('');

export function validateGrammarDetails(details = {}) {
  const errors = {};
  const title = text(details.title);
  if (!title) errors.title = 'Test title is required.';
  else if (title.length < 3) errors.title = 'Test title must contain at least 3 characters.';
  else if (title.length > 120) errors.title = 'Test title cannot exceed 120 characters.';
  return errors;
}

export function validateGrammarPart1(part = {}) {
  const errors = [];
  const questions = Array.isArray(part.questions) ? part.questions : [];
  if (questions.length !== 25) errors.push('Part 1 must contain exactly 25 questions.');
  const completedTexts = [];
  questions.forEach((question, index) => {
    const number = index + 1;
    const questionText = text(question.text);
    const options = Array.isArray(question.options) ? question.options : [];
    if (!questionText) errors.push(`Question ${number}: question content is required.`);
    else {
      completedTexts.push(questionText);
      if (questionText.length > 500) errors.push(`Question ${number}: content cannot exceed 500 characters.`);
    }
    if (options.length !== 3) errors.push(`Question ${number}: exactly three answer options are required.`);
    const optionTexts = options.map(text);
    optionTexts.forEach((option, optionIndex) => {
      if (!option) errors.push(`Question ${number}: option ${String.fromCharCode(65 + optionIndex)} is required.`);
      else if (option.length > 300) errors.push(`Question ${number}: option ${String.fromCharCode(65 + optionIndex)} cannot exceed 300 characters.`);
    });
    if (optionTexts.every(Boolean) && hasDuplicates(optionTexts)) errors.push(`Question ${number}: answer options must be different.`);
    if (!Number.isInteger(question.correctAnswer) || question.correctAnswer < 0 || question.correctAnswer >= options.length) errors.push(`Question ${number}: select one valid correct answer.`);
  });
  if (completedTexts.length && hasDuplicates(completedTexts)) errors.push('Part 1 cannot contain duplicate question content.');
  return errors;
}

export function validateGrammarPart2(part = {}) {
  const errors = [];
  const sets = Array.isArray(part.sets) ? part.sets : [];
  if (sets.length !== 5) errors.push('Part 2 must contain exactly 5 vocabulary sets.');
  const allTargets = [];
  const allIds = [];
  sets.forEach((set, setIndex) => {
    const label = `Set ${setIndex + 1}`;
    const instruction = text(set.instruction);
    const targets = Array.isArray(set.targetWords) ? set.targetWords : [];
    const options = Array.isArray(set.options) ? set.options : [];
    if (!instruction) errors.push(`${label}: instruction is required.`);
    else if (instruction.length > 600) errors.push(`${label}: instruction cannot exceed 600 characters.`);
    if (targets.length !== 5) errors.push(`${label}: exactly 5 target words are required.`);
    if (options.length !== 10) errors.push(`${label}: exactly 10 answer-bank options are required.`);

    const targetTexts = targets.map((target) => text(target.word));
    targetTexts.forEach((word, index) => {
      if (!word) errors.push(`${label}, target ${index + 1}: word is required.`);
      else if (word.length > 100) errors.push(`${label}, target ${index + 1}: word cannot exceed 100 characters.`);
      allTargets.push(word);
      allIds.push(targets[index]?.id);
    });
    if (targetTexts.every(Boolean) && hasDuplicates(targetTexts)) errors.push(`${label}: target words must be different.`);

    const optionLabels = options.map((option) => text(option.label).toUpperCase());
    const optionTexts = options.map((option) => text(option.text));
    if (optionLabels.length === 10 && (new Set(optionLabels).size !== 10 || optionLabels.some((option) => !LETTERS.includes(option)))) errors.push(`${label}: answer-bank labels must be unique letters A–J.`);
    optionTexts.forEach((option, index) => {
      if (!option) errors.push(`${label}, option ${optionLabels[index] || index + 1}: answer text is required.`);
      else if (option.length > 100) errors.push(`${label}, option ${optionLabels[index] || index + 1}: answer text cannot exceed 100 characters.`);
    });
    if (optionTexts.every(Boolean) && hasDuplicates(optionTexts)) errors.push(`${label}: answer-bank words must be different.`);

    const correctAnswers = targets.map((target) => text(target.correctAnswer).toUpperCase());
    correctAnswers.forEach((answer, index) => {
      if (!optionLabels.includes(answer)) errors.push(`${label}, target ${index + 1}: select a valid answer from this set.`);
    });
    if (correctAnswers.every(Boolean) && new Set(correctAnswers).size !== correctAnswers.length) errors.push(`${label}: each target word must use a different correct answer.`);
  });
  const filledTargets = allTargets.filter(Boolean);
  if (filledTargets.length && hasDuplicates(filledTargets)) errors.push('Part 2 cannot reuse the same target word in different sets.');
  if (allIds.some((id) => id == null) || new Set(allIds).size !== allIds.length) errors.push('Part 2 question identifiers must be unique.');
  return errors;
}

export function validateGrammarPart(partNumber, part) {
  return Number(partNumber) === 2 ? validateGrammarPart2(part) : validateGrammarPart1(part);
}

export function validateGrammarTest(test = {}) {
  const errors = validateGrammarDetails(test.details);
  const modes = test.mode === 'full' ? ['part1', 'part2'] : [test.mode];
  if (!['part1', 'part2', 'full'].includes(test.mode)) errors.mode = 'Select a valid test mode.';
  if (modes.includes('part1')) {
    const partErrors = validateGrammarPart1(test.parts?.[1]);
    if (partErrors.length) errors.part1 = partErrors;
  }
  if (modes.includes('part2')) {
    const partErrors = validateGrammarPart2(test.parts?.[2]);
    if (partErrors.length) errors.part2 = partErrors;
  }
  return errors;
}
