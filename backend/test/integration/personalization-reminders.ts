import * as assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { withPersonalizationDatabase } from './personalization-fixture';
import { LearningGoalsRepository } from '../../src/features/personalization/repositories/learning-goals.repository';
import { LearnerPreferencesRepository } from '../../src/features/personalization/repositories/learner-preferences.repository';
import { StudyPlansRepository } from '../../src/features/personalization/repositories/study-plans.repository';
import { PlanProgressRepository } from '../../src/features/personalization/repositories/plan-progress.repository';
import { GoalsService } from '../../src/features/personalization/services/goals.service';
import { PlanService } from '../../src/features/personalization/services/plan.service';
import { RemindersService } from '../../src/features/personalization/services/reminders.service';
import { PersonalizationWorker } from '../../src/features/personalization/workers/personalization.worker';
import { addDays } from '../../src/features/personalization/policies/calendar';
import { NotificationsRepository } from '../../src/features/notifications/repositories/notifications.repository';
import { NotificationsService } from '../../src/features/notifications/services/notifications.service';
import { NotificationsGateway } from '../../src/features/notifications/gateways/notifications.gateway';
import { MailService } from '../../src/features/auth/services/mail.service';

withPersonalizationDatabase(async (db, alice, bob) => {
  const start = '2026-10-01';
  let now = new Date(`${start}T11:59:00Z`);
  const clock = { now: () => now };
  const goalRepo = new LearningGoalsRepository(db);
  const preferences = new LearnerPreferencesRepository(db);
  const plans = new StudyPlansRepository(db);
  const goals = new GoalsService(
    db,
    goalRepo,
    clock,
    new PlanProgressRepository(plans),
  );
  const reminders = new RemindersService(preferences, plans);
  const ids = new Map<string, string>();
  for (const user of [alice, bob]) {
    const goal = await goalRepo.create(user, {
      targetCefr: 'B2',
      targetTests: 20,
      durationDays: 5,
      startDate: start,
      timezone: 'Asia/Bangkok',
    });
    const plan = await plans.create(
      user,
      {
        goalId: goal.id,
        weekIndex: 1,
        startsOn: start,
        endsOn: addDays(start, 4),
        source: 'RULE',
      },
      Array.from({ length: 5 }, (_, day) => ({
        activityType: 'VOCAB_REVIEW' as const,
        scheduledOn: addDays(start, day),
        sortOrder: 0,
        targetCount: 1,
      })),
    );
    ids.set(user, plan.id);
    await preferences.save(user, {
      reminderEnabled: user === alice,
      reminderTime: '19:00',
      emailReminderEnabled: true,
      emailReportEnabled: true,
    });
  }
  // Existing RULE plans are fixtures; generation itself is covered by personalization-plan.
  const planService = {
    ensureLocked: async (_manager: unknown, actor: { id: string }) => ({
      plan: { id: ids.get(actor.id)! },
    }),
  } as unknown as PlanService;
  const workers = [0, 1].map(
    () => new PersonalizationWorker(db, goals, planService, clock, reminders),
  );
  const run = () => Promise.all(workers.map((worker) => worker.runBatch()));
  const rows = () =>
    db.query<Array<{ dedupe_key: string; content: string; channel: string }>>(
      "SELECT dedupe_key,content,channel FROM notifications WHERE dedupe_key LIKE 'reminder:%' ORDER BY dedupe_key",
    );
  const notificationRepo = new NotificationsRepository(db);
  const eligible =
    notificationRepo.isDailyReminderEligible.bind(notificationRepo);
  notificationRepo.isDailyReminderEligible = (user, key, channel) =>
    eligible(user, key, channel, now);
  let emails = 0,
    inbox = 0;
  const notifications = new NotificationsService(
    notificationRepo,
    {
      sendNotificationEmail: async (...args: unknown[]) => {
        assert.equal(
          args[4],
          true,
          'daily reminder email uses the learning footer',
        );
        emails++;
      },
    } as unknown as MailService,
    {
      emitCreated: (items: unknown[]) => {
        inbox += items.length;
      },
    } as unknown as NotificationsGateway,
  );
  await run();
  assert.equal((await rows()).length, 0, 'no reminders before local 19:00');

  const folder = randomUUID(),
    card = randomUUID();
  await db.query(
    "INSERT INTO vocabulary_folders(id,owner_id,name) VALUES($1,$2,'Reminder fixture')",
    [folder, alice],
  );
  await db.query(
    `INSERT INTO user_notebook_items(id,user_id,folder_id,item_type,custom_content) VALUES($1,$2,$3,'WORD','{"term":"learn"}')`,
    [card, alice, folder],
  );
  for (let day = 0; day < 5; day++) {
    now = new Date(`${addDays(start, day)}T12:00:00Z`);
    if (day === 1)
      await db.query(
        "INSERT INTO vocabulary_review_events(notebook_item_id,client_event_id,rating,reviewed_at) VALUES($1,gen_random_uuid(),'LEARNING',$2)",
        [card, now],
      );
    await run();
    await run();
    const dayRows = (await rows()).filter((row) =>
      row.dedupe_key.includes(addDays(start, day)),
    );
    assert.equal(dayRows.length, day === 1 ? 0 : 2);
    assert.ok(
      dayRows.every((row) => row.dedupe_key.includes(alice)),
      'disabled learner is never reminded',
    );
    assert.equal(
      (await preferences.find(alice))?.last_reminded_on,
      addDays(start, day),
    );
    assert.equal(
      (await preferences.find(bob))?.last_reminded_on,
      addDays(start, day),
    );
    if (day === 1) {
      assert.equal(
        await notificationRepo.isDailyReminderEligible(
          alice,
          `reminder:${alice}:${addDays(start, day)}:IN_APP`,
          'IN_APP',
          now,
        ),
        false,
      );
    } else {
      assert.equal(
        await notificationRepo.isDailyReminderEligible(
          alice,
          `reminder:${alice}:${addDays(start, day)}:EMAIL`,
          'EMAIL',
          now,
        ),
        true,
      );
    }
    if (day === 0) {
      await Promise.all([
        notifications.processDueScheduledBatch(50),
        notifications.processDueScheduledBatch(50),
      ]);
      await notifications.processDueScheduledBatch(50);
      assert.equal(emails, 1);
      assert.equal(inbox, 1);
    }
  }
  assert.equal((await rows()).length, 8);
  assert.ok(
    (await rows())
      .filter((row) => row.dedupe_key.includes('2026-10-05'))
      .every((row) => row.content.startsWith('Hôm nay là ngày cuối')),
  );
  assert.equal(
    await notificationRepo.isDailyReminderEligible(
      alice,
      `reminder:${alice}:2026-10-01:EMAIL`,
      'EMAIL',
      now,
    ),
    false,
    'queued past days are skipped',
  );
  await preferences.save(alice, {
    reminderEnabled: true,
    reminderTime: '19:00',
    emailReminderEnabled: false,
    emailReportEnabled: true,
  });
  assert.equal(
    await notificationRepo.isDailyReminderEligible(
      alice,
      `reminder:${alice}:2026-10-05:EMAIL`,
      'EMAIL',
      now,
    ),
    false,
  );
  assert.equal(
    await notificationRepo.isDailyReminderEligible(
      alice,
      `reminder:${alice}:2026-10-05:IN_APP`,
      'IN_APP',
      now,
    ),
    true,
  );

  // Exercise the real delivery queue twice concurrently; no SMTP or socket network calls.
  await Promise.all([
    notifications.processDueScheduledBatch(50),
    notifications.processDueScheduledBatch(50),
  ]);
  await notifications.processDueScheduledBatch(50);
  assert.equal(emails, 1, 'email opt-out is rechecked at delivery');
  assert.equal(inbox, 2, 'only current-day in-app reminder delivered once');

  now = new Date('2026-10-06T12:00:00Z');
  await run();
  assert.equal((await rows()).length, 8, 'expired goals never remind');
  assert.equal(await goalRepo.findActive(alice), null);

  // No catch-up after downtime. The account timezone controls delivery, the goal timezone controls its activities.
  const replacement = await goalRepo.create(alice, {
    targetCefr: 'B2',
    targetTests: 20,
    durationDays: 5,
    startDate: '2026-10-06',
    timezone: 'Asia/Bangkok',
  });
  const replacementPlan = await plans.create(
    alice,
    {
      goalId: replacement.id,
      weekIndex: 1,
      startsOn: '2026-10-06',
      endsOn: '2026-10-10',
      source: 'RULE',
    },
    Array.from({ length: 5 }, (_, day) => ({
      activityType: 'VOCAB_REVIEW' as const,
      scheduledOn: addDays('2026-10-06', day),
      sortOrder: 0,
      targetCount: 1,
    })),
  );
  ids.set(alice, replacementPlan.id);
  await db.query("UPDATE users SET timezone='Pacific/Honolulu' WHERE id=$1", [
    alice,
  ]);
  now = new Date('2026-10-09T04:59:00Z'); // Oct 8, 18:59 in Honolulu; Oct 9 in goal timezone.
  await run();
  assert.equal((await rows()).length, 8);
  now = new Date('2026-10-09T05:00:00Z');
  await run();
  assert.equal((await rows()).length, 9);
  assert.ok(
    (await rows()).some(
      (row) => row.dedupe_key === `reminder:${alice}:2026-10-08:IN_APP`,
    ),
  );
  assert.ok(
    !(await rows()).some((row) => row.dedupe_key.includes('2026-10-07')),
  );

  // Transaction rollback cannot leave the marker without its notification (or vice versa).
  now = new Date('2026-10-10T05:00:00Z');
  await assert.rejects(
    db.transaction(async (manager) => {
      await goals.lockUser(manager, alice);
      await reminders.enqueueLocked(
        manager,
        replacement,
        0,
        replacementPlan.id,
        now,
      );
      throw new Error('rollback fixture');
    }),
    /rollback fixture/,
  );
  assert.equal((await rows()).length, 9);
  assert.equal((await preferences.find(alice))?.last_reminded_on, '2026-10-08');
  await run();
  assert.equal((await rows()).length, 10);
  console.log(
    'PASS GĐ5: 5 days, two workers, completion/disabled skips, per-channel dedupe, last day, expiry, delivery opt-out, timezone, downtime and atomic rollback.',
  );
}).catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
