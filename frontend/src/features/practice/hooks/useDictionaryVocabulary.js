import { useEffect, useRef, useState } from 'react';
import { studyApi } from '../../dictation/services/studyApi.js';
import { DEFAULT_VOCABULARY_FOLDER, hasDictionaryWord } from '../utils/dictionaryVocabulary.js';

export function useDictionaryVocabulary(userId, open) {
  const [loaded, setLoaded] = useState({ owner: null, topics: [], words: [] });
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState(null);
  const [revision, setRevision] = useState(0);
  const [pending, setPending] = useState(false);
  const [feedback, setFeedback] = useState(null);
  const session = useRef({ owner: userId, epoch: 0 });
  const mounted = useRef(true);
  const busy = useRef(false);
  const requestIds = useRef(new Map());
  const writeVersion = useRef(0);
  if (session.current.owner !== userId) {
    session.current = { owner: userId, epoch: session.current.epoch + 1 };
    requestIds.current.clear();
  }
  useEffect(() => { mounted.current = true; return () => { mounted.current = false; }; }, []);
  useEffect(() => { setFeedback(null); }, [userId]);
  useEffect(() => {
    if (!open || !userId) return undefined;
    const controller = new AbortController();
    const snapshot = session.current;
    const version = writeVersion.current;
    const valid = () => !controller.signal.aborted && mounted.current && session.current === snapshot;
    setLoading(true); setLoadError(null);
    studyApi.state(controller.signal).then(data => {
      if (valid() && writeVersion.current === version) setLoaded({ owner: userId, topics: data.topics, words: data.words });
    }).catch(error => { if (valid() && writeVersion.current === version) setLoadError(error); })
      .finally(() => { if (valid()) setLoading(false); });
    return () => controller.abort();
  }, [userId, open, revision]);

  const data = loaded.owner === userId ? loaded : { topics: [], words: [] };
  const mutate = async (word, operation) => {
    if (!userId || busy.current || loading || loadError || loaded.owner !== userId) return null;
    writeVersion.current += 1;
    busy.current = true; setPending(true); setFeedback(null);
    const snapshot = session.current;
    const valid = () => mounted.current && session.current === snapshot;
    try {
      const result = await operation(valid);
      if (!valid()) return null;
      setFeedback({ word, kind: 'saved' });
      return result;
    } catch (error) {
      if (valid()) setFeedback({ word, kind: 'error', error });
      return null;
    } finally {
      if (valid()) writeVersion.current += 1;
      busy.current = false;
      if (mounted.current) setPending(false);
    }
  };
  const createFolder = async name => {
    const existing = data.topics.find(folder => folder.name.toLowerCase() === name.toLowerCase());
    if (existing) return existing;
    const response = await studyApi.createTopic({ name });
    return response.data;
  };
  const addFolder = name => mutate(null, async valid => {
    const folder = await createFolder(name);
    if (valid()) setLoaded(previous => ({ ...previous,
      topics: previous.topics.some(item => item.id === folder.id) ? previous.topics : [...previous.topics, folder] }));
    return folder;
  });
  const save = (folderId, item) => mutate(item.word, async valid => {
    const folder = folderId ? data.topics.find(candidate => candidate.id === folderId)
      : await createFolder(DEFAULT_VOCABULARY_FOLDER);
    if (!valid()) return null;
    if (hasDictionaryWord(data.words, folder.id, item.word)) return folder;
    const key = `${folder.id}:${item.word}`;
    // Retain both UUID and payload on retry: an uncertain network response must not duplicate a saved word.
    if (!requestIds.current.has(key)) requestIds.current.set(key, { ...item, folderId: folder.id, clientRequestId: crypto.randomUUID() });
    const dto = requestIds.current.get(key);
    const result = await studyApi.create(dto);
    if (valid()) {
      requestIds.current.delete(key);
      setLoaded(previous => ({ owner: userId,
        topics: previous.topics.some(candidate => candidate.id === folder.id) ? previous.topics : [...previous.topics, folder],
        words: [...previous.words, { ...dto, id: result.id }] }));
    }
    return folder;
  });
  return { ...data, ready: loaded.owner === userId && Boolean(userId), loading, loadError, pending, feedback, save, addFolder, retry: () => setRevision(value => value + 1) };
}
