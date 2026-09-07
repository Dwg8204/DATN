import { hasRichTextContent } from '../../../../components/common/richText.js';
const required = hasRichTextContent;

export function validateWritingDetails(details) {
  const errors = {};
  if (!required(details.title)) errors.title = 'Test title is required.';
  if (details.title?.trim().length > 180) errors.title = 'Test title must not exceed 180 characters.';
  if (details.pictureUrl && !/^(https?:\/\/|data:image\/)/i.test(details.pictureUrl)) errors.pictureUrl = 'Use a valid image.';
  return errors;
}

export function validateWritingPart(partNumber, part) {
  const errors = {};
  if (partNumber === 1) {
    if (!required(part.context)) errors.context = 'Context is required.';
    const invalid = part.questions.map((question, index) => !required(question) ? index : null).filter((value) => value !== null);
    if (invalid.length) errors.questions = `Complete all 5 questions. Missing: ${invalid.map((index) => index + 1).join(', ')}.`;
    if (part.sampleAnswers.some((answer) => !required(answer))) errors.sampleAnswers = 'Add a sample answer for all 5 questions.';
  }
  if (partNumber === 2) {
    if (!required(part.instruction)) errors.instruction = 'Instruction is required.';
    if (!required(part.prompt)) errors.prompt = 'Question content is required.';
    if (!required(part.sampleAnswer)) errors.sampleAnswer = 'Sample answer is required.';
  }
  if (partNumber === 3) {
    if (!required(part.context)) errors.context = 'Context is required.';
    if (part.messages.some((message) => !required(message))) errors.messages = 'Complete all 3 member prompts.';
    if (part.sampleAnswers.some((answer) => !required(answer))) errors.sampleAnswers = 'Add a sample response for all 3 prompts.';
  }
  if (partNumber === 4) {
    if (!required(part.context)) errors.context = 'Context is required.';
    if (!required(part.informalPrompt)) errors.informalPrompt = 'Informal email prompt is required.';
    if (!required(part.formalPrompt)) errors.formalPrompt = 'Formal email prompt is required.';
    if (!required(part.informalSample)) errors.informalSample = 'Informal sample email is required.';
    if (!required(part.formalSample)) errors.formalSample = 'Formal sample email is required.';
  }
  return errors;
}

export const hasValidationErrors = (errors) => Object.keys(errors).length > 0;

export function validateWritingTest(test) {
  const errors = { details: validateWritingDetails(test.details), parts: {} };
  const partNumbers = test.mode === 'full' ? [1, 2, 3, 4] : [Number(test.mode.replace('part', ''))];
  partNumbers.forEach((partNumber) => { errors.parts[partNumber] = validateWritingPart(partNumber, test.parts[partNumber]); });
  return errors;
}

export function hasWritingTestErrors(errors) {
  return hasValidationErrors(errors.details) || Object.values(errors.parts).some(hasValidationErrors);
}
