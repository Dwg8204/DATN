export const calculateScore = (answers, testData) => {
  let totalScore = 0;
  let totalQuestions = 0;
  
  const results = {
    part1: { score: 0, total: 0, details: [] },
    part2: { score: 0, total: 0, details: [] },
    part3: { score: 0, total: 0, details: [] },
    part4: { score: 0, total: 0, details: [] },
    overall: { score: 0, total: 0, cefr: 'A1' }
  };

  // Part 1
  if (testData.part1 && testData.part1.questions) {
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
        explanation: `The correct word for gap [${q.position}] is "${q.answer}".` // Mock AI explanation
      });
    });
  }

  // Part 2
  if (testData.part2 && testData.part2.sentences) {
    // Only sentences with correctPosition are actually gaps
    const gapSentences = testData.part2.sentences.filter(s => s.correctPosition);
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
        explanation: `The sentence "${s.content}" fits best in gap [${s.correctPosition}].`
      });
    });
  }

  // Part 3
  if (testData.part3 && testData.part3.questions) {
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
        explanation: `${q.answer} mentioned this in the text.`
      });
    });
  }

  // Part 4
  if (testData.part4 && testData.part4.headings && testData.part4.paragraphs) {
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
          explanation: `The paragraph ${p.label || p.id} fits best with the heading "${correctHeading.text}".`
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
