import { Injectable } from '@nestjs/common';
import { Answers, AssessableItem, AssessmentResult, ItemOutcome } from '../types/attempt.type';

@Injectable()
export class ObjectiveGraderService {
  grade(items: AssessableItem[], answers: Answers): AssessmentResult {
    const pending = items.some(item => item.kind === 'TEXT' || item.kind === 'AUDIO');
    const outcomes: ItemOutcome[] = items.map(item => {
      const answer = answers[item.key];
      if (item.kind === 'TEXT' || item.kind === 'AUDIO') {
        return { key: item.key, partNumber: item.partNumber, outcome: 'PENDING', score: 0, maxScore: item.points };
      }
      const outcome = !answer ? 'SKIPPED'
        : (answer.kind === 'CHOICE' || answer.kind === 'MATCH') && answer.optionId === item.correctOptionId
          ? 'CORRECT' : 'INCORRECT';
      return { key: item.key, partNumber: item.partNumber, outcome,
        score: outcome === 'CORRECT' ? item.points : 0, maxScore: item.points };
    });
    const partNumbers = [...new Set(items.map(item => item.partNumber))].sort((a, b) => a - b);
    const parts = partNumbers.map(partNumber => {
      const partItems = outcomes.filter(item => item.partNumber === partNumber);
      const partPending = partItems.some(item => item.outcome === 'PENDING');
      return { partNumber,
        score: partPending ? null : partItems.reduce((sum, item) => sum + item.score, 0),
        maxScore: partPending ? null : partItems.reduce((sum, item) => sum + item.maxScore, 0) };
    });
    return {
      schemaVersion: 1, method: pending ? 'PENDING_AI' : 'OBJECTIVE',
      score: pending ? null : parts.reduce((sum, part) => sum + (part.score ?? 0), 0),
      maxScore: pending ? null : parts.reduce((sum, part) => sum + (part.maxScore ?? 0), 0),
      counts: {
        correct: outcomes.filter(item => item.outcome === 'CORRECT').length,
        incorrect: outcomes.filter(item => item.outcome === 'INCORRECT').length,
        skipped: outcomes.filter(item => item.outcome === 'SKIPPED').length,
      },
      parts, items: outcomes,
    };
  }
}
