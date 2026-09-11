import { hasRichTextContent } from '../../../components/common/richText';

const withFallbackExplanation = (explanation, fallback) => {
  if (hasRichTextContent(explanation)) return explanation;
  return fallback;
};

export const calculateScore = (answers, testData, mode = 'full') => {
  let totalScore = 0;
  let totalQuestions = 0;
  
  const results = {
    part1: { score: 0, total: 0, details: [] },
    part2: { score: 0, total: 0, details: [] },
    part3: { score: 0, total: 0, details: [] },
    part4: { score: 0, total: 0, details: [] },
    overall: { score: 0, total: 0, cefr: 'A1' }
  };

  const showPart1 = mode === 'full' || mode === 'part1';
  const showPart2 = mode === 'full' || mode === 'part2';
  const showPart3 = mode === 'full' || mode === 'part3';
  const showPart4 = mode === 'full' || mode === 'part4';

  // Part 1
  if (showPart1 && testData.part1 && testData.part1.questions) {
    testData.part1.questions.forEach(q => {
      const userAnswer = answers[q.id];
      const isCorrect = userAnswer === q.answer;
      if (isCorrect) results.part1.score++;
      results.part1.total++;
      
      results.part1.details.push({
        id: q.id,
        question: `Gap [${q.position}]`,
        userAnswer: userAnswer || '(No answer)',
        correctAnswer: q.answer,
        isCorrect,
        explanation: withFallbackExplanation(
          q.explanation,
          `“${q.answer}” is the correct answer because it best completes gap ${q.position} in both meaning and grammar. Read the full sentence with this option to confirm that it fits the surrounding context.`
        )
      });
    });
  }

  // Part 2
  if (showPart2 && testData.part2 && testData.part2.sentences) {
    // Only sentences with correctPosition are actually gaps
    const gapSentences = testData.part2.sentences.filter(s => s.correctPosition && s.correctPosition > 1);
    gapSentences.forEach(s => {
      const userPosition = answers[s.id];
      const isCorrect = userPosition === s.correctPosition;
      if (isCorrect) results.part2.score++;
      results.part2.total++;

      results.part2.details.push({
        id: s.id,
        question: `Sentence for Gap [${s.correctPosition}]`,
        userAnswer: userPosition ? `Position ${userPosition}` : '(No answer)',
        correctAnswer: `Position ${s.correctPosition}`,
        isCorrect,
        explanation: withFallbackExplanation(
          s.explanation,
          `This sentence belongs in position ${s.correctPosition}. Its references and linking words connect logically with the ideas immediately before and after that position.`
        )
      });
    });
  }

  // Part 3
  if (showPart3 && testData.part3 && testData.part3.questions) {
    testData.part3.questions.forEach(q => {
      const userAnswer = answers[q.id];
      const isCorrect = userAnswer === q.answer;
      if (isCorrect) results.part3.score++;
      results.part3.total++;
      
      results.part3.details.push({
        id: q.id,
        question: q.statement,
        userAnswer: userAnswer || '(No answer)',
        correctAnswer: q.answer,
        isCorrect,
        explanation: withFallbackExplanation(
          q.explanation,
          `The correct answer is ${q.answer}. The information associated with ${q.answer} in the passage directly matches the statement in this question.`
        )
      });
    });
  }

  // Part 4
  if (showPart4 && testData.part4 && testData.part4.headings && testData.part4.paragraphs) {
    testData.part4.paragraphs.forEach(p => {
      // Find the heading that has correctParagraph === p.id
      const correctHeading = testData.part4.headings.find(h => h.correctParagraph === p.id);
      if (correctHeading) {
        const userHeadingId = answers[p.id];
        const isCorrect = userHeadingId === correctHeading.id;
        if (isCorrect) results.part4.score++;
        results.part4.total++;

        results.part4.details.push({
          id: p.id,
          question: `Heading for ${p.label || p.id}`,
          userAnswer: userHeadingId ? (testData.part4.headings.find(h => h.id === userHeadingId)?.text || userHeadingId) : '(No answer)',
          correctAnswer: correctHeading.text,
          isCorrect,
          explanation: withFallbackExplanation(
            correctHeading.explanation,
            `“${correctHeading.text}” is the correct heading because it summarizes the main idea of ${p.label || p.id}, while the other headings focus on different topics.`
          )
        });
      }
    });
  }

  // Calculate Overall
  results.overall.score = results.part1.score + results.part2.score + results.part3.score + results.part4.score;
  results.overall.total = results.part1.total + results.part2.total + results.part3.total + results.part4.total;
  
  // Calculate CEFR based on percentage
  const percentage = results.overall.total > 0 ? (results.overall.score / results.overall.total) * 100 : 0;
  if (percentage >= 90) results.overall.cefr = 'C';
  else if (percentage >= 70) results.overall.cefr = 'B2';
  else if (percentage >= 50) results.overall.cefr = 'B1';
  else if (percentage >= 30) results.overall.cefr = 'A2';
  else results.overall.cefr = 'A1';

  return results;
};
