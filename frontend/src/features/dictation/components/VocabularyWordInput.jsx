import { useEffect, useId, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Search } from 'lucide-react';
import api from '../../../services/api';
import { API_ENDPOINTS } from '../../../services/endpoint';
import styles from './VocabularyWordInput.module.css';

const validWord = word => word.length >= 2 && word.length <= 60 && /^[a-z]+(?:[ '-][a-z]+)*$/i.test(word);

export default function VocabularyWordInput({ item, knownWords, onChange, onResolved }) {
  const { t } = useTranslation();
  const inputId = useId();
  const listId = `${inputId}-suggestions`;
  const requestRef = useRef(null);
  const [focused, setFocused] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const [remote, setRemote] = useState({ query: '', words: [], loading: false, unavailable: false });
  const [lookupState, setLookupState] = useState({ loading: false, message: '' });
  const query = item.word.trim().toLowerCase();
  const canLookup = validWord(query);

  useEffect(() => {
    if (!focused || !canLookup) return undefined;
    const controller = new AbortController();
    const timer = window.setTimeout(async () => {
      setRemote({ query, words: [], loading: true, unavailable: false });
      try {
        const { data } = await api.get(API_ENDPOINTS.dictionary.suggestions, {
          params: { q: query }, signal: controller.signal, notifyOnError: false,
        });
        if (!controller.signal.aborted) setRemote({ query, words: data.words || [], loading: false, unavailable: Boolean(data.unavailable) });
      } catch {
        if (!controller.signal.aborted) setRemote({ query, words: [], loading: false, unavailable: true });
      }
    }, 350);
    return () => { window.clearTimeout(timer); controller.abort(); };
  }, [query, focused, canLookup]);

  useEffect(() => () => requestRef.current?.abort(), []);

  const suggestions = useMemo(() => {
    if (!canLookup) return [];
    const local = knownWords.filter(word => word.word.toLowerCase().includes(query))
      .sort((a, b) => Number(b.word.toLowerCase().startsWith(query)) - Number(a.word.toLowerCase().startsWith(query)));
    const unique = new Map();
    for (const word of local) {
      const key = word.word.trim().toLowerCase();
      if (!unique.has(key)) unique.set(key, { word: key, meaning: word.meaning || '' });
    }
    for (const word of remote.query === query ? remote.words : []) {
      if (!unique.has(word)) unique.set(word, { word, meaning: '' });
    }
    return [...unique.values()].slice(0, 8);
  }, [query, canLookup, knownWords, remote]);

  const lookup = async (word) => {
    requestRef.current?.abort();
    const controller = new AbortController();
    requestRef.current = controller;
    const snapshot = { ...item };
    const savedWord = knownWords.find(entry => entry.word.trim().toLowerCase() === word);
    onChange(word);
    setFocused(false);
    setActiveIndex(-1);
    setLookupState({ loading: true, message: '' });
    try {
      const { data } = await api.get(API_ENDPOINTS.dictionary.lookup(word), {
        signal: controller.signal, notifyOnError: false,
      });
      if (controller.signal.aborted) return;
      const translation = data.translations?.[0];
      onResolved(word, {
        pronunciation: data.entries?.[0]?.phonetic || savedWord?.pronunciation || '',
        type: translation?.partOfSpeech || savedWord?.type || '',
        meaning: translation?.terms?.join('; ') || savedWord?.meaning || '',
        example: data.examples?.[0] || savedWord?.example || '',
      }, snapshot);
      setLookupState({ loading: false, message: t('dictation.wordLookupDone') });
    } catch {
      if (!controller.signal.aborted) {
        if (savedWord) onResolved(word, savedWord, snapshot);
        setLookupState({ loading: false, message: t(savedWord ? 'dictation.wordLookupDone' : 'dictation.wordLookupFailed') });
      }
    }
  };

  const expanded = focused && canLookup;
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
      <small>{remote.query !== query || remote.loading ? t('dictation.suggestionsLoading')
        : remote.unavailable ? t('dictation.suggestionsUnavailable')
          : suggestions.length ? t('dictation.chooseSuggestion') : t('dictation.noWordSuggestions')}</small>
    </div>}
    <p id={`${inputId}-status`} className={styles.status} role="status">
      {lookupState.loading ? t('dictation.wordLookupLoading') : lookupState.message || t('dictation.wordSuggestionHelp')}
    </p>
  </div>;
}
