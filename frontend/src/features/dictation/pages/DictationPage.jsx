import Pagination from '../../../components/common/Pagination';
import AnswerSelect from '../../../components/common/AnswerSelect';
import ConfirmModal from '../../../components/common/ConfirmModal';
import { useEffect, useRef, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { ArrowLeftRight, BookOpen, Check, ChevronLeft, ChevronRight, CircleHelp, Eye, FolderOpen, Headphones, Lightbulb, List, Pencil, Play, Plus, Search, RotateCcw, Shuffle, Trash2, Volume2, X } from 'lucide-react';
import { useAuth } from '../../../context/AuthContext';
import { useStudyData } from '../hooks/useStudyData';
import { studyApi } from '../services/studyApi';
import { hasLegacyStudyData, readLegacyStudyData } from '../utils/legacyStudyImport';
import { normalizeApiError } from '../../../services/apiError';
import { useToast } from '../../../context/ToastContext';
import styles from './DictationPage.module.css';
import VocabularyWordInput from '../components/VocabularyWordInput';

const positiveQueryInt = (value, fallback, maximum = 100) => {
  const parsed = Number.parseInt(value, 10);
  return Number.isInteger(parsed) && parsed > 0 && parsed <= maximum ? parsed : fallback;
};
const latestAccuracy = (attempt) => attempt?.lastAccuracy ?? attempt?.bestAccuracy ?? 0;

export default function DictationPage() {
  const { t } = useTranslation();
  const { showError, showSuccess, showInfo, dismissToast } = useToast();
  const { user, isAuthReady, authConnectionError, retryAuth } = useAuth();
  const { data, loading, error, saving, refresh, mutate } = useStudyData(user?.id);
  const { topics: availableTopics, words: allFlashcards, exercises: allExercises, progress, ratings: cardRatings } = data;
  const reportError = cause => showError(normalizeApiError(cause).message);
  const playbackCount = useRef(0);
  const submitRequest = useRef(null);
  const reviewRequest = useRef(null);
  const createRequest = useRef(null);
  const deleteRequest = useRef(false);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [importDone, setImportDone] = useState(false);
  const [searchParams, setSearchParams] = useSearchParams();
  const requestedMode = searchParams.get('mode');
  const mode = ['browse', 'flashcard', 'quiz', 'matching', 'notebook'].includes(requestedMode) ? requestedMode : 'dictation';
  const requestedTopic = searchParams.get('topic');
  const notebookPage = positiveQueryInt(searchParams.get('page'), 1, Number.MAX_SAFE_INTEGER);
  const itemsPerPage = positiveQueryInt(searchParams.get('size'), mode === 'notebook' ? 4 : 6);
  const setNotebookPagination = patch => setSearchParams(current => {
    const next = new URLSearchParams(current);
    Object.entries(patch).forEach(([key, value]) => {
      if (value === '' || value == null) next.delete(key);
      else next.set(key, String(value));
    });
    return next;
  }, { replace: true });
  const setNotebookPage = page => setNotebookPagination({ page });
  const setItemsPerPage = size => setNotebookPagination({ size, page: 1 });
  const setMode = (nextMode) => setSearchParams(nextMode === 'dictation' ? {} : { mode: nextMode });
  const [exerciseIndex, setExerciseIndex] = useState(0);
  const [answer, setAnswer] = useState('');
  const [rate, setRate] = useState(1);
  const [result, setResult] = useState(null);
  const [showHint, setShowHint] = useState(false);
  const [showFullAnswer, setShowFullAnswer] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [cardIndex, setCardIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);
  const [quizIndex, setQuizIndex] = useState(0);
  const [quizAnswer, setQuizAnswer] = useState('');
  const [quizScore, setQuizScore] = useState(0);
  const [matchingWord, setMatchingWord] = useState('');
  const [matchedCards, setMatchedCards] = useState([]);
  const notebookTab = searchParams.get('tab') === 'sentences' ? 'sentences' : 'words';
  const topicQuery = searchParams.get('q') || '';
  const notebookQuery = searchParams.get('q') || '';
  const notebookTopic = searchParams.get('filterTopic') || 'All topics';
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [showTopicCreator, setShowTopicCreator] = useState(false);
  const [newTopicName, setNewTopicName] = useState('');
  const [notebookNotice, setNotebookNotice] = useState('');
  const [createType, setCreateType] = useState('word');
  const [editingItemId, setEditingItemId] = useState(null);
  const [newItem, setNewItem] = useState({ word: '', pronunciation: '', type: 'noun', topic: '', meaning: '', example: '' });
  const textareaRef = useRef(null);
  const selectedTopic = availableTopics.find((topic) => topic.id === requestedTopic || topic.legacyId === requestedTopic) || null;
  const activeExercises = selectedTopic ? allExercises.filter((item) => item.folderId === selectedTopic.id) : [];
  const activeFlashcards = selectedTopic ? allFlashcards.filter((item) => item.folderId === selectedTopic.id) : [];
  const visibleTopics = availableTopics.filter((topic) => {
    const searchableText = `${topic.name} ${topic.description || ''}`.toLowerCase();
    return searchableText.includes(topicQuery.trim().toLowerCase());
  });
  const topicPageCount = Math.max(1, Math.ceil(visibleTopics.length / itemsPerPage));
  const currentTopicPage = Math.min(notebookPage, topicPageCount);
  const paginatedTopics = visibleTopics.slice((currentTopicPage - 1) * itemsPerPage, currentTopicPage * itemsPerPage);
  const exercise = activeExercises[exerciseIndex] || activeExercises[0] || { id: null, transcript: '', title: '', accent: 'en-GB' };

  const hint = exercise.transcript.split(/\s+/).filter(Boolean).map(word => `${word[0]}${'_'.repeat(Math.max(1, word.length - 1))}`).join(' ');
  const transcriptWordCount = exercise.transcript.trim().split(/\s+/).filter(Boolean).length;

  useEffect(() => () => window.speechSynthesis?.cancel(), []);

  useEffect(() => {
    setExerciseIndex(0); setCardIndex(0); setQuizIndex(0); setQuizAnswer(''); setQuizScore(0);
    setMatchedCards([]); setMatchingWord(''); setIsFlipped(false); setShowCreateForm(false);
    setNotebookNotice(''); setAnswer(''); setResult(null); setShowHint(false); setShowFullAnswer(false);
    setIsSpeaking(false); setImportDone(false); window.speechSynthesis?.cancel();
    setDeleteTarget(null);
    submitRequest.current = null; reviewRequest.current = null; createRequest.current = null; playbackCount.current = 0;
  }, [user?.id]);

  useEffect(() => {
    if (saving || mode !== 'flashcard' || !activeFlashcards.length) return undefined;
    const handleKeyDown = (event) => {
      if (event.target instanceof HTMLInputElement || event.target instanceof HTMLTextAreaElement) return;
      if (event.code === 'Space') { event.preventDefault(); setIsFlipped((value) => !value); }
      if (event.key === 'ArrowLeft') { setCardIndex((current) => (current - 1 + activeFlashcards.length) % activeFlashcards.length); setIsFlipped(false); }
      if (event.key === 'ArrowRight') { setCardIndex((current) => (current + 1) % activeFlashcards.length); setIsFlipped(false); }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [mode, activeFlashcards.length, saving]);

  const speak = (playbackRate = rate, focusInput = true) => {
    if (!('speechSynthesis' in window)) return;
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(exercise.transcript);
    utterance.lang = exercise.accent;
    utterance.rate = playbackRate;
    utterance.onstart = () => setIsSpeaking(true);
    utterance.onend = () => setIsSpeaking(false);
    utterance.onerror = () => setIsSpeaking(false);
    window.speechSynthesis.speak(utterance);
    playbackCount.current += 1;
    if (focusInput) textareaRef.current?.focus();
  };

  const changePlaybackRate = (event) => {
    const nextRate = Number(event.target.value);
    const shouldResume = isSpeaking || window.speechSynthesis?.speaking || window.speechSynthesis?.pending;
    setRate(nextRate);
    if (shouldResume) speak(nextRate, false);
  };

  const checkAnswer = async () => {
    if (!answer.trim() || !exercise.id || saving) return;
    const dto = { exerciseId: exercise.id, typedText: answer, hintUsed: showHint || showFullAnswer,
      playbackRate: rate, playbackCount: playbackCount.current };
    const signature = JSON.stringify(dto);
    if (submitRequest.current?.signature !== signature) submitRequest.current = { signature, id: crypto.randomUUID() };
    try {
      const response = await mutate(() => studyApi.submit({ ...dto, clientEventId: submitRequest.current.id }));
      if (!response) return;
      setResult({ accuracy: Math.round(Number(response.data.accuracy)),
        words: response.feedback.wordResults.map(w => ({ word: w.target, correct: w.isCorrect })) });
      submitRequest.current = null;
    } catch (cause) { reportError(cause); }
  };

  const resetExercise = () => {
    if (saving) return;
    window.speechSynthesis?.cancel();
    setAnswer('');
    setResult(null);
    setShowHint(false);
    setShowFullAnswer(false);
    setIsSpeaking(false);
    playbackCount.current = 0;
    submitRequest.current = null;
  };

  const moveExercise = (direction) => {
    if (saving || !activeExercises.length) return;
    setExerciseIndex((current) => (current + direction + activeExercises.length) % activeExercises.length);
    resetExercise();
  };

  const currentProgress = progress[exercise.id];
  const currentCard = activeFlashcards[cardIndex] || activeFlashcards[0] || {};
  const currentQuizCard = activeFlashcards[quizIndex] || activeFlashcards[0] || {};
  const quizOptions = currentQuizCard.id
    ? [currentQuizCard, ...allFlashcards.filter((card) => card.id !== currentQuizCard.id).slice(0, 3)]
      .sort((left, right) => (parseInt(left.id.slice(-8), 16) + quizIndex) % 17 - (parseInt(right.id.slice(-8), 16) + quizIndex) % 17)
      .map((card) => ({ id: card.id, label: card.word })) : [];
  const matchingCards = activeFlashcards.slice(0, 8);
  const matchingMeanings = [...matchingCards].reverse();
  const notebookItems = notebookTab === 'sentences'
    ? allExercises.map((item) => ({ ...item, word: item.title, meaning: item.transcript, type: item.type || item.topic }))
    : allFlashcards;
  const notebookWordCount = allFlashcards.length;
  const reviewedFlashcardCount = allFlashcards.filter((item) => Boolean(cardRatings[item.id])).length;
  const flashcardProgress = allFlashcards.length
    ? Math.min(100, (reviewedFlashcardCount / allFlashcards.length) * 100)
    : 0;
  const filteredNotebookItems = notebookItems.filter((item) => {
    const matchesQuery = `${item.word} ${item.meaning} ${item.example || ''}`.toLowerCase().includes(notebookQuery.toLowerCase());
    const itemTopic = item.topic || 'Other';
    return matchesQuery && (notebookTopic === 'All topics' || itemTopic === notebookTopic);
  });
  const notebookPageCount = Math.max(1, Math.ceil(filteredNotebookItems.length / itemsPerPage));
  const currentNotebookPage = Math.min(notebookPage, notebookPageCount);
  const visibleNotebookItems = filteredNotebookItems.slice((currentNotebookPage - 1) * itemsPerPage, currentNotebookPage * itemsPerPage);

  const rateCard = async (rating) => {
    if (saving || !currentCard.id) return;
    const signature = `${currentCard.id}:${rating}`;
    if (reviewRequest.current?.signature !== signature) reviewRequest.current = { signature, id: crypto.randomUUID() };
    try {
      const response = await mutate(() => studyApi.review({ notebookItemId: currentCard.id,
        rating: rating === 'know' ? 'KNOWN' : 'LEARNING', clientEventId: reviewRequest.current.id }));
      if (!response) return;
      reviewRequest.current = null;
      if (rating === 'know') {
        showSuccess(t('dictation.savedKnown', { word: currentCard.word }));
      } else {
        showInfo(t('dictation.savedLearning', { word: currentCard.word }));
      }
      setIsFlipped(false);
      setCardIndex((current) => (current + 1) % activeFlashcards.length);
    } catch (cause) { reportError(cause); }
  };

  const shuffleCard = () => {
    if (activeFlashcards.length < 2) return;
    let nextIndex = cardIndex;
    while (nextIndex === cardIndex) nextIndex = Math.floor(Math.random() * activeFlashcards.length);
    setCardIndex(nextIndex);
    setIsFlipped(false);
  };

  const answerQuiz = (cardId) => {
    if (quizAnswer) return;
    setQuizAnswer(cardId);
    if (cardId === currentQuizCard.id) setQuizScore((score) => score + 1);
  };

  const nextQuiz = () => {
    setQuizIndex((current) => (current + 1) % activeFlashcards.length);
    setQuizAnswer('');
  };

  const selectMatchingMeaning = (cardId) => {
    if (!matchingWord || matchedCards.includes(cardId)) return;
    if (matchingWord === cardId) {
      setMatchedCards((cards) => [...cards, cardId]);
      setMatchingWord('');
      showSuccess(t('dictation.matchCorrect'));
    } else {
      showInfo(t('dictation.matchTryAgain'));
    }
  };

  const chooseTopic = (topicId, nextMode = mode) => {
    if (saving) return;
    setSearchParams(nextMode === 'dictation' ? { topic: topicId } : { mode: nextMode, topic: topicId });
    setExerciseIndex(0);
    setCardIndex(0);
    setQuizIndex(0);
    setQuizAnswer('');
    setQuizScore(0);
    setMatchingWord('');
    setMatchedCards([]);
    setIsFlipped(false);
    resetExercise();
  };

  const returnToTopics = () => {
    if (saving) return;
    setSearchParams(mode === 'dictation' ? {} : { mode: 'flashcard' });
    setExerciseIndex(0);
    setCardIndex(0);
    setQuizIndex(0);
    setQuizAnswer('');
    setQuizScore(0);
    setMatchingWord('');
    setMatchedCards([]);
    setIsFlipped(false);
    resetExercise();
  };

  const switchTopicMode = (nextMode) => {
    if (saving) return;
    if (nextMode === 'notebook') {
      setMode('notebook');
      return;
    }
    setSearchParams(nextMode === 'dictation'
      ? { topic: selectedTopic.id }
      : { mode: nextMode, topic: selectedTopic.id });
    setExerciseIndex(0);
    setCardIndex(0);
    setQuizIndex(0);
    setQuizAnswer('');
    setMatchingWord('');
    setMatchedCards([]);
    setIsFlipped(false);
    resetExercise();
  };

  const speakWord = (event) => {
    event.stopPropagation();
    if (!('speechSynthesis' in window)) return;
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(currentCard.word);
    utterance.lang = 'en-GB';
    utterance.rate = 0.85;
    window.speechSynthesis.speak(utterance);
  };

  const speakNotebookItem = (item) => {
    if (!('speechSynthesis' in window)) return;
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(item.word);
    utterance.lang = 'en-GB';
    utterance.rate = 0.85;
    window.speechSynthesis.speak(utterance);
  };

  const openCreateForm = (type = notebookTab === 'sentences' ? 'sentence' : 'word') => {
    createRequest.current = crypto.randomUUID();
    setEditingItemId(null);
    setCreateType(type);
    setNewItem({ word: '', pronunciation: '', type: type === 'word' ? 'noun' : 'Custom sentence', topic: availableTopics[0]?.name || '', meaning: '', example: '' });
    setShowTopicCreator(false);
    setNewTopicName('');
    dismissToast();
    setShowCreateForm(true);
  };

  const openEditForm = (item) => {
    const type = notebookTab === 'sentences' ? 'sentence' : 'word';
    setEditingItemId(item.notebookId || item.id);
    setCreateType(type);
    setNewItem({
      word: item.word || '',
      pronunciation: item.pronunciation || '',
      type: type === 'word' ? (item.type || 'noun') : 'Custom sentence',
      topic: item.topic || availableTopics[0]?.name || '',
      meaning: item.meaning || '',
      example: item.example || '',
      accent: item.accent || 'en-GB',
    });
    setShowTopicCreator(false);
    setNewTopicName('');
    dismissToast();
    setShowCreateForm(true);
  };

  const requestNotebookDelete = item => {
    if (saving || deleteRequest.current) return;
    setDeleteTarget({ item, type: notebookTab, owner: user.id });
  };
  const cancelNotebookDelete = () => {
    if (!deleteRequest.current) setDeleteTarget(null);
  };
  const deleteNotebookItem = async () => {
    if (saving || deleteRequest.current || !deleteTarget || deleteTarget.owner !== user?.id) return;
    const target = deleteTarget;
    const { item } = target;
    deleteRequest.current = true;
    try {
      const response = await mutate(() => studyApi.remove(item.notebookId || item.id));
      if (!response) return;
      setDeleteTarget(current => current === target ? null : current);
      setNotebookPage(1);
      setNotebookNotice(t('dictation.itemDeleted', { name: item.word }));
    } catch (cause) { reportError(cause); }
    finally { deleteRequest.current = false; }
  };

  const addCustomTopic = async () => {
    if (saving) return;
    const name = newTopicName.trim().replace(/\s+/g, ' ');
    if (!name) return;
    const existingTopic = availableTopics.find((topic) => topic.name.toLowerCase() === name.toLowerCase());
    if (existingTopic) {
      setNewItem((item) => ({ ...item, topic: existingTopic.name }));
    } else {
      try {
        const response = await mutate(() => studyApi.createTopic({ name, description: t('dictation.customTopicDescription') }));
        if (!response) return;
        setNewItem((item) => ({ ...item, topic: name }));
      } catch (cause) { reportError(cause); return; }
    }
    setNewTopicName('');
    dismissToast();
    setShowTopicCreator(false);
  };

  const toggleTopicCreator = () => {
    if (showTopicCreator) {
      setShowTopicCreator(false);
      setNewTopicName('');
      setNewItem((item) => ({ ...item, topic: item.topic || availableTopics[0]?.name || '' }));
      return;
    }
    setNewItem((item) => ({ ...item, topic: '' }));
    setNewTopicName('');
    dismissToast();
    setShowTopicCreator(true);
  };

  const createNotebookItem = async (event) => {
    event.preventDefault();
    if (saving) return;
    dismissToast();
    if (!newItem.topic) {
      showError(t('dictation.chooseTopicError'));
      return;
    }
    if (!newItem.word.trim() || !newItem.meaning.trim()) {
      showError(t(createType === 'word' ? 'dictation.wordRequired' : 'dictation.sentenceRequired'));
      return;
    }
    const item = {
      kind: createType === 'word' ? 'WORD' : 'SENTENCE',
      folderId: availableTopics.find(topic => topic.name === newItem.topic)?.id,
      word: newItem.word.trim(),
      pronunciation: newItem.pronunciation.trim(),
      meaning: newItem.meaning.trim(),
      example: newItem.example.trim(),
      type: newItem.type,
      ...(createType === 'sentence' ? { accent: newItem.accent || 'en-GB' } : {}),
    };
    try {
      const response = await mutate(() => editingItemId ? studyApi.update(editingItemId, item)
        : studyApi.create({ ...item, clientRequestId: createRequest.current }));
      if (!response) return;
      if (editingItemId) {
        setNotebookPagination({
          page: 1,
          ...(notebookTopic !== 'All topics' && notebookTopic !== newItem.topic ? { filterTopic: newItem.topic } : {}),
        });
        setShowCreateForm(false);
        setEditingItemId(null);
        setNotebookNotice(t('dictation.itemUpdated', { name: item.word }));
        return;
      }
      setNotebookPagination({ q: '', filterTopic: newItem.topic, tab: createType === 'word' ? 'words' : 'sentences', page: 1 });
      dismissToast();
      setShowCreateForm(false);
      setNotebookNotice(t(createType === 'word' ? 'dictation.wordAdded' : 'dictation.sentenceAdded', { topic: newItem.topic }));
    } catch (cause) { reportError(cause); }
  };

  const importLegacy = async () => {
    if (saving || !window.confirm(t('dictation.importConfirm', { email: user.email }))) return;
    try {
      const response = await mutate(() => studyApi.importBrowser(readLegacyStudyData(window.localStorage)));
      if (!response) return;
      window.localStorage.setItem(`aptimate.dictation.imported:${user.id}`, 'true');
      setImportDone(true);
      showSuccess(t('dictation.importComplete', { count: response.imported }));
    } catch (cause) { reportError(cause); }
  };

  const isTopicLanding = (mode !== 'notebook' && !selectedTopic) || mode === 'notebook';
  const topicStudyHeader = selectedTopic ? (
    <header className={styles.selectedTopicHeader}>
      <div className={styles.selectedTopicTitle}>
        <button type="button" onClick={returnToTopics} aria-label={t('dictation.backToTopics')}><ChevronLeft /></button>
        <div><span>{t('dictation.aptisGeneral')}</span><h1>{selectedTopic.name}</h1></div>
      </div>
      <nav className={styles.selectedTopicModes} aria-label={t('dictation.studyModes')}>
        <button type="button" className={mode === 'dictation' ? styles.activeStudyMode : ''} onClick={() => switchTopicMode('dictation')}><Headphones /> {t('dictation.dictation')}</button>
        <button type="button" className={mode === 'browse' ? styles.activeStudyMode : ''} onClick={() => switchTopicMode('browse')}><List /> {t('dictation.browseWords')}</button>
        <button type="button" className={mode === 'flashcard' ? styles.activeStudyMode : ''} onClick={() => switchTopicMode('flashcard')}><BookOpen /> {t('dictation.flashcard')}</button>
        <button type="button" className={mode === 'quiz' ? styles.activeStudyMode : ''} onClick={() => switchTopicMode('quiz')}><CircleHelp /> {t('dictation.quiz')}</button>
        <button type="button" className={mode === 'matching' ? styles.activeStudyMode : ''} onClick={() => switchTopicMode('matching')}><ArrowLeftRight /> {t('dictation.matching')}</button>
      </nav>
    </header>
  ) : null;

  if (!isAuthReady || loading) return <main className={styles.practiceCard}>{t('common.loading')}</main>;
  if (authConnectionError || error) return <main className={styles.practiceCard}><p>{t('dictation.loadError')}</p><button className={styles.secondaryButton} onClick={() => authConnectionError ? retryAuth() : refresh().catch(() => {})}>{t('common.tryAgain')}</button></main>;
  if (!user) return <main className={styles.practiceCard}><p>{t('dictation.signInRequired')}</p><Link to="/login">{t('profile.signIn')}</Link></main>;
  if (selectedTopic && mode !== 'notebook' && !(mode === 'dictation' ? activeExercises.length : activeFlashcards.length)) return <div className={styles.page}>{topicStudyHeader}<main className={styles.practiceCard}><p>{t('dictation.noContent')}</p><button className={styles.secondaryButton} onClick={() => setMode('notebook')}>{t('dictation.notebook')}</button></main></div>;
  const canImport = !importDone && !window.localStorage.getItem(`aptimate.dictation.imported:${user.id}`) && hasLegacyStudyData(window.localStorage);

  return (
    <><div className={`${styles.page} ${isTopicLanding ? styles.topicLandingPage : ''}`} inert={saving ? '' : undefined}>
      {canImport && <div className={styles.importNotice}><p>{t('dictation.importHelp')}</p><button className={styles.secondaryButton} disabled={saving} onClick={importLegacy}>{t('dictation.importBrowser')}</button></div>}
      {saving && <p role="status" className={styles.savingNotice}>{t('dictation.saving')}</p>}
      {mode !== 'notebook' && !selectedTopic ? (
        <main className={styles.topicLanding}>
          <div className={styles.topicContent}>
            <nav className={styles.topicModeTabs} aria-label={t('dictation.studyModes')}>
              <button type="button" className={mode === 'dictation' ? styles.activeTopicMode : ''} onClick={() => setMode('dictation')}>
                <Headphones /> {t('dictation.dictation')}
              </button>
              <button type="button" className={mode === 'flashcard' ? styles.activeTopicMode : ''} onClick={() => setMode('flashcard')}>
                <BookOpen /> {t('dictation.flashcard')}
              </button>
              <button type="button" className={mode === 'notebook' ? styles.activeTopicMode : ''} onClick={() => setMode('notebook')}>
                <FolderOpen /> {t('dictation.notebook')}
              </button>
            </nav>

            <label className={styles.topicSearch}>
              <Search />
              <input
                value={topicQuery}
                onChange={(event) => setNotebookPagination({ q: event.target.value, page: 1 })}
                placeholder={t('dictation.searchTopic')}
                aria-label={t('dictation.searchTopicLabel')}
              />
            </label>

            <section className={styles.topicGrid} aria-label={`${mode} topics`}>
            {paginatedTopics.map((topic) => {
              const lessons = allExercises.filter((item) => item.folderId === topic.id);
              const cards = allFlashcards.filter((item) => item.folderId === topic.id);
              const completedLessons = lessons.filter((item) => progress[item.id]).length;
              const reviewedCards = cards.filter((item) => cardRatings[item.id]).length;
              const completed = mode === 'dictation' ? completedLessons : reviewedCards;
              const total = mode === 'dictation' ? lessons.length : cards.length;

              return (
                <article key={topic.id} className={`${styles.topicFolder} ${!total ? styles.emptyTopic : ''}`}>
                  <span className={styles.topicCollection}>{t(topic.is_system ? 'dictation.aptisCollection' : 'dictation.myCollection')}</span>
                  <div className={styles.topicCopy}>
                    <strong>{topic.name}</strong>
                    <small>{topic.description}</small>
                  </div>
                  <div className={styles.topicSummary}>
                    <span>{t(mode === 'dictation' ? 'dictation.lessonCount' : 'dictation.cardCount', { count: total })}</span>
                    <span>{total ? t('dictation.completedCount', { completed, total }) : t('dictation.noContent')}</span>
                  </div>
                  <span className={styles.topicProgress}><span style={{ width: `${total ? (completed / total) * 100 : 0}%` }} /></span>
                  <div className={styles.topicActions}>
                    <button type="button" onClick={() => chooseTopic(topic.id, mode === 'dictation' ? 'dictation' : 'browse')} disabled={!total}><Eye /> {t('dictation.quickView')}</button>
                    <button type="button" onClick={() => chooseTopic(topic.id)} disabled={!total}><Play /> {t('dictation.practise')}</button>
                  </div>
                </article>
              );
            })}
            </section>
            {!visibleTopics.length && <div className={styles.emptyTopicSearch}><Search /><strong>{t('dictation.noTopics')}</strong><span>{t('dictation.tryAnotherKeyword')}</span></div>}
            {visibleTopics.length > 0 && <div className={styles.topicPagination}>
              <Pagination page={currentTopicPage} totalItems={visibleTopics.length} pageSize={itemsPerPage} onPageChange={setNotebookPage} onPageSizeChange={setItemsPerPage} />
            </div>}
          </div>
        </main>
      ) : mode === 'dictation' ? <>
        {topicStudyHeader}
        <div className={styles.layout}>
        <aside className={styles.lessonList}>
          <h2>{t('dictation.lessons')}</h2>
          {activeExercises.map((item, index) => (
            <button key={item.id} disabled={saving} className={index === exerciseIndex ? styles.activeLesson : ''} onClick={() => { setExerciseIndex(index); resetExercise(); }}>
              <span className={styles.lessonNumber}>{index + 1}</span>
              <span><strong>{item.title}</strong><small>{item.topic}</small></span>
              {progress[item.id] && <span className={styles.best}>{latestAccuracy(progress[item.id])}%</span>}
            </button>
          ))}
        </aside>

        <main className={styles.practiceCard}>
          <div className={styles.cardHeader}>
            <div><span>{t('dictation.lesson', { number: exerciseIndex + 1 })}</span><h2>{exercise.title}</h2></div>
          </div>

          <div className={styles.player}>
            <button className={styles.playButton} onClick={() => speak()} aria-label={t('dictation.playSentence')}><Volume2 className={isSpeaking ? styles.pulse : ''} /></button>
            <div><strong>{t(isSpeaking ? 'dictation.playingSentence' : 'dictation.readyToListen')}</strong><div className={styles.playerMeta}><span>{t(exercise.accent === 'en-GB' ? 'dictation.britishEnglish' : 'dictation.americanEnglish')}</span><span>{t('dictation.totalWordHint', { count: transcriptWordCount })}</span></div></div>
            <label>{t('dictation.speed')}<AnswerSelect value={rate} onChange={changePlaybackRate} options={[{value:.7,label:'0.7×'},{value:.85,label:'0.85×'},{value:1,label:'1×'},{value:1.15,label:'1.15×'}]} ariaLabel={t('dictation.playbackSpeed')}/></label>
          </div>

          <label className={styles.answerLabel} htmlFor="dictation-answer">{t('dictation.typeWhatYouHear')}</label>
          <textarea id="dictation-answer" ref={textareaRef} disabled={saving} maxLength={5000} value={answer} onChange={(event) => { setAnswer(event.target.value); setResult(null); }} placeholder={t('dictation.answerPlaceholder')} rows={5} />

          <div className={styles.actions}>
            <button className={styles.secondaryButton} onClick={() => setShowHint((value) => !value)}><Lightbulb size={17} /> {t('dictation.hint')}</button>
            <button className={styles.secondaryButton} onClick={() => setShowFullAnswer((value) => !value)}><Eye size={17} /> {t(showFullAnswer ? 'dictation.hideFullAnswer' : 'dictation.showFullAnswer')}</button>
            <button className={styles.secondaryButton} onClick={resetExercise}><RotateCcw size={17} /> {t('dictation.reset')}</button>
            <button className={styles.checkButton} onClick={checkAnswer} disabled={saving || !answer.trim()}><Check size={18} /> {t('dictation.checkAnswer')}</button>
          </div>

          {showHint && <div className={styles.hint}><div className={styles.hintHeader}><strong>{t('dictation.firstLetterHint')}</strong><span>{t('dictation.totalWordHint', { count: transcriptWordCount })}</span></div><p>{hint}</p></div>}
          {showFullAnswer && <div className={styles.fullAnswer}><div className={styles.hintHeader}><strong>{t('dictation.fullAnswer')}</strong><span>{t('dictation.totalWordHint', { count: transcriptWordCount })}</span></div><p>{exercise.transcript}</p></div>}

          {result && (
            <section className={styles.result}>
              <div><h3>{t('dictation.accuracy')}</h3><strong className={result.accuracy >= 80 ? styles.goodScore : styles.reviewScore}>{result.accuracy}%</strong></div>
              <p className={styles.transcript}>{result.words.map((item, index) => <span key={`${item.word}-${index}`} className={item.correct ? styles.correctWord : styles.wrongWord}>{item.word}{index < result.words.length - 1 ? ' ' : ''}</span>)}</p>
              <small>{t('dictation.resultHelp')}</small>
            </section>
          )}

          <footer className={styles.cardFooter}>
            <button onClick={() => moveExercise(-1)}><ChevronLeft size={18} /> {t('dictation.previous')}</button>
            <span>{currentProgress ? t('dictation.attemptSummary', { count: currentProgress.attempts, accuracy: latestAccuracy(currentProgress) }) : t('dictation.notAttempted')}{currentProgress?.imported && <small> · {t('dictation.importedScore')}</small>}</span>
            <button onClick={() => moveExercise(1)}>{t('dictation.next')} <ChevronRight size={18} /></button>
          </footer>
        </main>
      </div></> : mode === 'browse' ? (
        <>
          {topicStudyHeader}
          <main className={styles.referenceStudy}>
            <article className={styles.wordDetailCard}>
              <div className={styles.wordDetailMain}>
                <div>
                  <h2>{currentCard.word} <small>({currentCard.type})</small></h2>
                  <p>{currentCard.pronunciation}</p>
                  <strong>{currentCard.meaning}</strong>
                </div>
                <button type="button" onClick={speakWord} aria-label={t('dictionary.listen')}><Volume2 /></button>
              </div>
              <div className={styles.wordExample}>
                <span>{t('dictation.exampleSentence')}</span>
                <p>“{currentCard.example}”</p>
              </div>
              <div className={styles.wordMeta}>
                <span>{t('dictation.topic')}</span>
                <strong>{currentCard.topic}</strong>
              </div>
            </article>
            <div className={styles.referenceActions}>
              <button type="button" onClick={() => setCardIndex((cardIndex - 1 + activeFlashcards.length) % activeFlashcards.length)}><ChevronLeft /> {t('dictation.previous')}</button>
              <button type="button" className={cardRatings[currentCard.id] === 'know' ? styles.knownAction : ''} onClick={() => rateCard('know')}><Check /> {t(cardRatings[currentCard.id] === 'know' ? 'dictation.known' : 'dictation.markKnown')}</button>
              <button type="button" onClick={() => setCardIndex((cardIndex + 1) % activeFlashcards.length)}>{t('dictation.next')} <ChevronRight /></button>
            </div>
            <div className={styles.wordDots} aria-label={t('dictation.cardProgress')}>
              {activeFlashcards.map((card, index) => <button type="button" key={card.id} className={index === cardIndex ? styles.activeWordDot : ''} onClick={() => setCardIndex(index)} aria-label={`${index + 1}`} />)}
            </div>
          </main>
        </>
      ) : mode === 'flashcard' ? (
        <>
        {topicStudyHeader}
        <main className={styles.flashcardSection}>
          <div className={styles.flashcardTopline}>
            <div><span>{t('dictation.flashcards')}</span><h2>{t('dictation.topicVocabulary', { topic: selectedTopic.name })}</h2></div>
            <div className={styles.flashcardTools}><button onClick={shuffleCard}><Shuffle size={18} /> {t('dictation.shuffle')}</button><strong>{t('dictation.reviewed', { reviewed: activeFlashcards.filter((card) => cardRatings[card.id]).length, total: activeFlashcards.length })}</strong></div>
          </div>

          <div className={styles.studyProgress}><span style={{ width: `${((cardIndex + 1) / activeFlashcards.length) * 100}%` }} /></div>

          <div className={styles.flashcardScene}>
            <div
              className={`${styles.flashcard} ${isFlipped ? styles.flipped : ''}`}
              role="button"
              tabIndex="0"
              aria-label={t('dictation.flipAria', { side: t(isFlipped ? 'dictation.definition' : 'dictation.term'), word: currentCard.word })}
              onClick={() => setIsFlipped((value) => !value)}
              onKeyDown={(event) => {
                if (event.key === 'Enter' || event.key === ' ') {
                  event.preventDefault();
                  setIsFlipped((value) => !value);
                }
              }}
            >
              <div className={styles.flashcardInner}>
                <section className={`${styles.flashcardFace} ${styles.flashcardFront}`} aria-hidden={isFlipped}>
                  <span className={styles.cardSideLabel}>{t('dictation.term')}</span>
                <h2>{currentCard.word}</h2>
                <p>{currentCard.pronunciation}</p>
                <small>{currentCard.type}</small>
                <span className={styles.wordAudio} role="button" tabIndex="0" onClick={speakWord}><Volume2 size={21} /></span>
                  <span className={styles.flipPrompt}>{t('dictation.flip')}</span>
                </section>
                <section className={`${styles.flashcardFace} ${styles.flashcardBack}`} aria-hidden={!isFlipped}>
                  <span className={styles.cardSideLabel}>{t('dictation.definition')}</span>
                  <h2>{currentCard.meaning}</h2>
                  <p className={styles.example}>{currentCard.example}</p>
                  <span className={styles.flipPrompt}>{t('dictation.flipBack')}</span>
                </section>
              </div>
            </div>
          </div>

          <div className={styles.cardNavigation}>
            <button aria-label={t('dictation.previousCard')} onClick={() => { setCardIndex((cardIndex - 1 + activeFlashcards.length) % activeFlashcards.length); setIsFlipped(false); }}><ChevronLeft /></button>
            <span>{cardIndex + 1} / {activeFlashcards.length}</span>
            <button aria-label={t('dictation.nextCard')} onClick={() => { setCardIndex((cardIndex + 1) % activeFlashcards.length); setIsFlipped(false); }}><ChevronRight /></button>
          </div>

          <div className={styles.ratingPanel}>
            <div>
              <button className={styles.stillLearning} onClick={() => rateCard('learning')}><X size={20} /> {t('dictation.stillLearning')}</button>
              <button className={`${styles.knowCard} ${cardRatings[currentCard.id] === 'know' ? styles.alreadyKnown : ''}`} onClick={() => rateCard('know')}><Check size={20} /> {t(cardRatings[currentCard.id] === 'know' ? 'dictation.known' : 'dictation.markKnown')}</button>
            </div>
          </div>
        </main>
        </>
      ) : mode === 'quiz' ? (
        <>
          {topicStudyHeader}
          <main className={styles.referenceStudy}>
            <div className={styles.activityStatus}>
              <span>{t('dictation.questionProgress', { current: quizIndex + 1, total: activeFlashcards.length })}</span>
              <strong>{t('dictation.scoreValue', { score: quizScore })}</strong>
            </div>
            <section className={styles.quizCard}>
              <span>{t('dictation.vietnameseMeaning')}</span>
              <h2>{currentQuizCard.meaning}</h2>
              <div className={styles.quizOptions}>
                {quizOptions.map((option) => {
                  const answered = Boolean(quizAnswer);
                  const isCorrect = option.id === currentQuizCard.id;
                  const isChosen = option.id === quizAnswer;
                  return <button type="button" key={option.id} disabled={answered} className={answered && isCorrect ? styles.correctQuizOption : answered && isChosen ? styles.wrongQuizOption : ''} onClick={() => answerQuiz(option.id)}>{option.label}</button>;
                })}
              </div>
              {quizAnswer && <button type="button" className={styles.nextActivity} onClick={nextQuiz}>{t('dictation.next')} <ChevronRight /></button>}
            </section>
          </main>
        </>
      ) : mode === 'matching' ? (
        <>
          {topicStudyHeader}
          <main className={styles.referenceStudy}>
            <div className={styles.activityStatus}>
              <span>{t('dictation.matchedProgress', { matched: matchedCards.length, total: matchingCards.length })}</span>
            </div>
            <section className={styles.matchingCard}>
              <p>{t('dictation.matchInstructions')}</p>
              <div className={styles.matchingGrid}>
                <div>{matchingCards.map((card) => <button type="button" key={card.id} disabled={matchedCards.includes(card.id)} className={matchingWord === card.id ? styles.selectedMatch : matchedCards.includes(card.id) ? styles.completedMatch : ''} onClick={() => setMatchingWord(card.id)}>{card.word}</button>)}</div>
                <div>{matchingMeanings.map((card) => <button type="button" key={card.id} disabled={matchedCards.includes(card.id)} className={matchedCards.includes(card.id) ? styles.completedMatch : ''} onClick={() => selectMatchingMeaning(card.id)}>{card.meaning}</button>)}</div>
              </div>
              {matchingCards.length > 0 && matchedCards.length === matchingCards.length && <div className={styles.matchComplete}><Check /> {t('dictation.matchComplete')}</div>}
            </section>
          </main>
        </>
      ) : (
        <main className={styles.topicLanding}>
          <div className={styles.topicContent}>
            <nav className={styles.topicModeTabs} aria-label={t('dictation.studyModes')}>
              <button type="button" onClick={() => setMode('dictation')}>
                <Headphones /> {t('dictation.dictation')}
              </button>
              <button type="button" onClick={() => setMode('flashcard')}>
                <BookOpen /> {t('dictation.flashcard')}
              </button>
              <button type="button" className={styles.activeTopicMode} onClick={() => setMode('notebook')}>
                <FolderOpen /> {t('dictation.notebook')}
              </button>
            </nav>

        <section className={styles.notebookSection}>
          <header className={styles.notebookHeader}>
            <div><span>{t('dictation.personalSpace')}</span><h2>{t('dictation.notebookTitle')}</h2></div>
            <div className={styles.notebookHeaderActions}>
              <label className={styles.topicFilter}><FolderOpen size={17} /><AnswerSelect value={notebookTopic} onChange={(event) => setNotebookPagination({ filterTopic: event.target.value === 'All topics' ? '' : event.target.value, page: 1 })} options={[{ value: 'All topics', label: t('dictation.allTopics') }, ...availableTopics.map((topic) => topic.name), { value: 'Other', label: t('dictation.other') }]} ariaLabel={t('dictation.filterTopic')} /></label>
              <label className={styles.notebookSearch}><Search size={17} /><input value={notebookQuery} onChange={(event) => setNotebookPagination({ q: event.target.value, page: 1 })} placeholder={t('dictation.searchSaved')} aria-label={t('dictation.searchSaved')} /></label>
              <button className={styles.createButton} onClick={() => openCreateForm()}><Plus size={18} /> {t('dictation.addNew')}</button>
            </div>
          </header>

          <div className={styles.notebookTabs}>
            <button className={notebookTab === 'words' ? styles.activeNotebookTab : ''} onClick={() => setNotebookPagination({ tab: 'words', page: 1 })}>{t('dictation.savedWords')}</button>
            <button className={notebookTab === 'sentences' ? styles.activeNotebookTab : ''} onClick={() => setNotebookPagination({ tab: 'sentences', page: 1 })}>{t('dictation.savedSentences')}</button>
          </div>

          {notebookNotice && <div className={styles.notebookNotice} role="status"><Check size={17} />{notebookNotice}<button type="button" onClick={() => setNotebookNotice('')} aria-label={t('dictation.dismiss')}><X size={15} /></button></div>}

          <div className={styles.notebookLayout}>
            <section className={styles.savedList}>
              {visibleNotebookItems.length ? visibleNotebookItems.map((item) => (
                <article className={styles.savedCard} key={item.id}>
                  <div>
                    <div className={styles.savedTitle}><strong>{item.word}</strong><span className={styles.topicBadge}>{item.topic || t('dictation.other')}</span><button onClick={() => speakNotebookItem(item)} aria-label={t('dictation.listenTo', { word: item.word })}><Volume2 size={17} /></button></div>
                    {item.pronunciation && <span className={styles.pronunciation}>{item.pronunciation} [{item.type}]</span>}
                    <p>{item.meaning}</p>
                    {item.example && <small>{item.example}</small>}
                  </div>
                  <div className={styles.savedActions}>
                    <button type="button" onClick={() => openEditForm(item)} aria-label={t('dictation.editItem', { name: item.word })}><Pencil size={18} /></button>
                    <button type="button" className={styles.deleteSavedItem} onClick={() => requestNotebookDelete(item)} aria-label={t('dictation.deleteItem', { name: item.word })}><Trash2 size={18} /></button>
                  </div>
                </article>
              )) : <div className={styles.emptyNotebook}><Search size={34} /><h3>{t('dictation.noItems')}</h3><p>{t('dictation.noItemsHelp')}</p></div>}

              <Pagination page={currentNotebookPage} totalItems={filteredNotebookItems.length} pageSize={itemsPerPage} onPageChange={setNotebookPage} onPageSizeChange={setItemsPerPage} />
            </section>

            <aside className={styles.notebookStats}>
              <h3>{t('dictation.notebookStats')}</h3>
              <dl><div><dt>{t('dictation.totalWords')}</dt><dd>{notebookWordCount}</dd></div><div><dt>{t('dictation.totalSentences')}</dt><dd>{allExercises.length}</dd></div><div><dt>{t('dictation.reviewedCards')}</dt><dd>{reviewedFlashcardCount}</dd></div></dl>
              <div className={styles.statsProgress}><span style={{ width: `${flashcardProgress}%` }} /></div>
              <button onClick={() => setMode('flashcard')}>{t('dictation.reviewFlashcards')}</button>
            </aside>
          </div>

          {showCreateForm && <div className={styles.modalBackdrop} onMouseDown={() => setShowCreateForm(false)}>
            <form className={styles.createModal} onSubmit={createNotebookItem} onMouseDown={(event) => event.stopPropagation()} noValidate>
              <div className={styles.createModalHeader}><div><span>{t(editingItemId ? 'dictation.edit' : 'dictation.createNew')}</span><h3>{t(editingItemId ? (createType === 'word' ? 'dictation.editWord' : 'dictation.editSentence') : (createType === 'word' ? 'dictation.addWord' : 'dictation.addSentence'))}</h3></div><button type="button" onClick={() => setShowCreateForm(false)} aria-label={t('dictation.close')}><X /></button></div>
              {!editingItemId && <div className={styles.typeSelector}>
                <button type="button" className={createType === 'word' ? styles.selectedType : ''} onClick={() => { setCreateType('word'); setNewItem((item) => ({ ...item, type: 'noun' })); }}>{t('dictation.word')}</button>
                <button type="button" className={createType === 'sentence' ? styles.selectedType : ''} onClick={() => { setCreateType('sentence'); setNewItem((item) => ({ ...item, type: 'Custom sentence' })); }}>{t('dictation.sentence')}</button>
              </div>}
              {createType === 'word' ? <VocabularyWordInput item={newItem} knownWords={allFlashcards}
                onChange={word => setNewItem(current => ({ ...current, word }))}
                onResolved={(word, fields, snapshot) => setNewItem(current => {
                  if (current.word.trim().toLowerCase() !== word) return current;
                  const updated = { ...current };
                  for (const key of ['pronunciation', 'type', 'meaning', 'example']) {
                    if (fields[key] && current[key] === snapshot[key]) {
                      updated[key] = key === 'type' && !['noun', 'verb', 'adjective', 'adverb', 'phrase'].includes(fields[key]) ? 'phrase' : fields[key];
                    }
                  }
                  return updated;
                })} /> : <label>{t('dictation.title')}<input autoFocus required value={newItem.word} onChange={(event) => setNewItem({ ...newItem, word: event.target.value })} placeholder={t('dictation.titlePlaceholder')} /></label>}
              {createType === 'word' && <div className={styles.formRow}><label>{t('dictation.pronunciation')}<input value={newItem.pronunciation} onChange={(event) => setNewItem({ ...newItem, pronunciation: event.target.value })} placeholder="/əˈtʃiːvmənt/" /></label><label>{t('dictation.wordType')}<AnswerSelect value={newItem.type} onChange={(event) => setNewItem({ ...newItem, type: event.target.value })} options={['noun','verb','adjective','adverb','phrase']} ariaLabel={t('dictation.wordType')}/></label></div>}
              <div className={styles.topicFormRow}>
                <label>{t('dictation.topic')}<AnswerSelect value={newItem.topic} onChange={(event) => setNewItem({ ...newItem, topic: event.target.value })} options={availableTopics.map((topic) => topic.name)} placeholder={t(showTopicCreator ? 'dictation.addTopicBelow' : 'dictation.selectTopic')} disabled={showTopicCreator} ariaLabel={t('dictation.topic')} /></label>
                <button type="button" className={styles.addTopicButton} onClick={toggleTopicCreator}>{showTopicCreator ? <X size={16} /> : <Plus size={16} />} {t(showTopicCreator ? 'dictation.cancel' : 'dictation.newTopic')}</button>
              </div>
              {showTopicCreator && <div className={styles.topicCreator}>
                <input value={newTopicName} onChange={(event) => setNewTopicName(event.target.value)} onKeyDown={(event) => { if (event.key === 'Enter') { event.preventDefault(); addCustomTopic(); } }} maxLength="40" placeholder={t('dictation.topicName')} aria-label={t('dictation.newTopic')} />
                <button type="button" onClick={addCustomTopic} disabled={!newTopicName.trim()}>{t('dictation.addTopic')}</button>
              </div>}
              <label>{t(createType === 'word' ? 'dictation.vietnameseMeaning' : 'dictation.englishSentence')}<textarea required rows="3" value={newItem.meaning} onChange={(event) => setNewItem({ ...newItem, meaning: event.target.value })} placeholder={t(createType === 'word' ? 'dictation.meaningPlaceholder' : 'dictation.sentencePlaceholder')} /></label>
              {createType === 'word' && <label>{t('dictation.exampleSentence')}<input value={newItem.example} onChange={(event) => setNewItem({ ...newItem, example: event.target.value })} placeholder={t('dictation.examplePlaceholder')} /></label>}
              <div className={styles.modalActions}><button type="button" onClick={() => setShowCreateForm(false)}>{t('dictation.cancel')}</button><button type="submit">{editingItemId ? <Check size={17} /> : <Plus size={17} />} {editingItemId ? t('dictation.saveChanges') : t('dictation.create', { type: t(createType === 'word' ? 'dictation.word' : 'dictation.sentence').toLowerCase() })}</button></div>
            </form>
          </div>}
        </section>
          </div>
        </main>
      )}
    </div>
    {deleteTarget && <ConfirmModal
      title={t(deleteTarget.type === 'sentences' ? 'dictation.deleteSentenceTitle' : 'dictation.deleteWordTitle')}
      message={t('dictation.deleteConfirm', { name: deleteTarget.item.word })}
      confirmText={t(saving ? 'dictation.deleting' : 'dictation.deleteAction')}
      cancelText={t('dictation.cancel')}
      busy={saving}
      onCancel={cancelNotebookDelete}
      onConfirm={deleteNotebookItem}
    />}</>
  );
}
