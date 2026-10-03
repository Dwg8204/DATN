import { useCallback, useEffect, useRef, useState } from 'react';
import { useBlocker, useLocation, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { useAuth } from '../../../context/AuthContext.jsx';
import { getApiError } from '../../../services/apiError.js';
import { builderConfigs, normalizeBuilderTest } from './builderConfigs.js';
import { builderDraftStorage, builderUrl, DRAFT_SCHEMA_VERSION, draftKey, DraftWriter, hasServerConflict, isMatchingDraft } from './builderDraftStorage.js';

export default function usePersistentBuilder(skill) {
  const { user } = useAuth();
  const userId = String(user.id);
  const { testId } = useParams();
  const [params] = useSearchParams();
  const requestedId = params.get('draftId');
  const purpose = params.get('purpose') === 'PRACTICE' ? 'PRACTICE' : 'EXAM';
  const allowed = skill === 'grammar' ? ['part1', 'part2'] : ['part1', 'part2', 'part3', 'part4'];
  const mode = purpose === 'EXAM' ? 'full' : allowed.includes(params.get('mode')) ? params.get('mode') : 'full';
  const navigate = useNavigate();
  const location = useLocation();
  const latestLocation = useRef(location);
  useEffect(() => { latestLocation.current = location; }, [location]);
  const current = useRef(null);
  const writer = useRef(null);
  const identity = useRef(null);
  const mounted = useRef(false);
  const busy = useRef(false);
  const conflictRef = useRef(null);
  const [state, setState] = useState({ test: null, loading: true, error: '' });
  const [status, setStatus] = useState({ saving: false, error: '', savedAt: null, restored: false });
  const [conflict, setConflict] = useState(null);
  const [online, setOnline] = useState(() => navigator.onLine);
  const shouldWarnOnExit = useCallback(() => Boolean(writer.current && !writer.current.completed
    && (writer.current.record.dirty || busy.current)), []);
  const blocker = useBlocker(useCallback(({ nextLocation }) => {
    if (!shouldWarnOnExit()) return false;
    const test = current.current;
    const serverBase = test?.id ? `/admin/tests/${skill}/${test.id}/edit` : null;
    const newBase = `/admin/tests/new/${skill}`;
    const inside = base => base && (nextLocation.pathname === base || /^\/part\/[1-4]$/.test(nextLocation.pathname.slice(base.length)) && nextLocation.pathname.startsWith(base));
    const sameDraft = new URLSearchParams(nextLocation.search).get('draftId') === writer.current.record.draftId;
    return !(inside(serverBase) || inside(newBase) && sameDraft);
  }, [shouldWarnOnExit, skill]));

  useEffect(() => {
    const warn = event => {
      if (!shouldWarnOnExit()) return;
      event.preventDefault();
      event.returnValue = '';
    };
    window.addEventListener('beforeunload', warn);
    return () => window.removeEventListener('beforeunload', warn);
  }, [shouldWarnOnExit]);

  useEffect(() => {
    mounted.current = true;
    const updateOnline = () => setOnline(navigator.onLine);
    window.addEventListener('online', updateOnline);
    window.addEventListener('offline', updateOnline);
    return () => {
      mounted.current = false;
      window.removeEventListener('online', updateOnline);
      window.removeEventListener('offline', updateOnline);
    };
  }, []);

  const observeWrite = useCallback((promise, session) => {
    const revision = session.revision;
    if (mounted.current) setStatus(previous => ({ ...previous, saving: true, error: '' }));
    promise.then(() => {
      if (mounted.current && writer.current === session && session.revision === revision) {
        setStatus(previous => ({ ...previous, saving: false, error: '', savedAt: session.record.updatedAt }));
      }
    }, error => {
      if (mounted.current && writer.current === session && session.revision === revision) {
        setStatus(previous => ({ ...previous, saving: false, error: error.message || 'Unable to save on this device.' }));
      }
    });
    return promise;
  }, []);

  useEffect(() => {
    const selector = `${userId}:${skill}:${testId || requestedId || `${purpose}:${mode}`}`;
    if (identity.current === selector && writer.current) return undefined;
    identity.current = selector;
    let active = true;
    current.current = null;
    writer.current = null;
    conflictRef.current = null;
    setConflict(null);
    setState({ test: null, loading: true, error: '' });
    setStatus({ saving: false, error: '', savedAt: null, restored: false });
    const controller = new AbortController();

    const initialize = async () => {
      let record;
      let storageError = '';
      try {
        if (testId || requestedId) record = await builderDraftStorage.get(draftKey(userId, skill, testId || requestedId));
        else {
          const records = await builderDraftStorage.list();
          record = records.filter(item => !item.redirectTestId && isMatchingDraft(item, { userId, skill }) && item.test.purpose === purpose && item.test.mode === mode)
            .sort((a, b) => String(b.updatedAt || '').localeCompare(String(a.updatedAt || '')))[0];
        }
        if (record && !isMatchingDraft(record, { userId, skill, testId, draftId: requestedId })) {
          if (active) setState({ test: null, loading: false, error: 'This local draft cannot be restored. It has been kept on this device.' });
          return;
        }
      } catch (error) { storageError = error.message; }
      if (!active) return;

      const draftId = record?.draftId || requestedId || crypto.randomUUID();
      const start = value => {
        const test = normalizeBuilderTest(skill, value);
        const session = new DraftWriter(builderDraftStorage, record || {
          key: draftKey(userId, skill, testId || draftId), schemaVersion: DRAFT_SCHEMA_VERSION,
          userId, skill, testId: testId || null, draftId, serverVersion: test.version,
          serverUpdatedAt: test.updatedAt, dirty: false,
        });
        writer.current = session;
        current.current = test;
        setState({ test, loading: false, error: '', sessionId: session.sessionId });
        setStatus({ saving: false, error: storageError, restored: Boolean(record?.dirty), savedAt: record?.updatedAt || null });
        if (!testId) {
          identity.current = `${userId}:${skill}:${draftId}`;
          const query = new URLSearchParams(latestLocation.current.search);
          query.set('draftId', draftId);
          query.set('purpose', test.purpose);
          query.set('mode', test.mode);
          navigate(`${latestLocation.current.pathname}?${query}`, { replace: true });
        }
        if (!record) observeWrite(session.write(test, false), session).catch(() => {});
      };

      if (!testId) {
        if (record?.test.id) {
          // A server draft was created before navigation/reload; continue editing that id.
          navigate(builderUrl(skill, record.test, draftId), { replace: true });
          return;
        }
        start(record?.test || { ...builderConfigs[skill].create(mode, purpose), purpose });
        return;
      }

      // Show a recovered edit immediately. A server response must not overwrite local edits.
      if (record) start(record.test);
      try {
        const server = normalizeBuilderTest(skill, await builderConfigs[skill].load(testId, controller.signal));
        if (!active) return;
        if (!record) start(server);
        else if (hasServerConflict(writer.current.record, server)) {
          conflictRef.current = server;
          setConflict(server);
        } else if (!record.dirty && writer.current.revision === 0) {
          current.current = server;
          setState(previous => ({ ...previous, test: server, loading: false, error: '' }));
          writer.current.record = { ...writer.current.record, serverVersion: server.version, serverUpdatedAt: server.updatedAt };
          observeWrite(writer.current.write(server, false), writer.current).catch(() => {});
        }
      } catch (error) {
        if (!active || error.code === 'ERR_CANCELED') return;
        if (!record || [401, 403, 404].includes(error.response?.status)) {
          setState({ test: null, loading: false, error: getApiError(error, 'Unable to load this test. Your local draft is preserved.') });
        } else {
          setStatus(previous => ({ ...previous, serverError: 'Unable to check the server version. Your draft is available on this device.' }));
        }
      }
    };
    initialize().catch(error => {
      if (active) setState({ test: null, loading: false, error: error.message });
    });
    return () => { active = false; controller.abort(); };
  }, [userId, skill, testId, requestedId, purpose, mode, navigate, observeWrite]);

  const setTest = useCallback(value => {
    // Ignore a media upload or editor callback belonging to a previously opened test.
    if (!mounted.current || writer.current?.sessionId !== state.sessionId) return;
    const next = typeof value === 'function' ? value(current.current) : value;
    current.current = next;
    setState(previous => ({ ...previous, test: next }));
    if (writer.current) observeWrite(writer.current.write(next), writer.current).catch(() => {});
  }, [observeWrite, state.sessionId]);

  const flushDraft = useCallback(async () => {
    const session = writer.current;
    if (!session || !current.current) throw new Error('The draft is still loading.');
    // Retry the latest snapshot if the preceding write failed (for example a full disk).
    try { await session.pending; }
    catch { await observeWrite(session.write(current.current, session.record.dirty), session); }
  }, [observeWrite]);

  const goTo = useCallback(async partNumber => {
    const session = writer.current;
    try {
      await flushDraft();
      if (writer.current !== session || !mounted.current) return;
      navigate(builderUrl(skill, current.current, writer.current.record.draftId, partNumber));
    } catch { /* The status banner explains the failed local save; keep the editor open. */ }
  }, [flushDraft, navigate, skill]);

  const saveDraft = useCallback(async (candidate = current.current) => {
    if (busy.current) throw new Error('A save is already in progress.');
    if (conflictRef.current) throw new Error('Resolve the server version conflict before saving.');
    busy.current = true;
    const session = writer.current;
    try {
      // Local storage failure must not prevent a user from saving to the server.
      await flushDraft().catch(() => {});
      const payload = candidate.id ? candidate : { ...candidate, creationRequestId: session.record.draftId };
      let saved = normalizeBuilderTest(skill, await builderConfigs[skill].save(payload));
      const applySaved = async (response, submitted) => {
        const active = mounted.current && writer.current === session;
        const result = session.serverSaved(response, active ? current.current : candidate, submitted);
        if (active) {
          current.current = result.test;
          setState(previous => ({ ...previous, test: result.test }));
        }
        await observeWrite(result.persisted, session).catch(() => {});
        return result.test;
      };
      // A replay returns the already-created aggregate, which may predate edits
      // made after the failed request. Attach its id before updating those edits.
      const attached = await applySaved(saved, saved.creationReplayed ? null : candidate);
      if (saved.creationReplayed) {
        saved = normalizeBuilderTest(skill, await builderConfigs[skill].save(attached));
        await applySaved(saved, attached);
      }
      if (mounted.current && writer.current === session) {
        setStatus(previous => ({ ...previous, serverSavedAt: saved.updatedAt || new Date().toISOString(), serverError: '' }));
      }
      return saved;
    } catch (error) {
      const savedId = candidate.id || session.record.testId;
      if (error.response?.status === 409 && mounted.current && writer.current === session && savedId) {
        try {
          const server = normalizeBuilderTest(skill, await builderConfigs[skill].load(savedId));
          if (mounted.current && writer.current === session) {
            conflictRef.current = server;
            setConflict(server);
          }
        } catch { /* Preserve the local draft if the version check also loses its connection. */ }
      }
      throw error;
    } finally { busy.current = false; }
  }, [flushDraft, observeWrite, skill]);

  const publishTest = useCallback(async () => {
    const submitted = current.current;
    const session = writer.current;
    const saved = await saveDraft(submitted);
    busy.current = true;
    try {
      const published = normalizeBuilderTest(skill, await builderConfigs[skill].publish(saved));
      // Preserve edits made while a network request was pending.
      const active = mounted.current && writer.current === session;
      if (session.record.dirty) {
        const result = session.serverSaved(published, active ? current.current : session.record.test, submitted);
        if (active) {
          current.current = result.test;
          setState(previous => ({ ...previous, test: result.test }));
        }
        await observeWrite(result.persisted, session).catch(() => {});
      } else {
        if (active) {
          current.current = published;
          setState(previous => ({ ...previous, test: published }));
        }
        await observeWrite(session.complete(), session).catch(() => {});
      }
      return published;
    } finally { busy.current = false; }
  }, [saveDraft, observeWrite, skill]);

  const resolveConflict = useCallback(async keepLocal => {
    const server = conflictRef.current;
    if (!server) return;
    const next = keepLocal ? { ...current.current, version: server.version, updatedAt: server.updatedAt } : server;
    writer.current.record = { ...writer.current.record, serverVersion: server.version, serverUpdatedAt: server.updatedAt };
    current.current = next;
    setState(previous => ({ ...previous, test: next }));
    try {
      await observeWrite(writer.current.write(next, keepLocal), writer.current);
      conflictRef.current = null;
      setConflict(null);
    } catch { /* Keep both versions and the conflict controls until storage succeeds. */ }
  }, [observeWrite]);

  const discardDraft = useCallback(async () => {
    if (!window.confirm('Discard the local draft and its unsaved changes?')) return;
    try {
      await writer.current.complete();
      const nextId = crypto.randomUUID();
      const test = current.current;
      identity.current = null;
      navigate(testId ? builderUrl(skill, { ...test, id: testId }) : builderUrl(skill, { ...test, id: null }, nextId), { replace: true });
      // Editing uses the same route identity, so force its clean reload after discard.
      if (testId) window.location.reload();
    } catch (error) { setStatus(previous => ({ ...previous, error: error.message })); }
  }, [navigate, skill, testId]);

  useEffect(() => {
    const flush = () => {
      const session = writer.current;
      if (document.visibilityState === 'hidden' && session && !session.completed) {
        session.pending.catch(() => {
          if (writer.current === session && !session.completed) {
            observeWrite(session.write(current.current, session.record.dirty), session).catch(() => {});
          }
        });
      }
    };
    document.addEventListener('visibilitychange', flush);
    return () => document.removeEventListener('visibilitychange', flush);
  }, [observeWrite]);

  return { ...state, setTest, saveDraft, publishTest, flushDraft, goTo,
    exitGuard: { blocker, isBusy: () => busy.current },
    basePath: state.test?.id ? `/admin/tests/${skill}/${state.test.id}/edit` : `/admin/tests/new/${skill}`,
    draftStatus: { ...status, online, conflict, resolveConflict, discardDraft } };
}
