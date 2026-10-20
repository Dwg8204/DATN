import test, { before, after } from 'node:test';
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { chromium } from 'playwright';

const origin = 'http://127.0.0.1:4188';
let server, browser;
before(async () => {
  server = spawn(
    process.execPath,
    [
      'node_modules/vite/bin/vite.js',
      '--host',
      '127.0.0.1',
      '--port',
      '4188',
      '--strictPort',
    ],
    { stdio: 'ignore' },
  );
  let ready = false;
  for (let i = 0; i < 150; i++) {
    try {
      ready = (await fetch(origin)).ok;
    } catch {}
    if (ready) break;
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
  assert.ok(ready, 'Vite did not start');
  browser = await chromium.launch({
    headless: true,
    ...(process.platform === 'win32' ? { channel: 'msedge' } : {}),
  });
});
after(async () => {
  await browser?.close();
  server?.kill();
});

test(
  'profile import persistence, mobile plan, mistake review and contextual chatbot',
  { timeout: 180000 },
  async () => {
    const attemptId = '00000000-0000-4000-8000-000000000001';
    const itemId = '00000000-0000-4000-8000-000000000002';
    let goal = null,
      done = false,
      importFailure = true,
      chatPayload;
    let commentStatus = 'PENDING';
    let reportStatus = 'READY';
    const reportId = '00000000-0000-4000-8000-000000000003';
    const weeklyReport = () => ({
      id: reportId, kind: 'MIDTERM', weekIndex: 2, coversFrom: '2026-10-08', coversTo: '2026-10-14',
      status: reportStatus, source: reportStatus === 'READY' ? 'AI' : 'RULE',
      snapshot: {
        period: { completed: 7, activeDays: 4, vocabReviewed: 80, planDoneRatio: 0.6 },
        goal: { completed: 12, targetTests: 40, expected: 18.7, status: 'BEHIND' },
        band: { overallEstimate: null, target: 'B2' },
      },
      content: { headline: 'A steady learning habit', narrative: 'Continue practicing Reading.', wins: ['Regular practice.'], nextSteps: ['Review weak parts.'], progressSoFar: 'Keep working towards your goal.' },
    });
    let prefs = {
      reminderEnabled: true,
      reminderTime: '19:00',
      emailReminderEnabled: false,
      emailReportEnabled: true,
    };
    const errors = [];
    const session = async (width, legacy = false) => {
      const context = await browser.newContext({
        viewport: { width, height: 900 },
      });
      await context.addInitScript(
        ({ legacy }) => {
          localStorage.setItem('aptimate-language', 'en');
          if (legacy)
            localStorage.setItem(
              'aptimate.dashboard_goal',
              JSON.stringify({
                active: true,
                targetBand: 'B2',
                targetTests: 40,
                durationDays: 30,
              }),
            );
        },
        { legacy },
      );
      await context.route('**/*', (route) =>
        route.request().url().startsWith(origin) ||
        route.request().url().includes('/api/v1/')
          ? route.continue()
          : route.abort(),
      );
      await context.route('**/api/v1/**', async (route) => {
        const req = route.request(),
          path = new URL(req.url()).pathname.replace('/api/v1', '');
        const respond = (json, status = 200) =>
          route.fulfill({
            json,
            status,
            headers: {
              'access-control-allow-origin': origin,
              'access-control-allow-credentials': 'true',
              'access-control-allow-headers': 'content-type',
              'access-control-allow-methods': 'GET,POST,PUT,DELETE,OPTIONS',
            },
          });
        if (req.method() === 'OPTIONS') return respond({});
        if (path === '/me/reports') return respond({ items: [weeklyReport()], page: 1, hasMore: false });
        if (path === `/me/reports/${reportId}`) return reportStatus === 'ERROR' ? respond({}, 404) : respond(weeklyReport());
        if (path === '/me/insights/comment') {
          if (commentStatus === 'ERROR') return respond({}, 503);
          return respond({ status: commentStatus, comment: commentStatus === 'READY' ? {
            id: 'insight', content: { summary: 'Keep practicing consistently.', strengths: ['Regular practice.'], focus: ['Review Reading.'] },
          } : null });
        }
        if (path === '/profile/me' || path === '/auth/me')
          return respond({
            id: 'student',
            role: 'STUDENT',
            firstName: 'Test',
            lastName: 'Learner',
            email: 'learner@example.invalid',
          });
        if (path === '/me/learning-goal' && req.method() === 'POST') {
          if (importFailure) {
            importFailure = false;
            return respond({ error: { message: 'Try again' } }, 503);
          }
          goal = {
            ...req.postDataJSON(),
            id: 'goal',
            completed: 2,
            startDate: '2026-10-20',
            endsOn: '2026-11-18',
            timezone: 'Asia/Bangkok',
            canFinish: false,
          };
          return respond({ goal }, 201);
        }
        if (path === '/me/learning-goal')
          return respond({
            goal,
            snapshot: goal
              ? {
                  goal: {
                    ...goal,
                    expected: 4,
                    requiredPace: 2,
                    remainingDays: 28,
                    status: 'BEHIND',
                  },
                  band: { overallEstimate: null },
                  habit: { streak: 2, activeDaysThisWeek: 2 },
                }
              : null,
          });
        if (path === '/me/learning-goals')
          return respond({ items: [], page: 1, hasMore: false });
        if (path === '/me/learning-preferences') {
          if (req.method() === 'PUT') prefs = req.postDataJSON();
          return respond(prefs);
        }
        if (path === '/me/study-plan/current')
          return respond({
            today: '2026-10-20',
            timezone: 'Asia/Bangkok',
            plan: {
              id: 'plan',
              weekIndex: 1,
              items: [
                {
                  id: 'test',
                  scheduledOn: '2026-10-20',
                  activityType: 'TEST',
                  component: 'READING',
                  title: 'Published reading',
                  testId: 'test',
                  purpose: 'EXAM',
                  targetCount: 1,
                  doneCount: 0,
                  available: true,
                },
                {
                  id: 'vocab',
                  scheduledOn: '2026-10-20',
                  activityType: 'VOCAB_REVIEW',
                  targetCount: 20,
                  doneCount: 3,
                  available: true,
                },
                {
                  id: itemId,
                  scheduledOn: '2026-10-20',
                  activityType: 'MISTAKE_REVIEW',
                  questionCount: 3,
                  targetCount: 1,
                  doneCount: done ? 1 : 0,
                  completedAt: done ? '2026-10-20T05:00Z' : null,
                  available: true,
                },
              ],
            },
          });
        if (path === '/me/mistakes')
          return respond({
            itemId,
            attemptId,
            component: 'LISTENING',
            done,
            canMarkDone: true,
            details: [
              {
                component: 'LISTENING',
                partNumber: 2,
                paper: {
                  speakers: [
                    { key: 'p2:s1', name: 'Speaker 1' },
                    { key: 'p2:s2', name: 'Unscheduled speaker' },
                  ],
                  options: [
                    { id: 'A', text: 'Airport' },
                    { id: 'B', text: 'Library' },
                  ],
                },
                items: [
                  {
                    key: 'p2:s1',
                    selectedAnswer: { optionId: 'B' },
                    correctAnswer: 'A',
                    explanation: 'Listen for the destination.',
                  },
                ],
              },
            ],
          });
        if (path === `/me/study-plan/items/${itemId}/done`) {
          done = true;
          return respond({ done: true });
        }
        if (path === '/chatbot/status')
          return respond({ data: { enabled: true } });
        if (path === '/chatbot/sessions' && req.method() === 'POST') {
          chatPayload = req.postDataJSON();
          return respond({ data: { id: chatPayload.id } }, 201);
        }
        if (path.startsWith('/chatbot/'))
          return respond({ data: { items: [], hasMore: false } });
        if (path.includes('dashboard'))
          return respond({
            totalTests: 2,
            skillCounts: {},
            partCounts: {},
            scoreOverTime: [],
            skillDistribution: [],
          });
        return respond({
          data: [],
          items: [],
          count: 0,
          unreadCount: 0,
          pagination: { totalItems: 0 },
        });
      });
      const page = await context.newPage();
      page.setDefaultTimeout(20000);
      page.setDefaultNavigationTimeout(60000);
      page.on('pageerror', (error) => errors.push(error.message));
      return { context, page };
    };
    const first = await session(1280, true),
      second = await session(390);
    try {
      await first.page.goto(`${origin}/profile`, {
        waitUntil: 'domcontentloaded',
      });
      await first.page
        .getByRole('button', { name: 'Import old goal', exact: true })
        .click();
      await first.page
        .getByRole('button', { name: 'Confirm', exact: true })
        .click();
      await first.page
        .getByText('Unable to save changes.', { exact: false })
        .first()
        .waitFor();
      assert.ok(
        await first.page.evaluate(() =>
          localStorage.getItem('aptimate.dashboard_goal'),
        ),
      );
      await first.page
        .getByRole('button', { name: 'Confirm', exact: true })
        .click();
      await first.page.getByText('Changes saved.', { exact: true }).waitFor();
      assert.equal(
        await first.page.evaluate(() =>
          localStorage.getItem('aptimate.dashboard_goal'),
        ),
        null,
      );
      await second.page.goto(`${origin}/profile`, {
        waitUntil: 'domcontentloaded',
      });
      await second.page
        .getByRole('button', { name: 'Replace goal', exact: true })
        .waitFor();
      assert.equal(
        await second.page.getByLabel('Duration (3–180 days)').inputValue(),
        '30',
      );
      prefs.emailReminderEnabled = true;
      await second.page.goto(`${origin}/profile?disableReminderEmail=1#learning-preferences`, { waitUntil: 'domcontentloaded' });
      await second.page.getByRole('button', { name: 'Turn off reminder emails', exact: true }).click();
      await second.page.getByText('Reminder emails are off.', { exact: false }).waitFor();
      assert.equal(prefs.emailReminderEnabled, false);
      assert.equal(prefs.reminderEnabled, true);
      assert.equal(prefs.emailReportEnabled, true);
      await second.page.getByLabel('Reminder time (account time zone)').fill('20:30');
      await second.page.getByRole('button', { name: 'Save preferences', exact: true }).click();
      await second.page.getByText('Changes saved.', { exact: true }).waitFor();
      assert.equal(prefs.reminderTime, '20:30');
      await second.page.goto(`${origin}/profile?disableReportEmail=1#learning-preferences`, { waitUntil: 'domcontentloaded' });
      await second.page.getByRole('button', { name: 'Turn off report emails', exact: true }).click();
      await second.page.getByText('Report emails are off.', { exact: false }).waitFor();
      assert.equal(prefs.emailReportEnabled, false);
      assert.equal(prefs.reminderEnabled, true);
      await second.page.goto(`${origin}/profile/dashboard`, {
        waitUntil: 'domcontentloaded',
      });
      await second.page
        .getByRole('heading', { name: 'Today’s activities' })
        .waitFor();
      await second.page.getByText('Preparing your feedback…', { exact: false }).waitFor();
      commentStatus = 'READY';
      await second.page.getByText('Keep practicing consistently.').waitFor();
      for (const status of ['HIDDEN', 'ERROR']) {
        commentStatus = status;
        await second.page.reload();
        await second.page.getByRole('heading', { name: 'Today’s activities' }).waitFor();
        assert.equal(await second.page.getByRole('heading', { name: 'AptiMate’s feedback' }).count(), 0);
      }
      await second.page
        .getByText('Published reading', { exact: false })
        .first()
        .waitFor();
      assert.ok(
        await second.page.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth + 1,
        ),
      );
      await second.page.getByRole('link', { name: 'Midterm report · Week 2' }).click();
      await second.page.getByRole('heading', { name: 'Midterm report · Week 2', exact: true }).waitFor();
      await second.page.getByText('Keep working towards your goal.').waitFor();
      await second.page.getByText('12/40', { exact: true }).waitFor();
      assert.ok(await second.page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1));
      reportStatus = 'FAILED';
      await second.page.reload();
      await second.page.getByText('Your statistics are ready.', { exact: false }).waitFor();
      reportStatus = 'READY';
      await second.page.getByText('Your statistics are ready.', { exact: false }).waitFor({ state: 'hidden', timeout: 20000 });
      reportStatus = 'ERROR';
      await second.page.reload();
      await second.page.getByRole('alert').filter({ hasText: 'This report could not be opened.' }).waitFor();
      reportStatus = 'READY';
      await second.page.goto(`${origin}/profile/mistakes?itemId=${itemId}`, {
        waitUntil: 'domcontentloaded',
      });
      await second.page.getByText('Airport', { exact: true }).waitFor();
      assert.equal(
        await second.page.getByText('Unscheduled speaker').count(),
        0,
      );
      await second.page
        .getByRole('button', { name: 'Mark as reviewed', exact: true })
        .click();
      await second.page
        .getByRole('heading', { name: 'Today’s activities' })
        .waitFor();
      assert.equal(new URL(second.page.url()).pathname, '/profile/dashboard');
      await second.page.getByRole('status').filter({ hasText: 'Mistake review completed.' }).waitFor();
      assert.equal(done, true);
      await second.page.goto(`${origin}/profile/mistakes?itemId=${itemId}`, { waitUntil: 'domcontentloaded' });
      await second.page
        .getByRole('button', { name: 'Ask AptiMate about this question' })
        .click();
      await second.page.locator('textarea').fill('Explain this answer');
      await second.page
        .getByRole('button', { name: 'Send', exact: true })
        .click();
      await second.page.waitForFunction(
        () => document.querySelector('textarea')?.value === '',
      );
      assert.equal(chatPayload?.attemptId, attemptId);
      assert.equal(chatPayload?.questionKey, 'p2:s1');
      assert.deepEqual(errors, []);
    } finally {
      await first.context.close();
      await second.context.close();
    }
  },
);
