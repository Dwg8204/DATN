# Personalization — GĐ1 data foundation

This module exports four injectable repositories. It has no controller, scheduler, AI calls or notification delivery. Import `PersonalizationModule` to use the repositories; `AppModule` already imports it. GĐ2 introduces the goal/preferences API and frontend integration.

## Data models and repositories

`types/personalization.type.ts` defines typed database rows and write inputs for goals, preferences, insights, plans/items and topic labels. This follows the existing feature pattern: parameterized SQL through TypeORM `DataSource`/`EntityManager`, rather than introducing a second persistence model with decorator entities or schema synchronization.

- `LearningGoalsRepository`: find the current active goal, find an owned goal, create a goal. Calendar dates are returned as `YYYY-MM-DD`; timezone is stored on the goal.
- `LearnerPreferencesRepository`: find/save preferences. Upsert does not reset `last_reminded_on`.
- `LearningInsightsRepository`: enqueue an insight and read an owned insight. Duplicate user/day or goal/period inserts return `null` without overwriting the existing snapshot. WEEKLY and MIDTERM share the same goal/period uniqueness rule.
- `StudyPlansRepository`: create a plan and its items atomically, find an owned week and list owned items. A supplied `EntityManager` must belong to an active transaction. The repository checks scheduled dates against the plan and requires mistake-review source attempts to be submitted by the same user.

All user-facing reads require `userId`. Composite foreign keys enforce matching owners for goals, insights and plans, and matching goals for a plan's insight. Foreign keys are not a replacement for the authentication/role checks that future controllers must apply.

Goal replacement belongs to GĐ2: inside one transaction, end the old active goal, insert the replacement, then assign `replaced_by_goal_id`. This order satisfies the active-goal unique index and the immediate replacement FK. State transitions, timezone validation, candidate eligibility, matching question keys, scheduling, pagination and AI output validation remain in their planned service phases.

## Migrations

- `1760000017000-AddPersonalizationEnums`: adds `REPLACED` and `LEARNING_REPORT`.
- `1760000018000-AddLearningPersonalization`: creates `learner_preferences`, `learning_insights`, `study_plans`, `study_plan_items`; extends goals, notifications, chat sessions, topics and topic labels; adds lookup/work/delivery indexes.

`createDataSourceOptions` now uses `migrationsTransactionMode: 'each'`, also honored by the TypeORM CLI. Run `npm run db:migrate` without forcing `--transaction all`. The enum migration commits before the schema migration; if the latter fails, rerunning safely resumes it.

Existing goals outside CEFR A1/A2/B1/B2/C, 3–180 days or 1–500 tests cause `PERSONALIZATION_LEGACY_GOALS_INVALID`. The migration does not silently rewrite or remove them. Existing topic labels remain `APPROVED`/`ADMIN`; GĐ10 must explicitly insert AI suggestions as `SUGGESTED`/`AI` and implement admin approval.

The item shape CHECK explicitly rejects null/empty/oversized mistake-review question lists and inappropriate fields on vocabulary activities. `done_count` must stay within `0..target_count`; later event handlers should cap progress at the target.

Rollback of the schema migration deletes the new tables/columns and their data. Enum rollback refuses while any goal is `REPLACED` or notification is `LEARNING_REPORT`; it never silently changes those records to an unrelated status/type. Back up data and review dependencies before any non-test rollback.

## Verification

From `backend`, with `TEST_DATABASE_URL` naming a dedicated database ending in `_test` and different from `DATABASE_URL`:

```powershell
npm run test:personalization:db
npm test
npm run typecheck
npm run build
```

The PostgreSQL test creates and removes its own schema, runs the full historical migration chain, tests old valid/invalid goals, up/down/up, defaults, checks, indexes, concurrency, ownership, cascades and atomic rollback. The deliberately rejected legacy fixture prints a migration error before the final PASS line; that rejection is an expected assertion. It does not call AI or send notifications/email.
