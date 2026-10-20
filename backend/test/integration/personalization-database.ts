import 'reflect-metadata';
import 'dotenv/config';
import * as assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { readdirSync } from 'node:fs';
import { resolve } from 'node:path';
import { DataSource } from 'typeorm';
import { createDataSourceOptions } from '../../src/database/data-source-options';
import { LearningGoalsRepository } from '../../src/features/personalization/repositories/learning-goals.repository';
import { LearnerPreferencesRepository } from '../../src/features/personalization/repositories/learner-preferences.repository';
import { LearningInsightsRepository } from '../../src/features/personalization/repositories/learning-insights.repository';
import { StudyPlansRepository } from '../../src/features/personalization/repositories/study-plans.repository';
import { CreatePlanItemInput } from '../../src/features/personalization/types/personalization.type';

async function main() {
  const url = process.env.TEST_DATABASE_URL;
  assert.ok(
    url && decodeURIComponent(new URL(url).pathname).endsWith('_test'),
    'A dedicated TEST_DATABASE_URL ending in _test is required',
  );
  if (process.env.DATABASE_URL)
    assert.notEqual(
      new URL(url).pathname,
      new URL(process.env.DATABASE_URL).pathname,
    );
  const schema = `personalization_test_${randomUUID().replaceAll('-', '')}`;
  const options = createDataSourceOptions({
    ...process.env,
    DATABASE_URL: url,
  });
  if (options.type !== 'postgres') throw new Error('PostgreSQL is required');
  const admin = await new DataSource({
    ...options,
    logging: false,
  }).initialize();
  const db = new DataSource({
    ...options,
    schema,
    logging: false,
    extra: { options: `-c search_path=${schema},public`, max: 5 },
  });
  try {
    await admin.query(`CREATE SCHEMA "${schema}"`);
    const migrationDir = resolve(__dirname, '../../src/database/migrations');
    const baseline = new DataSource({
      ...options,
      schema,
      logging: false,
      extra: { options: `-c search_path=${schema},public` },
      migrations: readdirSync(migrationDir)
        .filter(
          (name) => name.endsWith('.ts') && !/^176000001[78]000-/.test(name),
        )
        .map((name) => resolve(migrationDir, name)),
    });
    try {
      await baseline.initialize();
      await baseline.runMigrations();
    } finally {
      if (baseline.isInitialized) await baseline.destroy();
    }
    await db.initialize();

    const alice = randomUUID(),
      bob = randomUUID(),
      disposable = randomUUID();
    await db.query(
      "INSERT INTO roles(code,name) VALUES('STUDENT','User') ON CONFLICT DO NOTHING",
    );
    for (const id of [alice, bob, disposable]) {
      await db.query(
        `INSERT INTO users(id,email,password_hash,first_name,last_name,role_id,status)
        SELECT $1,$2,'test-only','Test','Personalization',id,'ACTIVE' FROM roles WHERE code='STUDENT'`,
        [id, `${id}@example.invalid`],
      );
    }
    const goalA = randomUUID(),
      goalB = randomUUID();
    await db.query(
      `INSERT INTO learning_goals(id,user_id,target_cefr,target_test_count,duration_days,start_date,timezone)
      VALUES($1,$2,'B2',40,30,'2026-10-19','Asia/Bangkok'),($3,$4,'C1',600,2,'2026-10-19','Asia/Bangkok')`,
      [goalA, alice, goalB, bob],
    );
    const testId = randomUUID(),
      snapshotId = randomUUID(),
      attemptId = randomUUID(),
      questionId = randomUUID(),
      topicId = randomUUID();
    await db.query(
      `INSERT INTO tests(id,created_by,title,component,purpose,scope,part_number) VALUES($1,$2,'Fixture','READING','PRACTICE','PART',1)`,
      [testId, alice],
    );
    await db.query(
      `INSERT INTO test_snapshots(id,test_id,version,schema_version,snapshot,content_hash) VALUES($1,$2,1,1,'{}',$3)`,
      [snapshotId, testId, 'a'.repeat(64)],
    );
    await db.query(
      `INSERT INTO test_attempts(id,student_id,snapshot_id,component,scope,part_number,status,purpose)
      VALUES($1,$2,$3,'READING','PART',1,'SUBMITTED','PRACTICE')`,
      [attemptId, alice, snapshotId],
    );
    await db.query(
      `INSERT INTO questions(id,test_id,part_number,position,question_type,content) VALUES($1,$2,1,1,'CHOICE','{}')`,
      [questionId, testId],
    );
    await db.query(
      `INSERT INTO learning_topics(id,code,name,topic_type) VALUES($1,'fixture','Fixture','KNOWLEDGE')`,
      [topicId],
    );
    await db.query(
      'INSERT INTO question_topics(question_id,topic_id,weight) VALUES($1,$2,1)',
      [questionId, topicId],
    );

    // Invalid old goals must stop the migration, never be silently clamped or erased.
    await assert.rejects(
      db.runMigrations(),
      /PERSONALIZATION_LEGACY_GOALS_INVALID/,
    );
    const [legacy] = await db.query(
      'SELECT target_cefr,duration_days,target_test_count FROM learning_goals WHERE id=$1',
      [goalB],
    );
    assert.deepEqual(legacy, {
      target_cefr: 'C1',
      duration_days: 2,
      target_test_count: 600,
    });
    assert.equal(
      (await db.query("SELECT 'REPLACED'::learning_goal_status AS status"))[0]
        .status,
      'REPLACED',
    );
    assert.equal(
      (
        await db.query('SELECT to_regclass($1) AS relation', [
          `${schema}.learning_insights`,
        ])
      )[0].relation,
      null,
    );
    // Repair only this deliberately invalid test fixture, then resume migration.
    await db.query(
      "UPDATE learning_goals SET target_cefr='C',duration_days=180,target_test_count=500 WHERE id=$1",
      [goalB],
    );
    assert.deepEqual(
      (await db.runMigrations()).map((m) => m.name),
      ['AddLearningPersonalization1760000018000'],
    );
    assert.equal(await db.showMigrations(), false);

    const goals = new LearningGoalsRepository(db),
      preferences = new LearnerPreferencesRepository(db);
    const insights = new LearningInsightsRepository(db),
      plans = new StudyPlansRepository(db);
    const goalInput = {
      targetCefr: 'B1' as const,
      targetTests: 1,
      durationDays: 3,
      startDate: '2026-10-19',
      timezone: 'Asia/Bangkok',
    };
    assert.equal((await goals.findActive(alice))?.start_date, '2026-10-19');
    assert.equal(await goals.findById(bob, goalA), null);
    assert.equal((await goals.findById(alice, goalA))?.target_test_count, 40);
    await assert.rejects(
      goals.create(alice, goalInput),
      /learning_goals_one_active_idx/,
    );
    for (const input of [
      { durationDays: 2 },
      { durationDays: 181 },
      { targetTests: 0 },
      { targetTests: 501 },
    ]) {
      await assert.rejects(
        goals.create(disposable, { ...goalInput, ...input }),
        /learning_goals/,
      );
    }
    await assert.rejects(
      db.query("UPDATE learning_goals SET target_cefr='C2' WHERE id=$1", [
        goalA,
      ]),
      /learning_goals_cefr_ck/,
    );
    const goalC = await goals.create(disposable, goalInput);
    await assert.rejects(
      db.query('UPDATE learning_goals SET replaced_by_goal_id=$1 WHERE id=$2', [
        goalB,
        goalA,
      ]),
      /learning_goals_replacement_owner_fk/,
    );
    await assert.rejects(
      db.query('UPDATE learning_goals SET replaced_by_goal_id=id WHERE id=$1', [
        goalA,
      ]),
      /learning_goals_replacement_ck/,
    );

    await db.query('INSERT INTO learner_preferences(user_id) VALUES($1)', [
      disposable,
    ]);
    assert.deepEqual(await preferences.find(bob), null);
    assert.deepEqual(await preferences.find(disposable), {
      user_id: disposable,
      reminder_enabled: true,
      reminder_time: '19:00:00',
      email_reminder_enabled: false,
      email_report_enabled: true,
      last_reminded_on: null,
      updated_at: (await preferences.find(disposable))!.updated_at,
    });
    const prefs = {
      reminderEnabled: false,
      reminderTime: '08:30',
      emailReminderEnabled: true,
      emailReportEnabled: false,
    };
    await preferences.save(alice, prefs);
    await db.query(
      "UPDATE learner_preferences SET last_reminded_on='2026-10-18' WHERE user_id=$1",
      [alice],
    );
    const saved = await preferences.save(alice, {
      ...prefs,
      reminderTime: '20:15',
    });
    assert.equal(saved.last_reminded_on, '2026-10-18');
    assert.equal(saved.reminder_enabled, false);
    assert.equal(saved.email_report_enabled, false);
    assert.equal(saved.reminder_time, '20:15:00');

    const common = {
      snapshotVersion: 1,
      inputHash: 'b'.repeat(64),
      snapshot: { completed: 1 },
    };
    const report = await insights.createPending(alice, {
      ...common,
      kind: 'WEEKLY',
      goalId: goalA,
      periodKey: 'W1',
      weekIndex: 1,
      coversFrom: '2026-10-19',
      coversTo: '2026-10-25',
      deliverAt: new Date('2026-10-26T01:00:00Z'),
    });
    assert.ok(report);
    assert.equal(report.status, 'PENDING');
    assert.equal(report.retry_count, 0);
    assert.equal(report.covers_from, '2026-10-19');
    assert.deepEqual(report.snapshot, common.snapshot);
    assert.equal(await insights.findById(bob, report.id), null);
    assert.equal(
      await insights.createPending(alice, {
        ...common,
        kind: 'MIDTERM',
        goalId: goalA,
        periodKey: 'W1',
      }),
      null,
    );
    await assert.rejects(
      insights.createPending(bob, {
        ...common,
        kind: 'FINAL',
        goalId: goalA,
        periodKey: 'FINAL',
      }),
      /insights_goal_owner_fk/,
    );
    const comments = await Promise.all(
      [1, 2].map(() =>
        insights.createPending(alice, {
          ...common,
          kind: 'COMMENT',
          periodKey: '2026-10-19',
        }),
      ),
    );
    assert.equal(comments.filter(Boolean).length, 1);
    assert.ok(
      await insights.createPending(bob, {
        ...common,
        kind: 'COMMENT',
        periodKey: '2026-10-19',
      }),
    );
    await assert.rejects(
      db.query(
        `INSERT INTO learning_insights(user_id,goal_id,kind,period_key,snapshot_version,input_hash,snapshot)
      VALUES($1,$2,'COMMENT','invalid',1,$3,'{}')`,
        [alice, goalA, common.inputHash],
      ),
      /insights_goal_ck/,
    );
    await assert.rejects(
      db.query(
        `INSERT INTO learning_insights(user_id,kind,period_key,snapshot_version,input_hash,snapshot)
      VALUES($1,'FINAL','invalid',1,$2,'{}')`,
        [alice, common.inputHash],
      ),
      /insights_goal_ck/,
    );
    await assert.rejects(
      insights.createPending(alice, {
        ...common,
        kind: 'FINAL',
        goalId: goalA,
        periodKey: 'bad-range',
        coversFrom: '2026-10-25',
      }),
      /insights_period_ck/,
    );

    const planInput = {
      goalId: goalA,
      weekIndex: 1,
      startsOn: '2026-10-19',
      endsOn: '2026-10-25',
      source: 'RULE' as const,
      insightId: report.id,
    };
    const itemBase = {
      scheduledOn: '2026-10-19',
      sortOrder: 0,
      targetCount: 1,
    };
    const items: CreatePlanItemInput[] = [
      {
        ...itemBase,
        activityType: 'TEST',
        component: 'READING',
        testId,
        partNumber: 1,
      },
      {
        ...itemBase,
        sortOrder: 1,
        activityType: 'VOCAB_REVIEW',
        targetCount: 20,
      },
      {
        ...itemBase,
        sortOrder: 2,
        activityType: 'MISTAKE_REVIEW',
        sourceAttemptId: attemptId,
        questionKeys: ['p1:q1'],
      },
      {
        ...itemBase,
        scheduledOn: '2026-10-20',
        activityType: 'TOPIC_REVIEW',
        topicId,
      },
    ];
    const plan = await plans.create(alice, planInput, items);
    await assert.rejects(
      plans.create(alice, { ...planInput, weekIndex: 3 }, [], db.manager),
      /PLAN_TRANSACTION_REQUIRED/,
    );
    const foundItems = await plans.findItems(alice, plan.id);
    assert.equal(foundItems.length, 4);
    assert.equal(foundItems[0].scheduled_on, '2026-10-19');
    assert.deepEqual(
      foundItems.map((i) => i.activity_type),
      ['TEST', 'VOCAB_REVIEW', 'MISTAKE_REVIEW', 'TOPIC_REVIEW'],
    );
    assert.deepEqual(await plans.findItems(bob, plan.id), []);
    assert.equal(await plans.findWeek(bob, goalA, 1), null);
    assert.equal((await plans.findWeek(alice, goalA, 1))?.id, plan.id);
    await assert.rejects(
      plans.create(bob, { ...planInput, weekIndex: 2 }, []),
      /plans_goal_owner_fk/,
    );
    await assert.rejects(
      plans.create(bob, { ...planInput, goalId: goalB }, []),
      /plans_insight_goal_owner_fk/,
    );
    await assert.rejects(
      plans.create(bob, { ...planInput, goalId: goalB, insightId: undefined }, [
        items[2],
      ]),
      /Submitted attempt not found/,
    );
    assert.equal(await plans.findWeek(bob, goalB, 1), null);
    await assert.rejects(
      plans.create(alice, { ...planInput, weekIndex: 2 }, [
        items[0],
        { ...items[1], targetCount: 0 },
      ]),
      /target_count/,
    );
    assert.equal(await plans.findWeek(alice, goalA, 2), null);
    await assert.rejects(
      plans.create(alice, { ...planInput, weekIndex: 2 }, [
        { ...items[0], scheduledOn: '2026-10-26' },
      ]),
      /within its study plan/,
    );
    assert.equal(await plans.findWeek(alice, goalA, 2), null);
    const sameWeek = await Promise.allSettled(
      [1, 2].map(() =>
        plans.create(alice, { ...planInput, weekIndex: 2 }, [items[0]]),
      ),
    );
    assert.equal(sameWeek.filter((r) => r.status === 'fulfilled').length, 1);

    for (const keys of [
      null,
      [],
      [null],
      Array.from({ length: 11 }, (_, i) => `p1:q${i + 1}`),
    ]) {
      await assert.rejects(
        db.query(
          `INSERT INTO study_plan_items(plan_id,scheduled_on,activity_type,source_attempt_id,question_keys)
        VALUES($1,'2026-10-19','MISTAKE_REVIEW',$2,$3)`,
          [plan.id, attemptId, keys],
        ),
        /plan_item_shape_ck/,
      );
    }
    await assert.rejects(
      db.query(
        `INSERT INTO study_plan_items(plan_id,scheduled_on,activity_type,component)
      VALUES($1,'2026-10-19','VOCAB_REVIEW','READING')`,
        [plan.id],
      ),
      /plan_item_shape_ck/,
    );
    await assert.rejects(
      db.query(
        'UPDATE study_plan_items SET done_count=target_count+1 WHERE id=$1',
        [foundItems[0].id],
      ),
      /done_count/,
    );

    const [label] = await db.query(
      'SELECT status,source,confidence FROM question_topics WHERE question_id=$1',
      [questionId],
    );
    assert.deepEqual(label, {
      status: 'APPROVED',
      source: 'ADMIN',
      confidence: null,
    });
    await db.query(
      "UPDATE question_topics SET status='SUGGESTED',source='AI',confidence=.75 WHERE question_id=$1",
      [questionId],
    );
    await assert.rejects(
      db.query(
        'UPDATE question_topics SET confidence=1.1 WHERE question_id=$1',
        [questionId],
      ),
      /confidence/,
    );

    const notificationSql = `INSERT INTO notifications(title,content,type,channel,audience_type,dedupe_key)
      VALUES('Fixture','Fixture','LEARNING_REPORT','IN_APP','SELECTED_USERS',$1) RETURNING id`;
    const deliveries = await Promise.allSettled(
      [1, 2].map(() => db.query(notificationSql, ['report:fixture:IN_APP'])),
    );
    assert.equal(deliveries.filter((r) => r.status === 'fulfilled').length, 1);
    await db.query(notificationSql, [null]);
    await db.query(notificationSql, [null]);

    const chatId = randomUUID();
    await db.query(
      "INSERT INTO chat_sessions(id,user_id,title,context_insight_id) VALUES($1,$2,'Fixture',$3)",
      [chatId, alice, report.id],
    );
    await db.query('DELETE FROM learning_insights WHERE id=$1', [report.id]);
    assert.equal(
      (
        await db.query(
          'SELECT context_insight_id FROM chat_sessions WHERE id=$1',
          [chatId],
        )
      )[0].context_insight_id,
      null,
    );
    assert.equal((await plans.findWeek(alice, goalA, 1))?.insight_id, null);

    const reportC = await insights.createPending(disposable, {
      ...common,
      kind: 'PLAN_START',
      goalId: goalC.id,
      periodKey: 'START',
    });
    await plans.create(
      disposable,
      { ...planInput, goalId: goalC.id, insightId: reportC!.id },
      [items[0]],
    );
    await db.query("UPDATE learning_goals SET status='REPLACED' WHERE id=$1", [
      goalC.id,
    ]);
    const replacement = await goals.create(disposable, goalInput);
    await db.query(
      'UPDATE learning_goals SET replaced_by_goal_id=$1 WHERE id=$2',
      [replacement.id, goalC.id],
    );
    await db.query('DELETE FROM learning_goals WHERE id=$1', [replacement.id]);
    assert.equal(
      (await goals.findById(disposable, goalC.id))?.replaced_by_goal_id,
      null,
    );
    await db.query('DELETE FROM users WHERE id=$1', [disposable]);
    for (const table of [
      'learning_goals',
      'learner_preferences',
      'learning_insights',
      'study_plans',
    ]) {
      assert.equal(
        (
          await db.query(
            `SELECT count(*)::int AS count FROM ${table} WHERE user_id=$1`,
            [disposable],
          )
        )[0].count,
        0,
      );
    }
    assert.equal(
      (
        await db.query(
          'SELECT count(*)::int AS count FROM study_plan_items i LEFT JOIN study_plans p ON p.id=i.plan_id WHERE p.id IS NULL',
        )
      )[0].count,
      0,
    );
    const indexNames = (
      await db.query('SELECT indexname FROM pg_indexes WHERE schemaname=$1', [
        schema,
      ])
    ).map((r: { indexname: string }) => r.indexname);
    for (const index of [
      'learning_goals_active_idx',
      'insights_work_idx',
      'insights_delivery_idx',
      'question_topics_review_idx',
      'attempts_student_submitted_idx',
      'vocab_review_item_time_idx',
      'insights_comment_day_idx',
      'insights_goal_period_idx',
    ])
      assert.ok(indexNames.includes(index), index);

    // Roll back in the same order operators use, retaining pre-existing goal/topic data.
    await db.query("UPDATE learning_goals SET status='REPLACED' WHERE id=$1", [
      goalB,
    ]);
    await db.undoLastMigration();
    await assert.rejects(
      db.undoLastMigration(),
      /PERSONALIZATION_ENUM_ROLLBACK_IN_USE/,
    );
    assert.equal(
      (
        await db.query('SELECT status FROM learning_goals WHERE id=$1', [goalB])
      )[0].status,
      'REPLACED',
    );
    await db.query("UPDATE learning_goals SET status='CANCELLED' WHERE id=$1", [
      goalB,
    ]);
    await db.query("DELETE FROM notifications WHERE type='LEARNING_REPORT'");
    await db.undoLastMigration();
    const labels = await db.query(
      'SELECT unnest(enum_range(NULL::learning_goal_status))::text AS label',
    );
    assert.deepEqual(
      labels.map((r: { label: string }) => r.label),
      ['ACTIVE', 'COMPLETED', 'EXPIRED', 'CANCELLED'],
    );
    assert.equal(
      (
        await db.query(
          'SELECT count(*)::int AS count FROM question_topics WHERE question_id=$1',
          [questionId],
        )
      )[0].count,
      1,
    );
    assert.equal(
      (
        await db.query(
          'SELECT target_test_count FROM learning_goals WHERE id=$1',
          [goalA],
        )
      )[0].target_test_count,
      40,
    );
    assert.equal((await db.runMigrations()).length, 2);
    assert.equal(await db.showMigrations(), false);
    console.log(
      'PASS personalization: full migration chain, legacy preflight, up/down/up, constraints, ownership, concurrency, cascades, repositories and rollback.',
    );
  } finally {
    if (db.isInitialized) await db.destroy();
    await admin.query(`DROP SCHEMA IF EXISTS "${schema}" CASCADE`);
    await admin.destroy();
  }
}

main().catch((error) => {
  console.error('Personalization database test failed:', error?.message);
  process.exitCode = 1;
});
