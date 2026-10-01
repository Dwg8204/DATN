# Shared test attempts

All endpoints are under `/api/v1/test-attempts`, require the access-token cookie, and belong to the authenticated student.

| Method | Path | Purpose |
| --- | --- | --- |
| POST | `/` | Start or resume a published test. Body: `{ "testId": "uuid", "attemptId": "client-generated uuid", "mode": "part1|...|full" }`. Reuse the same `attemptId` on retries. |
| GET | `/:attemptId` | Resume: safe paper, saved answers, navigation position, revision, server time and expiry. |
| PATCH | `/:attemptId/progress` | Save answer changes. Body: `{ "expectedRevision": 0, "changes": { "p1:q1": { "kind": "CHOICE", "optionId": "o1" } }, "currentQuestionKey": "p1:q1" }`. A `null` answer clears that key. |
| POST | `/:attemptId/submit` | Seal the answers. Body: `{ "expectedRevision": 1, "finalChanges": {} }`. Objective questions are scored in this request; repeated submissions return the stored result. |
| GET | `/:attemptId/result` | Result summary, score and grading status. |
| GET | `/:attemptId/result/parts/:partNumber` | Detailed answers, correct options, explanations and per-question outcomes. Available only after submission. |
| GET | `/history?page=1&pageSize=10&component=GRAMMAR_VOCAB` | Paginated student history. |
| GET | `/states?testIds=uuid,uuid` | Latest state for up to 100 visible test cards, avoiding one request per card. |

Question keys and option IDs come from the returned paper. The server never accepts a score or correct answer from the client. The paper omits answer keys, explanations and Writing samples until submission. A stale `expectedRevision` returns HTTP 409 with `error.currentRevision`; the client should reload progress before retrying. The snapshot is immutable, so editing a published test cannot change an active attempt.

`attempt_progress` receives frequent answer writes. Autosave returns the saved revision and timestamp; resume returns the full saved answers. `test_attempts` receives the start and final result. Grammar & Vocabulary and Listening use synchronous objective grading. Writing submissions remain `QUEUED` for the later AI assessment module. The expiry worker seals saved answers one transaction at a time and temporarily postpones a failing snapshot so other attempts continue. `GET /:attemptId` includes `canAnswer`; after the deadline, submit accepts saved answers only. The result includes `submittedAfterExpiry`.

Current time limits follow the existing frontend: Grammar & Vocabulary 25 minutes, Listening 40 minutes, Writing 50 minutes. Part practice currently has the same limit as its skill. CEFR conversion is intentionally absent until the skill-specific scoring rules are agreed; the raw score and maximum are returned.

History only returns submitted attempts and supports `component`, `mode`, `search`, `sort`, `page` and `pageSize`. Grammar & Vocabulary uses this shared flow for Part 1, Part 2 and the 50-question full test. The browser keeps only pending UI changes; PostgreSQL remains the source of truth for saved answers and results.

E2E tests require a separate PostgreSQL database. Set `TEST_DATABASE_URL` to a database whose name ends in `_test`, migrate and seed that database, then run `npm run test:e2e`. The test setup rejects a missing test URL or a URL pointing at the normal `DATABASE_URL` database. Background expiry runs are disabled during E2E; the expiry test invokes the service explicitly. Do not use the normal development database for E2E.

`npm run test:attempt-load` runs a repeatable service and PostgreSQL load check on the same isolated database. It creates temporary learners and a 25-question fixture, measures start, five autosave rounds and objective submit, then removes its data. Set `ATTEMPT_LOAD_LEARNERS=200` to increase concurrency (maximum 1000). These numbers measure the backend service and database, not browser or network latency.
