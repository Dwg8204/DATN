# Shared test-attempt client

This feature owns the student attempt lifecycle shared by objective and constructed-response skills:

- `services/testAttemptsApi.js` contains the HTTP contract for start, load, autosave, submit, result, history, and list-state queries.
- `context/TestAttemptContext.jsx` owns server-synchronised answers, revision-based autosave, retry behaviour, submit locking, and the server-clock offset.
- `hooks/useAttemptResult.js` reads immutable result projections. Result pages must not recalculate scores in the browser.
- `utils/attemptTime.js` derives countdowns from `serverTime` and `expiresAt`; a browser clock is never the source of truth.

Skill pages should provide only rendering and answer mapping. They must not persist answers in local or session storage, calculate official scores, or call the attempt endpoints directly.

## Grammar & Vocabulary answer keys

- Part 1: `p1:q{1..25}` with `{ kind: 'CHOICE', optionId }`.
- Part 2: `p2:q{26..50}` with `{ kind: 'MATCH', optionId }`.

## Writing answer keys

- Part 1: `p1:q{1..5}`.
- Part 2: `p2:q1`.
- Part 3: `p3:q{1..3}`.
- Part 4: `p4:q1` for the informal response and `p4:q2` for the formal response.

Writing answers use `{ kind: 'TEXT', text }`. Submission seals the saved responses immediately and returns a pending-assessment result; the browser must not fabricate a score while AI assessment is unavailable.

The backend snapshot remains the authoritative paper and answer key. The attempt result returned by the backend is the authoritative score and detailed review data.
