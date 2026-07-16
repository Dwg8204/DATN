// scoreCalculator.js

// Mock bảng quy đổi điểm APTIS Reading
// Điểm tối đa: 50
export const calculateAptisLevel = (score) => {
  if (score >= 43) return 'C1/C2';
  if (score >= 33) return 'B2';
  if (score >= 23) return 'B1';
  if (score >= 13) return 'A2';
  return 'A1';
};

// Hàm chấm điểm mẫu dựa trên mock data
export const calculateScore = (userAnswers, correctAnswers) => {
  let score = 0;
  let correct = 0;
  let wrong = 0;
  let blank = 0;

  correctAnswers.forEach(ans => {
    const userAns = userAnswers[ans.id];
    if (!userAns) {
      blank++;
    } else if (userAns === ans.answer) {
      correct++;
      score += 1; // Giả sử mỗi câu 1 điểm
    } else {
      wrong++;
    }
  });

  return { score, correct, wrong, blank };
};
