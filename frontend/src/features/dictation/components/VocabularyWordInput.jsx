import { useEffect, useId, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Search } from 'lucide-react';
import api from '../../../services/api';
import { API_ENDPOINTS } from '../../../services/endpoint';
import styles from './VocabularyWordInput.module.css';

const validWord = word => word.length >= 2 && word.length <= 60 && /^[a-z]+(?:[ '-][a-z]+)*$/i.test(word);
// Guard automatic fills from both API results and previously saved mixed meanings.
const vietnameseMeaning = value => typeof value === 'string' ? [...new Set(value.split(/[;\r\n]+/)
  .map(term => term.trim().normalize('NFC'))
  .filter(term => /\p{L}/u.test(term) && !/[^\p{Script=Latin}\p{M}\p{N}\p{P}\p{Zs}]/u.test(term)))].join('; ') : '';
const cacheResult = (cache, key, value) => {
  if (cache.size >= 100) cache.delete(cache.keys().next().value);
  cache.set(key, { value, expiresAt: Date.now() + 5 * 60_000 });
};
const cachedResult = (cache, key) => {
  const cached = cache.get(key);
  return cached?.expiresAt > Date.now() ? cached.value : undefined;
};

export default function VocabularyWordInput({ item, knownWords, onChange, onResolved }) {
  const { t } = useTranslation();
  const inputId = useId();
  const listId = `${inputId}-suggestions`;
  const requestRef = useRef(null);
  const [suggestionCache, setSuggestionCache] = useState(() => new Map());
  const lookupCache = useRef(new Map());
  const [focused, setFocused] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const [remote, setRemote] = useState({ query: '', words: [], loading: false, unavailable: false });
  const [lookupState, setLookupState] = useState({ loading: false, message: '' });
  const query = item.word.trim().toLowerCase();
  const canLookup = validWord(query);

  useEffect(() => {
    if (!focused || !canLookup) return undefined;
    const cached = cachedResult(suggestionCache, query);
    if (cached) return undefined;
    const controller = new AbortController();
    const timer = window.setTimeout(async () => {
      setRemote({ query, words: [], loading: true, unavailable: false });
      try {
        const { data } = await api.get(API_ENDPOINTS.dictionary.suggestions, {
          params: { q: query }, signal: controller.signal, timeout: 5_000, notifyOnError: false,
        });
        if (!controller.signal.aborted) {
          if (!data.unavailable) setSuggestionCache(current => {
            const updated = new Map(current);
            cacheResult(updated, query, data.words || []);
            return updated;
          });
          setRemote({ query, words: data.words || [], loading: false, unavailable: Boolean(data.unavailable) });
        }
      } catch {
        if (!controller.signal.aborted) setRemote({ query, words: [], loading: false, unavailable: true });
      }
    }, 180);
    return () => { window.clearTimeout(timer); controller.abort(); };
  }, [query, focused, canLookup, suggestionCache]);

  useEffect(() => () => requestRef.current?.abort(), []);

  const suggestions = useMemo(() => {
    if (!query || !/^[a-z]+(?:[ '-][a-z]+)*$/i.test(query)) return [];
    const local = knownWords.filter(word => word.word.toLowerCase().includes(query))
      .sort((a, b) => Number(b.word.toLowerCase().startsWith(query)) - Number(a.word.toLowerCase().startsWith(query)));
    const unique = new Map();
    for (const word of local) {
      const key = word.word.trim().toLowerCase();
      if (!unique.has(key)) unique.set(key, { word: key, meaning: vietnameseMeaning(word.meaning) });
    }
    let online = remote.query === query ? remote.words : [];
    // Keep matching cached suggestions visible while a longer prefix is loading.
    if (remote.query !== query || remote.loading) {
      for (let length = query.length; length >= 2; length -= 1) {
        const cached = cachedResult(suggestionCache, query.slice(0, length));
        if (cached) { online = cached.filter(word => word.includes(query)); break; }
      }
    }
    for (const word of online) {
      if (!unique.has(word)) unique.set(word, { word, meaning: '' });
    }
    return [...unique.values()].slice(0, 8);
  }, [query, knownWords, remote, suggestionCache]);

  const lookup = async (word) => {
    requestRef.current?.abort();
    const controller = new AbortController();
    requestRef.current = controller;
    const snapshot = { ...item };
    const savedEntry = knownWords.find(entry => entry.word.trim().toLowerCase() === word);
    const savedWord = savedEntry ? { ...savedEntry, meaning: vietnameseMeaning(savedEntry.meaning) } : undefined;
    onChange(word);
    setFocused(false);
    setActiveIndex(-1);
    const finish = fields => {
      fields = { ...fields, meaning: vietnameseMeaning(fields.meaning) };
      onResolved(word, fields, snapshot);
      setLookupState({ loading: false, message: t(fields.pronunciation && fields.meaning && fields.example
        ? 'dictation.wordLookupDone' : 'dictation.wordLookupPartial') });
    };
    const cached = cachedResult(lookupCache.current, word);
    if (cached) { finish(cached); return; }
    // Saved details are available immediately; fetch only to enrich missing fields.
    if (savedWord) {
      if (savedWord.pronunciation && savedWord.meaning && savedWord.example && savedWord.type) {
        finish(savedWord);
        return;
      }
      onResolved(word, savedWord, snapshot);
    }
    setLookupState({ loading: true, message: '' });
    try {
      const { data } = await api.get(API_ENDPOINTS.dictionary.lookup(word), {
        signal: controller.signal, timeout: 6_000, notifyOnError: false,
      });
      if (controller.signal.aborted) return;
      const translation = data.translations?.[0];
      const entries = data.entries || [];
      const phonetic = entries.flatMap(entry => [entry.phonetic, ...(entry.phonetics || []).map(value => value.text)])
        .find(value => typeof value === 'string' && value.trim());
      const example = data.examples?.find(value => typeof value === 'string' && value.trim())
        || entries.flatMap(entry => (entry.meanings || []).flatMap(meaning => (meaning.definitions || [])
          .map(definition => definition.example))).find(value => typeof value === 'string' && value.trim());
      const fields = {
        pronunciation: phonetic || savedWord?.pronunciation || '',
        type: translation?.partOfSpeech || entries[0]?.meanings?.[0]?.partOfSpeech || savedWord?.type || '',
        meaning: vietnameseMeaning(translation?.terms?.join('; ')) || savedWord?.meaning || '',
        example: example || savedWord?.example || '',
      };
      if (fields.pronunciation && fields.meaning && fields.example) cacheResult(lookupCache.current, word, fields);
      finish(fields);
    } catch {
      if (!controller.signal.aborted) {
        if (savedWord) finish(savedWord);
        else setLookupState({ loading: false, message: t('dictation.wordLookupFailed') });
      }
    }
  };

  const expanded = focused && (canLookup || suggestions.length > 0);
  return <div className={styles.field} onBlur={event => {
    if (!event.currentTarget.contains(event.relatedTarget)) setFocused(false);
  }}>
    <label htmlFor={inputId}>{t('dictation.englishWord')}</label>
    <div className={styles.inputRow}>
      <input id={inputId} autoFocus required autoComplete="off" maxLength={60} value={item.word}
        role="combobox" aria-autocomplete="list" aria-expanded={expanded}
        aria-controls={expanded ? listId : undefined}
        aria-activedescendant={expanded && activeIndex >= 0 && suggestions[activeIndex] ? `${listId}-${activeIndex}` : undefined}
        aria-describedby={`${inputId}-status`}
        onFocus={() => setFocused(true)}
        onChange={event => {
          requestRef.current?.abort();
          onChange(event.target.value);
          setFocused(true);
          setActiveIndex(-1);
          setLookupState({ loading: false, message: '' });
        }}
        onKeyDown={event => {
          if (event.key === 'Escape') { event.preventDefault(); setFocused(false); setActiveIndex(-1); }
          if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
            event.preventDefault();
            setFocused(true);
            if (suggestions.length) setActiveIndex(index => (index + (event.key === 'ArrowDown' ? 1 : -1) + suggestions.length) % suggestions.length);
          }
          if (event.key === 'Enter' && expanded) {
            event.preventDefault();
            lookup(suggestions[activeIndex]?.word || query);
          }
        }} placeholder={t('dictation.wordPlaceholder')} />
      <button type="button" disabled={!canLookup || lookupState.loading} onClick={() => lookup(query)}
        aria-label={t('dictation.lookupWord')} title={t('dictation.lookupWord')}><Search size={18} /></button>
    </div>
    {expanded && <div className={styles.suggestions}>
      <div className={styles.heading}>{t('dictation.similarWords')}</div>
      <ul id={listId} role="listbox" aria-label={t('dictation.similarWords')}>
        {suggestions.map((suggestion, index) => <li key={suggestion.word} id={`${listId}-${index}`}
          role="option" aria-selected={index === activeIndex}>
          <button type="button" tabIndex={-1} className={index === activeIndex ? styles.active : ''}
            onMouseDown={event => event.preventDefault()} onClick={() => lookup(suggestion.word)}>
            <strong>{suggestion.word}</strong>{suggestion.meaning && <span>{suggestion.meaning}</span>}
          </button>
        </li>)}
      </ul>
      <small>{!canLookup ? t('dictation.wordSuggestionHelp')
        : !cachedResult(suggestionCache, query) && (remote.query !== query || remote.loading) ? t('dictation.suggestionsLoading')
        : remote.query === query && remote.unavailable ? t('dictation.suggestionsUnavailable')
          : suggestions.length ? t('dictation.chooseSuggestion') : t('dictation.noWordSuggestions')}</small>
    </div>}
    <p id={`${inputId}-status`} className={styles.status} role="status">
      {lookupState.loading ? t('dictation.wordLookupLoading') : lookupState.message || t('dictation.wordSuggestionHelp')}
    </p>
  </div>;
}
