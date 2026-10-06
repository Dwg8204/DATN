# Admin test drafts

The Reading, Listening, Speaking, Writing and Grammar builders use
`usePersistentBuilder` for the entire Information/Part editing session.

- React state owns the visible test. Navigating to a part does not initialize a new test.
- `builderUrl` carries `purpose`, `mode` and the new test's `draftId` through every editor link.
- IndexedDB saves incomplete content, covers and pending audio on each change. Rich-text
  editors update their parent on input, without a delayed update that can be lost on F5.
- Draft keys contain the authenticated user, skill and either `draftId` or server `testId`.
  Opening Add test again resumes the latest matching local new draft. Discard local draft
  explicitly starts a fresh draft; different draft URLs keep separate contents.
- Save change in a part saves locally before returning to Information. Save draft in
  Information sends the entire aggregate to the server. Publish validates the complete test.
- Creating a server draft moves its local record atomically and leaves a small redirect
  for the old URL. A publish failure can be retried against that same server id.
  A failed local move retries using the last durable key and the newest edits.
- Create requests use the draft UUID as `creationRequestId`. The backend derives an id
  scoped to creator and skill and serializes retries in the insertion transaction.
  If a create response is lost, retry recovers the same test and updates any newer
  local changes with the recovered version. This needs no database migration.
- Removing audio or entering another audio URL invalidates the pending upload response.
- Server responses do not overwrite edits made while a request is pending. Changed server
  versions require an explicit choice; local transaction revisions prevent stale tabs from
  silently overwriting each other's drafts.
- An offline authentication check keeps the requested URL behind the access guard. Retry
  after reconnecting verifies the session before reopening the local draft.

Local drafts are specific to this browser/origin and device. Clearing browser site data
removes them. Wait for **Saved on this device** before closing the browser. A full disk or
disabled IndexedDB shows **Not saved on this device**; saving to the server remains available.
This change does not make the frontend assets available offline after a cold browser start.

Leaving a builder with changes not saved to the server opens a confirmation dialog.
Keep draft & leave waits for local persistence; a failed local save keeps the editor open.
Information/Part navigation and a successful publication do not ask for confirmation.
Refreshing, closing the tab or leaving the site requests the browser's native warning;
its text is controlled by the browser and requires prior user interaction.

## Verification

From `frontend`:

```sh
npm test
npm run test:builder:e2e
npm run build
```

The browser tests use Playwright, real IndexedDB, the real React routes and mocked API
responses. On Windows they use installed Microsoft Edge. Elsewhere install Playwright's
Chromium (`npx playwright install chromium`), or set `BUILDER_BROWSER_CHANNEL` to an installed
supported channel. The test starts its own Vite server on port 4178 and closes it afterward.

Restart both frontend and backend when trying the changes. Writing/Grammar publish requests
now include the saved version, matching the concurrency check used by the other skills.
