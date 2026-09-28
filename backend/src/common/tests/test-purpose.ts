export const TEST_PURPOSES = ['EXAM', 'PRACTICE'] as const;

export type TestPurpose = (typeof TEST_PURPOSES)[number];

export function defaultTestPurpose(mode: string): TestPurpose {
  return mode === 'full' ? 'EXAM' : 'PRACTICE';
}

export function assertPurposeScope(purpose: TestPurpose, mode: string): void {
  if (purpose === 'EXAM' && mode !== 'full') {
    throw new Error('Exam tests must contain the full skill.');
  }
}
