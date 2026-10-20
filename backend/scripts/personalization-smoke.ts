import 'reflect-metadata';
import 'dotenv/config';
import { ConfigService } from '@nestjs/config';
import { withPersonalizationDatabase } from '../test/integration/personalization-fixture';
import { createGeminiServices } from '../src/features/ai-shared/create-gemini-services';
import { PersonalizationAiService } from '../src/features/personalization/services/personalization-ai.service';
import { AiProviderError } from '../src/features/ai-shared/ai-provider.error';
import { CommentValidationError } from '../src/features/personalization/ai/comment.contract';

// Explicit opt-in, synthetic learner and isolated _test schema only; never inspect real submissions.
if (!process.argv.includes('--live')) {
  console.log(
    'Use --live with TEST_DATABASE_URL ending in _test and configured PERSONALIZATION_PROVIDER/model/key to run one synthetic COMMENT request. Gemini additionally requires confirmed FREE configuration.',
  );
} else {
  withPersonalizationDatabase(async (db, userId) => {
    const config = new ConfigService({
      ...process.env,
      PERSONALIZATION_AI_ENABLED: 'true',
    });
    const { jsonGeneration } = createGeminiServices(config, db);
    const ai = new PersonalizationAiService(config, jsonGeneration);
    const snapshot = {
      snapshotVersion: 1,
      goal: {
        targetCefr: 'B2',
        targetTests: 20,
        completed: 6,
        expected: 8,
        status: 'BEHIND',
        remainingDays: 7,
        requiredPace: 2,
      },
      band: {
        overallEstimate: null,
        target: 'B2',
        bySkill: [
          {
            skill: 'READING',
            band: null,
            reason: 'INSUFFICIENT_DATA',
            sampleSize: 1,
          },
        ],
      },
      statistics: [],
      weak: {
        parts: [{ skill: 'READING', part: 2, percent: 48, attempts: 2 }],
        writingCriteria: [],
        speakingCriteria: [],
        topics: [],
      },
      mistakes: { count: 3, byComponent: { READING: 3 } },
      vocab: { reviewedThisWeek: 20, learningCount: 10 },
      habit: { streak: 2, activeDaysThisWeek: 3, planDoneRatio: 0.5 },
    };
    const result = await ai.comment(userId, snapshot);
    const [request] = await db.query(
      'SELECT input_tokens,output_tokens,status FROM ai_requests WHERE id=$1',
      [result.requestId],
    );
    console.log(
      JSON.stringify({ smoke: 'PASS', request, content: result.content }),
    );
  }).catch(error => {
    console.error(JSON.stringify({ smoke: 'FAILED', reason: error instanceof AiProviderError ? error.reason : error instanceof CommentValidationError ? error.issues : 'DATABASE_OR_CONFIGURATION' }));
    process.exitCode = 1;
  });
}
