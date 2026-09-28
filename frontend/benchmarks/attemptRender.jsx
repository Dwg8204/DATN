// oxlint-disable react/only-export-components -- This is a standalone benchmark entry.
import { Profiler, useEffect, useRef } from 'react';
import { createRoot } from 'react-dom/client';
import { MemoryRouter } from 'react-router-dom';
import { TestAttemptProvider } from '../src/features/test-attempts/context/TestAttemptContext.jsx';
import { useTestAttempt } from '../src/features/test-attempts/context/testAttemptContextStore.js';
import { testAttemptsApi } from '../src/features/test-attempts/services/testAttemptsApi.js';

const longAnswer = 'A learner response with several sentences. '.repeat(180);
const server = {
  attemptId: 'benchmark-attempt', component: 'WRITING', revision: 0, status: 'IN_PROGRESS', canAnswer: true,
  answers: {}, progress: {}, expiresAt: new Date(Date.now() + 900_000).toISOString(),
  serverTime: new Date().toISOString(), paper: { component: 'WRITING', mode: 'part4', parts: {} },
};
let saving = false;
let benchmarkRunning = false;
const renderDurations = [];
const duringSave = [];
testAttemptsApi.get = async () => structuredClone(server);
testAttemptsApi.saveProgress = async (_attemptId, batch) => {
  saving = true;
  await new Promise(resolve => setTimeout(resolve, 2_000));
  server.answers = { ...server.answers, ...batch.changes };
  server.revision += 1;
  server.progress = { currentQuestionKey: batch.currentQuestionKey };
  saving = false;
  return { revision: server.revision, progress: server.progress };
};
testAttemptsApi.submit = async () => {
  server.status = 'SUBMITTED';
  server.canAnswer = false;
  return { status: 'SUBMITTED' };
};
testAttemptsApi.result = async () => ({ status: 'SUBMITTED' });

const nextFrame = () => new Promise(resolve => setTimeout(resolve, 16));
const percentile = (samples, fraction) => samples[Math.floor((samples.length - 1) * fraction)];

function Probe() {
  const context = useTestAttempt();
  const { attempt, answers, setAnswer, flush } = context;
  const started = useRef(false);
  const currentContext = useRef(context);
  useEffect(() => { currentContext.current = context; });

  useEffect(() => {
    if (!attempt || started.current) return;
    started.current = true;
    benchmarkRunning = true;
    void (async () => {
      setAnswer('p4:q2', { kind: 'TEXT', text: longAnswer });
      const firstSave = flush();
      await nextFrame();
      for (let index = 0; index < 60; index += 1) {
        setAnswer('p4:q2', { kind: 'TEXT', text: `${longAnswer}${index}` });
        await nextFrame();
      }
      await firstSave;
      await flush();
      const sorted = [...renderDurations].sort((left, right) => left - right);
      const persistedText = server.answers['p4:q2']?.text;
      const stale = structuredClone(server);
      let releaseStaleCheck;
      testAttemptsApi.get = () => new Promise(resolve => {
        releaseStaleCheck = () => resolve(stale);
      });
      const oldCheck = currentContext.current.reconcileSubmission();
      await currentContext.current.submit();
      releaseStaleCheck();
      await oldCheck;
      await nextFrame();
      currentContext.current.setAnswer('p4:q2', { kind: 'TEXT', text: 'An edit after submission' });
      await nextFrame();
      const terminalStateKept = currentContext.current.submissionState === 'submitted'
        && currentContext.current.attempt.status === 'SUBMITTED';
      const lateEditIgnored = currentContext.current.answers['p4:q2']?.text === persistedText;
      if (!terminalStateKept || !lateEditIgnored) throw new Error('A stale status check reopened the submitted test.');
      document.getElementById('benchmark-result').textContent = JSON.stringify({
        renders: sorted.length, rendersDuringSave: duringSave.length,
        medianRenderMs: Number(percentile(sorted, 0.5).toFixed(2)),
        p95RenderMs: Number(percentile(sorted, 0.95).toFixed(2)),
        maxRenderMs: Number(sorted.at(-1).toFixed(2)),
        finalCharacters: persistedText.length, terminalStateKept, lateEditIgnored,
      });
    })().catch(error => {
      document.getElementById('benchmark-result').textContent = `Benchmark failed: ${error.message}`;
    });
  }, [attempt, flush, setAnswer]);

  return <textarea readOnly value={answers['p4:q2']?.text ?? ''} />;
}

createRoot(document.getElementById('root')).render(
  <MemoryRouter initialEntries={['/?attemptId=benchmark-attempt']}>
    <Profiler id="attempt" onRender={(_id, _phase, duration) => {
      if (benchmarkRunning) {
        renderDurations.push(duration);
        if (saving) duringSave.push(duration);
      }
    }}>
      <TestAttemptProvider expectedComponent="WRITING"><Probe /></TestAttemptProvider>
    </Profiler>
  </MemoryRouter>,
);
