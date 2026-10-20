# Personalization — GĐ1–GĐ5

GĐ5 adds template-based daily reminders after progress reconciliation. The account timezone controls reminder time; the frozen goal timezone controls today's activities and deadline. Notifications and the daily marker commit together under the user lock; per-user/day/channel keys prevent duplicate queue entries. Delivery rechecks eligibility and discards past-day reminders. Email includes dashboard and authenticated opt-out links. See `docs/PERSONALIZATION_GD5_REPORT.md` for configuration, tests and delivery limits. No AI is used.

`PersonalizationModule` exposes STUDENT goal/preferences, snapshot, RULE plan and mistake-review APIs. `AppModule` imports it. `PersonalizationDataModule` contains repositories and transactional goal policies; `PersonalizationProgressModule` adds post-commit reconciliation without depending on attempt services. This avoids circular dependencies when exam/practice, grading and vocabulary services update progress.

Enable `PERSONALIZATION_WORKER_ENABLED=true` for 60-second reconciliation (at most 50 learners per batch, `FOR UPDATE SKIP LOCKED`). Creating a goal or opening the current plan also creates the missing RULE plan synchronously. The worker defaults to disabled when the environment variable is absent; `.env.example` enables it explicitly. Achievement and reminder notifications are enqueued transactionally with a dedupe key and delivered by the existing notification scheduler. Daily email reminders require opt-in and SMTP configuration.

Progress counts every submitted EXAM/PRACTICE, FULL_SKILL/PART attempt in the goal's frozen timezone. Target reached stays ACTIVE; early finish requires the count target; deadline completes or expires the goal. Reconciliation updates plan items before ending the goal. Each attempt is allocated once per week, vocabulary uses the scheduled local day, and only MISTAKE_REVIEW can be completed manually. Final report scheduling belongs to GĐ8; daily reminders belong to GĐ5.

The pure snapshot builder reuses `learningStats`; the hash excludes `asOf`. Score samples are bounded independently of goal counts. The Dashboard and chatbot statistics tool share these policies. See the phase handoffs in `docs/PERSONALIZATION_GD2_REPORT.md`, `docs/PERSONALIZATION_GD3_REPORT.md` and `docs/PERSONALIZATION_GD4_REPORT.md`.

## Data models and repositories

`types/personalization.type.ts` defines typed database rows and write inputs for goals, preferences, insights, plans/items and topic labels. This follows the existing feature pattern: parameterized SQL through TypeORM `DataSource`/`EntityManager`, rather than introducing a second persistence model with decorator entities or schema synchronization.

- `LearningGoalsRepository`: find the current active goal, find an owned goal, create a goal. Calendar dates are returned as `YYYY-MM-DD`; timezone is stored on the goal.
- `LearnerPreferencesRepository`: find/save preferences. Upsert does not reset `last_reminded_on`.
- `LearningInsightsRepository`: enqueue an insight and read an owned insight. Duplicate user/day or goal/period inserts return `null` without overwriting the existing snapshot. WEEKLY and MIDTERM share the same goal/period uniqueness rule.
- `StudyPlansRepository`: create a plan and its items atomically, find an owned week and list owned items. A supplied `EntityManager` must belong to an active transaction. The repository checks scheduled dates against the plan and requires mistake-review source attempts to be submitted by the same user.

All user-facing reads require `userId`. Composite foreign keys enforce matching owners for goals, insights and plans, and matching goals for a plan's insight. Controllers also enforce JWT authentication and the STUDENT role.

Goal replacement ends the old active goal, inserts the replacement, then assigns `replaced_by_goal_id` in one transaction. This order satisfies the active-goal unique index and the immediate replacement FK. State transitions, candidate eligibility, owned question keys, RULE scheduling and pagination are implemented. AI output validation and report scheduling remain in later phases.

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
