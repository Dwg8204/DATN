import { useUiTranslation } from "../../../i18n/useUiTranslation.jsx";
import { useEffect, useMemo, useRef, useState } from 'react';
import { BookOpen, Check, ChevronDown, ChevronUp, FolderPlus, Plus, RotateCcw, Volume2, X } from 'lucide-react';
import styles from './DictionaryPopover.module.css';
import { useTranslation } from 'react-i18next';
import api from '../../../services/api.js';
import { normalizeApiError } from '../../../services/apiError.js';
import { API_ENDPOINTS } from '../../../services/endpoint.js';
import { useAuth } from '../../../context/AuthContext.jsx';
import { useDictionaryVocabulary } from '../hooks/useDictionaryVocabulary.js';
import { DEFAULT_VOCABULARY_FOLDER, dictionaryVietnameseTranslations, dictionaryWordItem, hasDictionaryWord } from '../utils/dictionaryVocabulary.js';

const LOOKUP_CACHE = new Map();
const MAX_CACHE_ENTRIES = 100;
const cleanWord = value => value?.trim().replace(/^[^a-z'-]+|[^a-z'-]+$/gi, '').toLowerCase();
const ignoredTarget = target => target?.closest?.('input,textarea,select,button,a,[contenteditable="true"]');

async function lookup(word, signal, forceRefresh = false) {
  if (!forceRefresh && LOOKUP_CACHE.has(word)) return LOOKUP_CACHE.get(word);
  const response = await api.get(API_ENDPOINTS.dictionary.lookup(word), {
    signal,
    params: forceRefresh ? { refresh: 'true' } : undefined,
    notifyOnError: false,
  });
  const result = response.data;
  if (LOOKUP_CACHE.size >= MAX_CACHE_ENTRIES) LOOKUP_CACHE.delete(LOOKUP_CACHE.keys().next().value);
  LOOKUP_CACHE.set(word, result);
  return result;
}

