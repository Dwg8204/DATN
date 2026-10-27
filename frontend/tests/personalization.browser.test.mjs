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
  for (let i = 0; i < 600; i++) {
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
    let finalMode = false, suggestionConflict = true, suggestionWrites = 0;
    let lastReportQuery;
    const reportId = '00000000-0000-4000-8000-000000000003';
    const weeklyReport = () => ({
      id: reportId, goalId: 'goal', kind: finalMode ? 'FINAL' : 'MIDTERM', weekIndex: 2, coversFrom: '2026-10-08', coversTo: '2026-10-14',
      status: reportStatus, source: reportStatus === 'READY' ? 'AI' : 'RULE',
      snapshot: {
        period: { completed: 7, activeDays: 4, vocabReviewed: 80, planDoneRatio: 0.6 },
        goal: { completed: 12, targetTests: 40, expected: 18.7, status: 'BEHIND' },
        band: { overallEstimate: 'B2', target: 'B2' },
        baseline: { overall:{band:'A2'} }, bandChange:[{skill:'READING',baseline:'A2',current:'B2'}],
      },
      outcome: finalMode ? { lifecycle: 'COMPLETED', testTargetReached: true, targetReachedOn: '2026-10-12', bandTargetStatus: 'INSUFFICIENT_DATA' } : null,
      content: finalMode ? { headline: 'Goal completed', narrative: 'Keep practicing.', achievements: ['Regular practice.'], nextGoalSuggestion: { targetCefr: 'B2', targetTests: 40, durationDays: 30 } } : { headline: 'A steady learning habit', narrative: 'Continue practicing Reading.', wins: ['Regular practice.'], nextSteps: ['Review weak parts.'], progressSoFar: 'Keep working towards your goal.' },
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
      const handleApi = async (route, forcedPath) => {
        const req = route.request(),
          path = forcedPath ?? new URL(req.url()).pathname.replace('/api/v1', '');
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
        if(path==='/me/personalization/overview'){
          const mock={request:()=>route.request(),fulfill:({json})=>json};
          const [goal,schedule,profile,comment,reports]=await Promise.all(['/me/learning-goal','/me/study-plan/current','/me/ability-profile','/me/insights/comment','/me/reports'].map(path=>handleApi(mock,path)));
          return respond({goal:goal.goal,progress:goal.snapshot,profile,plan:schedule.plan,today:schedule.today,comment,recentReports:reports.items??[],needsSync:false});
        }
        if (path === '/me/ability-profile') return respond({bySkill:[],overall:{band:null},placement:{complete:true,missing:[],required:[],tests:[]}});
        if (path === '/me/reports') {
          lastReportQuery = new URL(req.url()).searchParams;
          const page = Number(lastReportQuery.get('page') || 1);
          return respond({ items: page === 1 ? [weeklyReport()] : [], page, hasMore: finalMode && page === 1 });
        }
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
          if (finalMode) suggestionWrites++;
          return respond({ goal }, 201);
        }
        if (path === '/me/learning-goal/replace' && req.method() === 'POST') {
          if (suggestionConflict) { suggestionConflict = false; return respond({}, 409); }
          assert.equal(req.postDataJSON().goalId, goal.id);
          goal = { ...goal, ...req.postDataJSON() }; suggestionWrites++;
          return respond({ goal });
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
                  band: { overallEstimate: 'B1', overall: { status:'PARTIAL', missing:['WRITING'] }, bySkill:[{skill:'READING',band:'B1',status:'PRELIMINARY'},{skill:'LISTENING',band:'B1',status:'ESTIMATE'}] },
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
      };
    await context.route('**/api/v1/**', route=>handleApi(route));
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
      await second.page.getByLabel('Duration (3–180 days)').fill('3');
      await second.page.getByRole('button', { name: 'Replace goal', exact: true }).click();
      await second.page.getByRole('alert').filter({ hasText: 'A goal cannot exceed 3 tests per day.' }).waitFor();
      assert.equal(suggestionWrites, 0, 'excessive pace must not submit a replacement');
      assert.equal(await second.page.getByRole('dialog').count(), 0);
      await second.page.getByLabel('Duration (3–180 days)').fill('30');
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
      await second.page.getByText('Missing: Writing', {exact:true}).waitFor();
      await second.page.getByText('B1 · Preliminary', {exact:true}).waitFor();
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
      finalMode = true;
      await second.page.goto(`${origin}/profile/reports`, { waitUntil: 'domcontentloaded' });
      await second.page.getByRole('heading', { name: 'Learning reports', exact: true }).waitFor();
      await second.page.getByLabel('Filter by goal').selectOption('goal');
      await second.page.getByRole('link', { name: 'Goal summary', exact: true }).waitFor();
      assert.equal(lastReportQuery.get('goalId'), 'goal');
      await second.page.getByRole('button', { name: 'Next page', exact: true }).click();
      await second.page.getByText('No reports for this goal yet.').waitFor();
      assert.equal(lastReportQuery.get('page'), '2');
      await second.page.getByRole('button', { name: 'Previous page', exact: true }).click();
      await second.page.getByRole('link', { name: 'Goal summary', exact: true }).click();
      await second.page.getByText('Test count target reached.', { exact: true }).waitFor();
      await second.page.getByText('Not enough data to assess the target band.', { exact: true }).waitFor();
      await second.page.getByRole('button', { name: 'Ask AptiMate about this report', exact: true }).click();
      await second.page.getByRole('textbox', { name: 'Type a question…' }).fill('Explain this report');
      await second.page.getByRole('button', { name: 'Send', exact: true }).click();
      await second.page.waitForFunction(() => document.querySelector('textarea')?.value === '');
      assert.equal(chatPayload?.insightId, reportId);
      assert.equal(chatPayload?.attemptId, undefined);
      await second.page.getByRole('button', { name: 'Close', exact: true }).and(second.page.locator('[aria-expanded="true"]')).click();
      await second.page.getByRole('heading', {name:'Band changes by skill'}).waitFor();
      await second.page.getByRole('cell', {name:'A2',exact:true}).waitFor();
      await second.page.getByRole('cell', {name:'B2',exact:true}).waitFor();
      await second.page.getByLabel('Duration (3–180 days)').fill('14');
      const applySuggestion = () => second.page.getByRole('button', { name: 'Set suggested goal', exact: true }).click();
      await applySuggestion();
      await second.page.getByRole('dialog').waitFor();
      assert.equal(suggestionWrites, 0, 'opening suggestion confirmation must not mutate a goal');
      await second.page.getByRole('dialog').getByRole('button', { name: 'Confirm', exact: true }).click();
      await second.page.getByRole('alert').waitFor();
      assert.equal(suggestionWrites, 0, 'stale current goal is not overwritten');
      await applySuggestion();
      await second.page.getByRole('dialog').getByRole('button', { name: 'Confirm', exact: true }).click();
      await second.page.getByText('New goal created.', { exact: false }).waitFor();
      assert.equal(goal.durationDays, 14);
      assert.equal(suggestionWrites, 1);
      goal = null;
      await second.page.reload();
      // The report URL still has chat=1, so a reload intentionally opens chat again.
      await second.page.getByRole('button', { name: 'Close', exact: true }).and(second.page.locator('[aria-expanded="true"]')).click();
      await applySuggestion();
      await second.page.getByRole('dialog').getByRole('button', { name: 'Confirm', exact: true }).click();
      await second.page.getByText('New goal created.', { exact: false }).waitFor();
      assert.equal(suggestionWrites, 2, 'suggestion creates a goal when no active goal remains');
      assert.ok(await second.page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1));
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
