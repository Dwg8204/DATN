import { useCallback, useEffect, useRef, useState } from 'react';
import { studyApi } from '../services/studyApi';

const empty = { topics: [], words: [], exercises: [], ratings: {}, progress: {} };

export function useStudyData(userId) {
  const [loaded, setLoaded] = useState({ owner: null, data: empty });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [saving, setSaving] = useState(false);
  const active = useRef(userId);
  const mounted = useRef(true);
  const busy = useRef(false);
  const requestVersion = useRef(0);
  const sessionVersion = useRef(0);
  if (active.current !== userId) { active.current = userId; sessionVersion.current += 1; }
  useEffect(() => { mounted.current = true; return () => { mounted.current = false; }; }, []);

  const refresh = useCallback(async signal => {
    const version = ++requestVersion.current;
    const valid = () => mounted.current && active.current === userId && version === requestVersion.current;
    if (!userId) return;
    try {
      const data = await studyApi.state(signal);
      if (valid()) { setLoaded({ owner: userId, data }); setError(null); }
      return data;
    } catch (cause) {
      if (valid() && cause.code !== 'ERR_CANCELED') setError(cause);
      throw cause;
    } finally {
      if (valid()) setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    const controller = new AbortController();
    setLoading(Boolean(userId)); setError(null); busy.current = false; setSaving(false);
    if (userId) refresh(controller.signal).catch(() => {});
    return () => controller.abort();
  }, [userId, refresh]);

  const mutate = async operation => {
    if (!userId || busy.current) return null;
    const session = sessionVersion.current;
    const valid = () => mounted.current && active.current === userId && sessionVersion.current === session;
    busy.current = true; setSaving(true);
    try {
      const value = await operation();
      if (!valid()) return null;
      // A successful write remains successful even if the subsequent read is offline.
      // Show a retry screen in that case, never silently switch back to local data.
      await refresh().catch(() => {});
      return valid() ? value : null;
    } finally {
      if (valid()) { busy.current = false; setSaving(false); }
    }
  };

  return { data: loaded.owner === userId ? loaded.data : empty, loading: loading || Boolean(userId && loaded.owner !== userId && !error), error, saving, refresh, mutate };
}
