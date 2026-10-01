import { useEffect, useMemo, useRef, useState } from 'react';
import { BookOpen, ChevronDown, ChevronUp, FolderPlus, Plus, RotateCcw, Volume2, X } from 'lucide-react';
import styles from './DictionaryPopover.module.css';
import { useTranslation } from 'react-i18next';
import api from '../../../services/api.js';
import { normalizeApiError } from '../../../services/apiError.js';
import { API_ENDPOINTS } from '../../../services/endpoint.js';

const INITIAL_FOLDERS = ['hello', 'test'];
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
  const { t } = useTranslation();
  const [request, setRequest] = useState(null);
  const [state, setState] = useState({ loading: false, data: null, error: '' });
  const [tab, setTab] = useState('meaning');
  const [foldersOpen, setFoldersOpen] = useState(false);
  const [folders, setFolders] = useState(INITIAL_FOLDERS);
  const [newFolder, setNewFolder] = useState('');
  const panelRef = useRef(null);

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
    setState({ loading: true, data: null, error: '' });
    lookup(request.word, controller.signal, request.nonce > 0)
      .then(data => setState({ loading: false, data, error: '' }))
      .catch(error => {
        if (error.name === 'AbortError' || error.code === 'ERR_CANCELED') return;
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
  const translations = useMemo(() => state.data?.translations ?? [], [state.data?.translations]);
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
  const createFolder = () => {
    const name = newFolder.trim();
    if (!name || folders.some(folder => folder.toLowerCase() === name.toLowerCase())) return;
    setFolders(current => [...current, name]);
    setNewFolder('');
  };
  const lookupRelatedWord = word => {
    const nextWord = word?.trim().toLowerCase();
    if (!nextWord || nextWord.length > 60 || !/^[a-z]+(?:[ '-][a-z]+)*$/i.test(nextWord)) return;
    setRequest(current => ({ ...current, word: nextWord, nonce: 0 }));
    setTab('meaning');
    setFoldersOpen(false);
  };

  return <section ref={panelRef} className={styles.popover} role="dialog" aria-label={`Dictionary definition for ${request.word}`}
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
      {state.error && <p className={styles.error}>{state.error}</p>}
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
        {[...folders, t('dictionary.myVocabulary')].map(folder => <button type="button" key={folder} onClick={() => setFoldersOpen(false)}><span>{folder}</span><Plus /></button>)}
        <div className={styles.newFolder}><FolderPlus /><input value={newFolder} onChange={event => setNewFolder(event.target.value)} placeholder={t('dictionary.folderName')} />
          <button type="button" onClick={createFolder} disabled={!newFolder.trim()}><Plus /></button></div>
      </div>}
    </footer>
  </section>;
}
