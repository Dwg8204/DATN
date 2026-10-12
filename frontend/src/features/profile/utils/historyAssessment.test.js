import assert from 'node:assert/strict';
import test from 'node:test';
import { writingHistoryStatus } from './historyAssessment.js';
import { writingAiEn, writingAiVi } from '../../writing/i18n.js';

test('history labels keep terminal, disabled and pending Writing states distinct in both languages', () => {
  for (const gradingStatus of [
    'QUEUED',
    'PROCESSING',
    'FAILED',
    'PARTIAL_FAILED',
    'NOT_STARTED',
    'COMPLETED',
  ]) {
    assert.equal(
      writingHistoryStatus({
        component: 'WRITING',
        gradingStatus,
        estimatedCefr: null,
      }),
      `writingAi.${gradingStatus}`,
    );
    assert.ok(writingAiVi[gradingStatus]);
    assert.ok(writingAiEn[gradingStatus]);
  }
  assert.notEqual(writingAiVi.FAILED, writingAiVi.QUEUED);
  assert.notEqual(writingAiVi.NOT_STARTED, writingAiVi.QUEUED);
  assert.equal(writingHistoryStatus({ component: 'SPEAKING', gradingStatus: 'FAILED' }), null);
});
