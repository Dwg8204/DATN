import { Injectable } from '@nestjs/common';

export type QuestionAnswerPair = {
  questionId: string;
  partNumber: number;
  questionType: string;
  correctAnswer: Record<string, unknown>;
  userAnswer?: unknown;
};

export type PartGradingResult = {
  partNumber: number;
  skill: string;
  correct: number;
  total: number;
  score: number;
};

export type GradingSummary = {
  totalScore: number;
  maxScore: number;
  scaledScore: number;
  cefrLevel: string;
  parts: PartGradingResult[];
  answers: Array<{
    questionId: string;
    partNumber: number;
    userAnswer: unknown;
    correctAnswer: unknown;
    isCorrect: boolean;
  }>;
};

@Injectable()
export class ReadingGraderService {
  grade(pairs: QuestionAnswerPair[]): GradingSummary {
    let totalCorrect = 0;
    const totalQuestions = pairs.length > 0 ? pairs.length : 1;

    const partStats: Record<number, { correct: number; total: number }> = {
      1: { correct: 0, total: 0 },
      2: { correct: 0, total: 0 },
      3: { correct: 0, total: 0 },
      4: { correct: 0, total: 0 },
    };

    const detailedAnswers = pairs.map(pair => {
      const part = pair.partNumber || 1;
      if (!partStats[part]) partStats[part] = { correct: 0, total: 0 };
      partStats[part].total += 1;

      const isCorrect = this.compareAnswer(pair.correctAnswer, pair.userAnswer);
      if (isCorrect) {
        totalCorrect += 1;
        partStats[part].correct += 1;
      }

      return {
        questionId: pair.questionId,
        partNumber: pair.partNumber,
        userAnswer: pair.userAnswer ?? null,
        correctAnswer: pair.correctAnswer,
        isCorrect,
      };
    });

    const scaledScore = Number(((totalCorrect / totalQuestions) * 50).toFixed(1));
    const cefrLevel = this.calculateCEFR(scaledScore);

    const partNames: Record<number, string> = {
      1: 'Gap Filling',
      2: 'Text Cohesion',
      3: 'Opinion Matching',
      4: 'Matching Headings',
    };

    const partsResult: PartGradingResult[] = [1, 2, 3, 4].map(p => ({
      partNumber: p,
      skill: partNames[p] ?? `Part ${p}`,
      correct: partStats[p]?.correct ?? 0,
      total: partStats[p]?.total ?? 0,
      score: partStats[p]?.correct ?? 0,
    }));

    return {
      totalScore: totalCorrect,
      maxScore: totalQuestions,
      scaledScore,
      cefrLevel,
      parts: partsResult,
      answers: detailedAnswers,
    };
  }

  private compareAnswer(correct: Record<string, unknown>, user: unknown): boolean {
    if (user === undefined || user === null) return false;

    if (typeof user === 'string' || typeof user === 'number') {
      const expected = correct.value ?? correct.answer ?? correct;
      return String(user).trim().toLowerCase() === String(expected).trim().toLowerCase();
    }

    if (typeof user === 'object' && typeof correct === 'object') {
      return JSON.stringify(user) === JSON.stringify(correct);
    }

    return false;
  }

  private calculateCEFR(scaledScore: number): string {
    if (scaledScore >= 44) return 'C1';
    if (scaledScore >= 35) return 'B2';
    if (scaledScore >= 24) return 'B1';
    if (scaledScore >= 15) return 'A2';
    return 'A1';
  }
}