export default function DictionaryPopover({ active }) {
  const ui = useUiTranslation();
  const { t } = useTranslation();
  const { user } = useAuth();
  const [request, setRequest] = useState(null);
  const [state, setState] = useState({ loading: false, data: null, error: '' });
  const [tab, setTab] = useState('meaning');
  const [foldersOpen, setFoldersOpen] = useState(false);
  const [newFolder, setNewFolder] = useState('');
  const vocabulary = useDictionaryVocabulary(user?.id, Boolean(active && request && foldersOpen));
  const panelRef = useRef(null);

  useEffect(() => { setRequest(null); setNewFolder(''); }, [user?.id, active]);

  useEffect(() => {
    if (!active) return undefined;
    const openSelection = event => {
      if (event.type === 'pointerup' && event.pointerType !== 'touch') return;
      if (ignoredTarget(event.target) || panelRef.current?.contains(event.target)) return;
      const selection = window.getSelection();
      const word = cleanWord(selection?.toString());
      if (!word || word.length > 60 || !/^[a-z]+(?:['-][a-z]+)*$/i.test(word)) return;
      const range = selection.rangeCount ? selection.getRangeAt(0) : null;
      const rect = range?.getBoundingClientRect();
      setRequest({ word, nonce: 0, x: Math.min(window.innerWidth - 20, Math.max(20, rect?.left ?? event.clientX ?? 20)),
        y: Math.min(window.innerHeight - 20, Math.max(20, rect?.bottom ?? event.clientY ?? 20)) });
      setTab('meaning');
      setFoldersOpen(false);
    };
    document.addEventListener('dblclick', openSelection);
    document.addEventListener('pointerup', openSelection);
    return () => { document.removeEventListener('dblclick', openSelection); document.removeEventListener('pointerup', openSelection); };
  }, [active]);

  useEffect(() => {
    if (!request?.word) return undefined;
    const controller = new AbortController();
    setState({ word: request.word, loading: true, data: null, error: '' });
    lookup(request.word, controller.signal, request.nonce > 0)
      .then(data => { if (!controller.signal.aborted) setState({ word: request.word, loading: false, data, error: '' }); })
      .catch(error => {
        if (controller.signal.aborted || error.name === 'AbortError' || error.code === 'ERR_CANCELED') return;
        setState({
          loading: false,
          data: null,
          error: normalizeApiError(error, t('dictionary.lookupFailed')).message,
        });
      });
    return () => controller.abort();
  }, [request?.nonce, request?.word, t]);

  useEffect(() => {
    if (!request) return undefined;
    const closeOutside = event => {
      if (!panelRef.current?.contains(event.target)) setRequest(null);
    };
    const closeWithEscape = event => {
      if (event.key === 'Escape') setRequest(null);
    };
    document.addEventListener('pointerdown', closeOutside, true);
    document.addEventListener('keydown', closeWithEscape);
    return () => {
      document.removeEventListener('pointerdown', closeOutside, true);
      document.removeEventListener('keydown', closeWithEscape);
    };
  }, [request]);

  const entry = state.data?.entries?.[0];
  const meanings = useMemo(() => entry?.meanings ?? [], [entry]);
  const translations = useMemo(() => dictionaryVietnameseTranslations(state.data), [state.data]);
  const audio = entry?.phonetics?.find(item => item.audio)?.audio;
  const apiExamples = meanings.flatMap(item => item.definitions ?? []).filter(item => item.example).map(item => item.example);
  const examples = [...new Set([...(state.data?.examples ?? []), ...apiExamples].filter(Boolean))];
  const synonyms = [...new Set(meanings.flatMap(item => item.synonyms ?? []))];
  if (!active || !request) return null;

  const speakWord = () => {
    if (!window.speechSynthesis) return;
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(request.word);
    utterance.lang = 'en-US';
    utterance.rate = 0.86;
    window.speechSynthesis.speak(utterance);
  };
  const playAudio = () => {
    if (!audio) return speakWord();
    const source = audio.startsWith('//') ? `https:${audio}` : audio;
    void new Audio(source).play().catch(speakWord);
  };
  const retryLookup = () => {
    LOOKUP_CACHE.delete(request.word);
    setRequest(current => ({ ...current, nonce: (current.nonce ?? 0) + 1 }));
  };
  const createFolder = async () => {
    const name = newFolder.trim().replace(/\s+/g, ' ');
    if (!name || name.length > 40) return;
    if (await vocabulary.addFolder(name)) setNewFolder('');
  };
  const item = dictionaryWordItem(request.word, state.data);
  const canSave = user?.id && state.word === request.word && !state.loading && !state.error && item.meaning
    && vocabulary.ready && !vocabulary.loading && !vocabulary.loadError && !vocabulary.pending;
  const defaultFolder = vocabulary.topics.find(folder => folder.name.toLowerCase() === DEFAULT_VOCABULARY_FOLDER.toLowerCase());
  const feedback = vocabulary.feedback;
  const feedbackVisible = feedback && (feedback.word === null || feedback.word === request.word);
  const lookupRelatedWord = word => {
    const nextWord = word?.trim().toLowerCase();
    if (!nextWord || nextWord.length > 60 || !/^[a-z]+(?:[ '-][a-z]+)*$/i.test(nextWord)) return;
    setRequest(current => ({ ...current, word: nextWord, nonce: 0 }));
    setTab('meaning');
    setFoldersOpen(false);
  };

  return <section ref={panelRef} className={styles.popover} role="dialog" aria-label={ui("Dictionary definition for {{value0}}", {value0:(request.word)})}
    style={{ '--anchor-x': `${request.x}px`, '--anchor-y': `${request.y}px` }}>
    <header>
      <div><h2>{request.word}</h2><p>{entry?.phonetic || entry?.phonetics?.find(item => item.text)?.text || ''}</p></div>
      <div className={styles.headerActions}>
        <button type="button" onClick={playAudio} title={t('dictionary.listen')}><Volume2 /></button>
        <button type="button" onClick={retryLookup} title={t('dictionary.retry')}><RotateCcw /></button>
        <button type="button" onClick={() => setRequest(null)} title={t('dictionary.close')}><X /></button>
      </div>
    </header>
    <nav aria-label={t('dictionary.sections')}>
      {['meaning', 'examples', 'synonyms'].map(id =>
        <button type="button" key={id} className={tab === id ? styles.activeTab : ''} onClick={() => setTab(id)}>{t(`dictionary.${id}`)}</button>)}
    </nav>
    <div className={styles.content}>
      {state.loading && <p>{t('dictionary.loading')}</p>}
      {state.error && <p className={styles.error}>{ui.error(state.error)}</p>}
      {!state.loading && !state.error && tab === 'meaning' && <>
        {translations.length ? translations.map(translation => <article key={translation.partOfSpeech}>
          <span>{t(`dictionary.parts.${translation.partOfSpeech}`, { defaultValue: translation.partOfSpeech })}</span>
          <div className={styles.senses}>
            {translation.terms.slice(0, 3).map((term, index) => <div className={styles.sense} key={`${translation.partOfSpeech}-${term}`}>
              <small>{index + 1}</small><strong>{term}</strong>
            </div>)}
          </div>
        </article>) : <p>{t('dictionary.noVietnameseMeaning')}</p>}
      </>}
      {!state.loading && tab === 'examples' && (examples.length ? examples.map((example, index) => <p className={styles.example} key={index}>“{example}”</p>) : <p>{t('dictionary.noExamples')}</p>)}
      {!state.loading && tab === 'synonyms' && (synonyms.length ? <div className={styles.chips}>{synonyms.map(word =>
        <button type="button" key={word} onClick={() => lookupRelatedWord(word)}>{word}</button>)}</div> : <p>{t('dictionary.noSynonyms')}</p>)}
    </div>
    <footer>
      <button type="button" className={styles.folderToggle} onClick={() => setFoldersOpen(open => !open)}>
        <BookOpen /><span>{t('dictionary.addToVocabulary')}</span>{foldersOpen ? <ChevronUp /> : <ChevronDown />}
      </button>
      {foldersOpen && <div className={styles.folders}>
        {!user?.id ? <p className={styles.error}>{t('dictionary.loginToSave')}</p> : <>
          {vocabulary.loading && <p role="status">{t('dictionary.loadingFolders')}</p>}
          {vocabulary.loadError && <div role="alert"><p className={styles.error}>{ui.error(normalizeApiError(vocabulary.loadError, t('dictionary.foldersFailed')).message)}</p>
            <button type="button" onClick={vocabulary.retry}>{t('dictionary.retryFolders')}</button></div>}
          {!vocabulary.loading && !vocabulary.loadError && <>
            {[...vocabulary.topics.filter(folder => folder.id !== defaultFolder?.id),
              { id: defaultFolder?.id ?? null, name: t('dictionary.myVocabulary') }].map(folder => {
              const saved = hasDictionaryWord(vocabulary.words, folder.id, request.word);
              return <button type="button" key={folder.id ?? 'default'} disabled={!canSave || saved}
                title={saved ? t('dictionary.alreadySaved') : t('dictionary.saveToFolder', { folder: folder.name })}
                onClick={() => void vocabulary.save(folder.id, item)}><span>{folder.name}</span>{saved ? <Check /> : <Plus />}</button>;
            })}
            {!state.loading && !state.error && !item.meaning && <p className={styles.error}>{t('dictionary.meaningRequired')}</p>}
          </>}
          {vocabulary.pending && <p role="status">{t('dictionary.savingVocabulary')}</p>}
          {feedbackVisible && <p role={feedback.kind === 'error' ? 'alert' : 'status'} className={feedback.kind === 'error' ? styles.error : styles.success}>
            {feedback.kind === 'error' ? ui.error(normalizeApiError(feedback.error, t('dictionary.saveFailed')).message)
              : t(feedback.word === null ? 'dictionary.folderCreated' : 'dictionary.wordSaved')}</p>}
          <div className={styles.newFolder}><FolderPlus /><input value={newFolder} maxLength={40} aria-label={t('dictionary.folderName')}
            disabled={!vocabulary.ready || vocabulary.pending || vocabulary.loading || Boolean(vocabulary.loadError)}
            onChange={event => setNewFolder(event.target.value)} onKeyDown={event => { if (event.key === 'Enter') { event.preventDefault(); void createFolder(); } }} placeholder={t('dictionary.folderName')} />
            <button type="button" title={t('dictionary.createFolder')} onClick={() => void createFolder()}
              disabled={!newFolder.trim() || !vocabulary.ready || vocabulary.pending || vocabulary.loading || Boolean(vocabulary.loadError)}><Plus /></button></div>
        </>}
      </div>}
    </footer>
  </section>;
}
