import Pagination from '../../../components/common/Pagination';
import AnswerSelect from '../../../components/common/AnswerSelect';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { BookOpen, Check, ChevronLeft, ChevronRight, FolderOpen, Headphones, Heart, Lightbulb, Plus, Search, RotateCcw, Shuffle, Volume2, X } from 'lucide-react';
import { DICTATION_EXERCISES, DICTATION_FLASHCARDS, DICTATION_TOPICS } from '../data/dictationExercises';
import { loadDictationProgress, saveDictationAttempt } from '../utils/dictationStorage';
import styles from './DictationPage.module.css';

const normalize = (value) => value.toLowerCase().replace(/[^a-z0-9'\s]/g, '').replace(/\s+/g, ' ').trim();

function compareAnswer(answer, transcript) {
  const typedWords = normalize(answer).split(' ').filter(Boolean);
  const correctWords = normalize(transcript).split(' ').filter(Boolean);
  const words = correctWords.map((word, index) => ({ word, correct: typedWords[index] === word }));
  const correctCount = words.filter((item) => item.correct).length;
  return { words, accuracy: Math.round((correctCount / correctWords.length) * 100) };
}

export default function DictationPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const requestedMode = searchParams.get('mode');
  const mode = ['flashcard', 'notebook'].includes(requestedMode) ? requestedMode : 'dictation';
  const requestedTopic = searchParams.get('topic');
  const setMode = (nextMode) => setSearchParams(nextMode === 'dictation' ? {} : { mode: nextMode });
  const [exerciseIndex, setExerciseIndex] = useState(0);
  const [answer, setAnswer] = useState('');
  const [rate, setRate] = useState(1);
  const [result, setResult] = useState(null);
  const [showHint, setShowHint] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [progress, setProgress] = useState(loadDictationProgress);
  const [cardIndex, setCardIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);
  const [cardRatings, setCardRatings] = useState(() => {
    try { return JSON.parse(window.localStorage.getItem('aptimate.dictation.flashcards') || '{}'); } catch { return {}; }
  });
  const [notebookTab, setNotebookTab] = useState('words');
  const [notebookQuery, setNotebookQuery] = useState('');
  const [notebookTopic, setNotebookTopic] = useState('All topics');
  const [notebookPage, setNotebookPage] = useState(1);
  const [savedWords, setSavedWords] = useState(() => {
    try {
      const stored = JSON.parse(window.localStorage.getItem('aptimate.dictation.savedWords') || 'null');
      return stored || DICTATION_FLASHCARDS.map((card) => card.id);
    } catch { return DICTATION_FLASHCARDS.map((card) => card.id); }
  });
  const [customWords, setCustomWords] = useState(() => {
    try { return JSON.parse(window.localStorage.getItem('aptimate.dictation.customWords') || '[]'); } catch { return []; }
  });
  const [customSentences, setCustomSentences] = useState(() => {
    try { return JSON.parse(window.localStorage.getItem('aptimate.dictation.customSentences') || '[]'); } catch { return []; }
  });
  const [customTopics, setCustomTopics] = useState(() => {
    try { return JSON.parse(window.localStorage.getItem('aptimate.dictation.customTopics') || '[]'); } catch { return []; }
  });
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [showTopicCreator, setShowTopicCreator] = useState(false);
  const [newTopicName, setNewTopicName] = useState('');
  const [createError, setCreateError] = useState('');
  const [notebookNotice, setNotebookNotice] = useState('');
  const [createType, setCreateType] = useState('word');
  const [newItem, setNewItem] = useState({ word: '', pronunciation: '', type: 'noun', topic: DICTATION_TOPICS[0].name, meaning: '', example: '' });
  const textareaRef = useRef(null);
  const availableTopics = [...DICTATION_TOPICS, ...customTopics];
  const selectedTopic = availableTopics.find((topic) => topic.id === requestedTopic) || null;
  const allFlashcards = [...DICTATION_FLASHCARDS, ...customWords];
  const allExercises = [
    ...DICTATION_EXERCISES,
    ...customSentences.map((item) => ({
      ...item,
      title: item.word,
      transcript: item.meaning,
      accent: item.accent || 'en-GB',
    })),
  ];
  const activeExercises = selectedTopic ? allExercises.filter((item) => item.topic === selectedTopic.name) : [];
  const activeFlashcards = selectedTopic ? allFlashcards.filter((item) => item.topic === selectedTopic.name) : [];
  const exercise = activeExercises[exerciseIndex] || DICTATION_EXERCISES[0];

  const hint = useMemo(() => exercise.transcript.split(' ').map((word) => `${word[0]}${'_'.repeat(Math.max(1, word.length - 1))}`).join(' '), [exercise]);

  useEffect(() => () => window.speechSynthesis?.cancel(), []);

  useEffect(() => {
    if (mode !== 'flashcard' || !activeFlashcards.length) return undefined;
    const handleKeyDown = (event) => {
      if (event.target instanceof HTMLInputElement || event.target instanceof HTMLTextAreaElement) return;
      if (event.code === 'Space') { event.preventDefault(); setIsFlipped((value) => !value); }
      if (event.key === 'ArrowLeft') { setCardIndex((current) => (current - 1 + activeFlashcards.length) % activeFlashcards.length); setIsFlipped(false); }
      if (event.key === 'ArrowRight') { setCardIndex((current) => (current + 1) % activeFlashcards.length); setIsFlipped(false); }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [mode, activeFlashcards.length]);

  const speak = () => {
    if (!('speechSynthesis' in window)) return;
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(exercise.transcript);
    utterance.lang = exercise.accent;
    utterance.rate = rate;
    utterance.onstart = () => setIsSpeaking(true);
    utterance.onend = () => setIsSpeaking(false);
    utterance.onerror = () => setIsSpeaking(false);
    window.speechSynthesis.speak(utterance);
    textareaRef.current?.focus();
  };

  const checkAnswer = () => {
    if (!answer.trim()) return;
    const nextResult = compareAnswer(answer, exercise.transcript);
    setResult(nextResult);
    setProgress(saveDictationAttempt(exercise.id, nextResult));
  };

  const resetExercise = () => {
    window.speechSynthesis?.cancel();
    setAnswer('');
    setResult(null);
    setShowHint(false);
    setIsSpeaking(false);
  };

  const moveExercise = (direction) => {
    setExerciseIndex((current) => (current + direction + activeExercises.length) % activeExercises.length);
    resetExercise();
  };

  const currentProgress = progress[exercise.id];
  const currentCard = activeFlashcards[cardIndex] || DICTATION_FLASHCARDS[0];
  const [itemsPerPage, setItemsPerPage] = useState(4);
  const notebookItems = notebookTab === 'sentences'
    ? [...DICTATION_EXERCISES.map((item) => ({ ...item, word: item.title, meaning: item.transcript, type: item.topic })), ...customSentences]
    : [...DICTATION_FLASHCARDS, ...customWords].filter((item) => savedWords.includes(item.id));
  const filteredNotebookItems = notebookItems.filter((item) => {
    const matchesQuery = `${item.word} ${item.meaning} ${item.example || ''}`.toLowerCase().includes(notebookQuery.toLowerCase());
    const itemTopic = item.topic || 'Other';
    return matchesQuery && (notebookTopic === 'All topics' || itemTopic === notebookTopic);
  });
  const notebookPageCount = Math.max(1, Math.ceil(filteredNotebookItems.length / itemsPerPage));
  const visibleNotebookItems = filteredNotebookItems.slice((notebookPage - 1) * itemsPerPage, notebookPage * itemsPerPage);

  const rateCard = (rating) => {
    const nextRatings = { ...cardRatings, [currentCard.id]: rating };
    setCardRatings(nextRatings);
    window.localStorage.setItem('aptimate.dictation.flashcards', JSON.stringify(nextRatings));
    setIsFlipped(false);
    setCardIndex((current) => (current + 1) % activeFlashcards.length);
  };

  const shuffleCard = () => {
    if (activeFlashcards.length < 2) return;
    let nextIndex = cardIndex;
    while (nextIndex === cardIndex) nextIndex = Math.floor(Math.random() * activeFlashcards.length);
    setCardIndex(nextIndex);
    setIsFlipped(false);
  };

  const chooseTopic = (topicId) => {
    setSearchParams(mode === 'dictation' ? { topic: topicId } : { mode, topic: topicId });
    setExerciseIndex(0);
    setCardIndex(0);
    setIsFlipped(false);
    resetExercise();
  };

  const returnToTopics = () => {
    setSearchParams(mode === 'dictation' ? {} : { mode });
    setExerciseIndex(0);
    setCardIndex(0);
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
    const utterance = new SpeechSynthesisUtterance(notebookTab === 'sentences' ? item.meaning : item.word);
    utterance.lang = 'en-GB';
    utterance.rate = 0.85;
    window.speechSynthesis.speak(utterance);
  };

  const toggleSavedWord = (id) => {
    const next = savedWords.includes(id) ? savedWords.filter((wordId) => wordId !== id) : [...savedWords, id];
    setSavedWords(next);
    window.localStorage.setItem('aptimate.dictation.savedWords', JSON.stringify(next));
  };

  const openCreateForm = (type = notebookTab === 'sentences' ? 'sentence' : 'word') => {
    setCreateType(type);
    setNewItem({ word: '', pronunciation: '', type: type === 'word' ? 'noun' : 'Custom sentence', topic: DICTATION_TOPICS[0].name, meaning: '', example: '' });
    setShowTopicCreator(false);
    setNewTopicName('');
    setCreateError('');
    setShowCreateForm(true);
  };

  const addCustomTopic = () => {
    const name = newTopicName.trim().replace(/\s+/g, ' ');
    if (!name) return;
    const existingTopic = availableTopics.find((topic) => topic.name.toLowerCase() === name.toLowerCase());
    if (existingTopic) {
      setNewItem((item) => ({ ...item, topic: existingTopic.name }));
    } else {
      const topic = { id: `custom-topic-${Date.now()}`, name, description: 'Your custom vocabulary collection.' };
      const nextTopics = [...customTopics, topic];
      setCustomTopics(nextTopics);
      window.localStorage.setItem('aptimate.dictation.customTopics', JSON.stringify(nextTopics));
      setNewItem((item) => ({ ...item, topic: topic.name }));
    }
    setNewTopicName('');
    setCreateError('');
    setShowTopicCreator(false);
  };

  const toggleTopicCreator = () => {
    if (showTopicCreator) {
      setShowTopicCreator(false);
      setNewTopicName('');
      setNewItem((item) => ({ ...item, topic: item.topic || DICTATION_TOPICS[0].name }));
      return;
    }
    setNewItem((item) => ({ ...item, topic: '' }));
    setNewTopicName('');
    setCreateError('');
    setShowTopicCreator(true);
  };

  const createNotebookItem = (event) => {
    event.preventDefault();
    if (!newItem.topic) {
      setCreateError('Please select an existing topic or add your new topic first.');
      return;
    }
    if (!newItem.word.trim() || !newItem.meaning.trim()) {
      setCreateError(createType === 'word' ? 'Please enter the word or phrase and its meaning.' : 'Please enter the title and practice sentence.');
      return;
    }
    const item = {
      ...newItem,
      word: newItem.word.trim(),
      pronunciation: newItem.pronunciation.trim(),
      meaning: newItem.meaning.trim(),
      example: newItem.example.trim(),
      topic: newItem.topic || 'Other',
      id: `custom-${Date.now()}`,
      custom: true,
    };
    if (createType === 'word') {
      const nextWords = [item, ...customWords];
      const nextSaved = [item.id, ...savedWords];
      setCustomWords(nextWords);
      setSavedWords(nextSaved);
      window.localStorage.setItem('aptimate.dictation.customWords', JSON.stringify(nextWords));
      window.localStorage.setItem('aptimate.dictation.savedWords', JSON.stringify(nextSaved));
      setNotebookTab('words');
    } else {
      const nextSentences = [item, ...customSentences];
      setCustomSentences(nextSentences);
      window.localStorage.setItem('aptimate.dictation.customSentences', JSON.stringify(nextSentences));
      setNotebookTab('sentences');
    }
    setNotebookQuery('');
    setNotebookTopic(item.topic);
    setNotebookPage(1);
    setCreateError('');
    setShowCreateForm(false);
    setNotebookNotice(`${createType === 'word' ? 'Word or phrase added to the Flashcard folder' : 'Sentence added to the Dictation Practice folder'}: ${item.topic}.`);
  };

  return (
    <div className={styles.page}>
      {(mode === 'dictation' || mode === 'flashcard') && !selectedTopic ? (
        <main className={styles.topicLibrary}>
          <header className={styles.topicHeader}>
            <div>
              <span>{mode === 'dictation' ? 'Dictation practice' : 'Flashcard folders'}</span>
              <h1>Choose a topic</h1>
              <p>Select a folder to start practising {mode === 'dictation' ? 'listening and spelling' : 'vocabulary'}.</p>
            </div>
            {mode === 'dictation' ? <Headphones /> : <BookOpen />}
          </header>

          <section className={styles.topicGrid} aria-label={`${mode} topics`}>
            {availableTopics.map((topic) => {
              const lessons = allExercises.filter((item) => item.topic === topic.name);
              const cards = allFlashcards.filter((item) => item.topic === topic.name);
              const completedLessons = lessons.filter((item) => progress[item.id]).length;
              const reviewedCards = cards.filter((item) => cardRatings[item.id]).length;
              const completed = mode === 'dictation' ? completedLessons : reviewedCards;
              const total = mode === 'dictation' ? lessons.length : cards.length;

              return (
                <button key={topic.id} className={styles.topicFolder} onClick={() => chooseTopic(topic.id)} disabled={!total}>
                  <span className={styles.folderIcon}><FolderOpen /></span>
                  <span className={styles.topicCopy}>
                    <strong>{topic.name}</strong>
                    <small>{topic.description}</small>
                  </span>
                  <span className={styles.topicMeta}>{total} {mode === 'dictation' ? `lesson${total === 1 ? '' : 's'}` : `card${total === 1 ? '' : 's'}`}</span>
                  <span className={styles.topicProgress}><span style={{ width: `${total ? (completed / total) * 100 : 0}%` }} /></span>
                  <span className={styles.topicStatus}>{total ? `${completed}/${total} completed` : 'No flashcards yet'}</span>
                </button>
              );
            })}
          </section>
        </main>
      ) : mode === 'dictation' ? <>
        <div className={styles.practiceContext}>
          <button onClick={returnToTopics}><ChevronLeft /> All topics</button>
          <div><span>Topic</span><strong>{selectedTopic.name}</strong></div>
        </div>
        <div className={styles.layout}>
        <aside className={styles.lessonList}>
          <h2>Lessons</h2>
          {activeExercises.map((item, index) => (
            <button key={item.id} className={index === exerciseIndex ? styles.activeLesson : ''} onClick={() => { setExerciseIndex(index); resetExercise(); }}>
              <span className={styles.lessonNumber}>{index + 1}</span>
              <span><strong>{item.title}</strong><small>{item.topic}</small></span>
              {progress[item.id] && <span className={styles.best}>{progress[item.id].bestAccuracy}%</span>}
            </button>
          ))}
        </aside>

        <main className={styles.practiceCard}>
          <div className={styles.cardHeader}>
            <div><span>Lesson {exerciseIndex + 1}</span><h2>{exercise.title}</h2></div>
          </div>

          <div className={styles.player}>
            <button className={styles.playButton} onClick={speak} aria-label="Play sentence"><Volume2 className={isSpeaking ? styles.pulse : ''} /></button>
            <div><strong>{isSpeaking ? 'Playing sentence…' : 'Ready to listen'}</strong><span>{exercise.accent === 'en-GB' ? 'British English' : 'American English'}</span></div>
            <label>Speed<AnswerSelect value={rate} onChange={(event) => setRate(Number(event.target.value))} options={[{value:.7,label:'0.7×'},{value:.85,label:'0.85×'},{value:1,label:'1×'},{value:1.15,label:'1.15×'}]} ariaLabel="Playback speed"/></label>
          </div>

          <label className={styles.answerLabel} htmlFor="dictation-answer">Type what you hear</label>
          <textarea id="dictation-answer" ref={textareaRef} value={answer} onChange={(event) => { setAnswer(event.target.value); setResult(null); }} placeholder="Listen, then type the complete sentence…" rows={5} />

          <div className={styles.actions}>
            <button className={styles.secondaryButton} onClick={() => setShowHint((value) => !value)}><Lightbulb size={17} /> Hint</button>
            <button className={styles.secondaryButton} onClick={resetExercise}><RotateCcw size={17} /> Reset</button>
            <button className={styles.checkButton} onClick={checkAnswer} disabled={!answer.trim()}><Check size={18} /> Check answer</button>
          </div>

          {showHint && <div className={styles.hint}><strong>First-letter hint</strong><p>{hint}</p></div>}

          {result && (
            <section className={styles.result}>
              <div><h3>Your accuracy</h3><strong className={result.accuracy >= 80 ? styles.goodScore : styles.reviewScore}>{result.accuracy}%</strong></div>
              <p className={styles.transcript}>{result.words.map((item, index) => <span key={`${item.word}-${index}`} className={item.correct ? styles.correctWord : styles.wrongWord}>{item.word}{index < result.words.length - 1 ? ' ' : ''}</span>)}</p>
              <small>Green words match your answer. Red words need another listen.</small>
            </section>
          )}

          <footer className={styles.cardFooter}>
            <button onClick={() => moveExercise(-1)}><ChevronLeft size={18} /> Previous</button>
            <span>{currentProgress ? `${currentProgress.attempts} attempt${currentProgress.attempts === 1 ? '' : 's'} · Best ${currentProgress.bestAccuracy}%` : 'Not attempted yet'}</span>
            <button onClick={() => moveExercise(1)}>Next <ChevronRight size={18} /></button>
          </footer>
        </main>
      </div></> : mode === 'flashcard' ? (
        <main className={styles.flashcardSection}>
          <div className={styles.practiceContext}>
            <button onClick={returnToTopics}><ChevronLeft /> All topics</button>
            <div><span>Topic</span><strong>{selectedTopic.name}</strong></div>
          </div>
          <div className={styles.flashcardTopline}>
            <div><span>Flashcards</span><h2>{selectedTopic.name} vocabulary</h2></div>
            <div className={styles.flashcardTools}><button onClick={shuffleCard}><Shuffle size={18} /> Shuffle</button><strong>{activeFlashcards.filter((card) => cardRatings[card.id]).length}/{activeFlashcards.length} reviewed</strong></div>
          </div>

          <div className={styles.studyProgress}><span style={{ width: `${((cardIndex + 1) / activeFlashcards.length) * 100}%` }} /></div>

          <button className={`${styles.flashcard} ${isFlipped ? styles.flipped : ''}`} onClick={() => setIsFlipped((value) => !value)}>
            <span className={styles.cardSideLabel}>{isFlipped ? 'Definition' : 'Term'}</span>
            <span className={`${styles.cardFavourite} ${savedWords.includes(currentCard.id) ? styles.favourited : ''}`} role="button" tabIndex="0" onClick={(event) => { event.stopPropagation(); toggleSavedWord(currentCard.id); }}><Heart size={22} fill={savedWords.includes(currentCard.id) ? 'currentColor' : 'none'} /></span>
            {!isFlipped ? (
              <div>
                <h2>{currentCard.word}</h2>
                <p>{currentCard.pronunciation}</p>
                <small>{currentCard.type}</small>
                <span className={styles.wordAudio} role="button" tabIndex="0" onClick={speakWord}><Volume2 size={21} /></span>
              </div>
            ) : (
              <div>
                <h2>{currentCard.meaning}</h2>
                <p className={styles.example}>{currentCard.example}</p>
              </div>
            )}
            <span className={styles.flipPrompt}>Click card or press Space to flip</span>
          </button>

          <div className={styles.cardNavigation}>
            <button aria-label="Previous card" onClick={() => { setCardIndex((cardIndex - 1 + activeFlashcards.length) % activeFlashcards.length); setIsFlipped(false); }}><ChevronLeft /></button>
            <span>{cardIndex + 1} / {activeFlashcards.length}</span>
            <button aria-label="Next card" onClick={() => { setCardIndex((cardIndex + 1) % activeFlashcards.length); setIsFlipped(false); }}><ChevronRight /></button>
          </div>

          <div className={styles.ratingPanel}>
            <div>
              <button className={styles.stillLearning} onClick={() => rateCard('learning')}><X size={20} /> Still learning</button>
              <button className={styles.knowCard} onClick={() => rateCard('know')}><Check size={20} /> Know</button>
            </div>
          </div>
        </main>
      ) : (
        <main className={styles.notebookSection}>
          <header className={styles.notebookHeader}>
            <div><span>Personal learning space</span><h2>My Vocabulary Notebook</h2></div>
            <div className={styles.notebookHeaderActions}>
              <label className={styles.topicFilter}><FolderOpen size={17} /><AnswerSelect value={notebookTopic} onChange={(event) => { setNotebookTopic(event.target.value); setNotebookPage(1); }} options={['All topics', ...availableTopics.map((topic) => topic.name), 'Other']} ariaLabel="Filter notebook by topic" /></label>
              <label className={styles.notebookSearch}><Search size={17} /><input value={notebookQuery} onChange={(event) => { setNotebookQuery(event.target.value); setNotebookPage(1); }} placeholder="Search saved items…" /></label>
              <button className={styles.createButton} onClick={() => openCreateForm()}><Plus size={18} /> Add new</button>
            </div>
          </header>

          <div className={styles.notebookTabs}>
            <button className={notebookTab === 'words' ? styles.activeNotebookTab : ''} onClick={() => { setNotebookTab('words'); setNotebookPage(1); }}>Saved words</button>
            <button className={notebookTab === 'sentences' ? styles.activeNotebookTab : ''} onClick={() => { setNotebookTab('sentences'); setNotebookPage(1); }}>Saved sentences</button>
          </div>

          {notebookNotice && <div className={styles.notebookNotice} role="status"><Check size={17} />{notebookNotice}<button type="button" onClick={() => setNotebookNotice('')} aria-label="Dismiss message"><X size={15} /></button></div>}

          <div className={styles.notebookLayout}>
            <section className={styles.savedList}>
              {visibleNotebookItems.length ? visibleNotebookItems.map((item) => (
                <article className={styles.savedCard} key={item.id}>
                  <div>
                    <div className={styles.savedTitle}><strong>{item.word}</strong><span className={styles.topicBadge}>{item.topic || 'Other'}</span><button onClick={() => speakNotebookItem(item)} aria-label={`Listen to ${item.word}`}><Volume2 size={17} /></button></div>
                    {item.pronunciation && <span className={styles.pronunciation}>{item.pronunciation} [{item.type}]</span>}
                    <p>{item.meaning}</p>
                    {item.example && <small>{item.example}</small>}
                  </div>
                  {notebookTab !== 'sentences' && <button className={`${styles.saveButton} ${savedWords.includes(item.id) ? styles.isSaved : ''}`} onClick={() => toggleSavedWord(item.id)} aria-label="Toggle saved word"><Heart size={20} fill={savedWords.includes(item.id) ? 'currentColor' : 'none'} /></button>}
                </article>
              )) : <div className={styles.emptyNotebook}><Search size={34} /><h3>No matching items</h3><p>Try another keyword or add a new word to your notebook.</p></div>}

              <Pagination page={notebookPage} totalItems={filteredNotebookItems.length} pageSize={itemsPerPage} onPageChange={setNotebookPage} onPageSizeChange={setItemsPerPage} />
            </section>

            <aside className={styles.notebookStats}>
              <h3>Notebook Stats</h3>
              <dl><div><dt>Total Words</dt><dd>{savedWords.length}</dd></div><div><dt>Total Sentences</dt><dd>{allExercises.length}</dd></div><div><dt>Flashcards Reviewed</dt><dd>{Object.keys(cardRatings).length}</dd></div></dl>
              <div className={styles.statsProgress}><span style={{ width: `${allFlashcards.length ? (Object.keys(cardRatings).length / allFlashcards.length) * 100 : 0}%` }} /></div>
              <button onClick={() => setMode('flashcard')}>Review Flashcards</button>
            </aside>
          </div>

          {showCreateForm && <div className={styles.modalBackdrop} onMouseDown={() => setShowCreateForm(false)}>
            <form className={styles.createModal} onSubmit={createNotebookItem} onMouseDown={(event) => event.stopPropagation()} noValidate>
              <div className={styles.createModalHeader}><div><span>Create new</span><h3>{createType === 'word' ? 'Add a vocabulary word' : 'Add a practice sentence'}</h3></div><button type="button" onClick={() => setShowCreateForm(false)} aria-label="Close"><X /></button></div>
              <div className={styles.typeSelector}>
                <button type="button" className={createType === 'word' ? styles.selectedType : ''} onClick={() => { setCreateType('word'); setNewItem((item) => ({ ...item, type: 'noun' })); }}>Word</button>
                <button type="button" className={createType === 'sentence' ? styles.selectedType : ''} onClick={() => { setCreateType('sentence'); setNewItem((item) => ({ ...item, type: 'Custom sentence' })); }}>Sentence</button>
              </div>
              <label>{createType === 'word' ? 'English word' : 'Title'}<input autoFocus required value={newItem.word} onChange={(event) => setNewItem({ ...newItem, word: event.target.value })} placeholder={createType === 'word' ? 'e.g. achievement' : 'e.g. My travel sentence'} /></label>
              {createType === 'word' && <div className={styles.formRow}><label>Pronunciation<input value={newItem.pronunciation} onChange={(event) => setNewItem({ ...newItem, pronunciation: event.target.value })} placeholder="/əˈtʃiːvmənt/" /></label><label>Word type<AnswerSelect value={newItem.type} onChange={(event) => setNewItem({ ...newItem, type: event.target.value })} options={['noun','verb','adjective','adverb','phrase']} ariaLabel="Word type"/></label></div>}
              <div className={styles.topicFormRow}>
                <label>Topic<AnswerSelect value={newItem.topic} onChange={(event) => setNewItem({ ...newItem, topic: event.target.value })} options={availableTopics.map((topic) => topic.name)} placeholder={showTopicCreator ? 'Add a new topic below' : 'Select a topic'} disabled={showTopicCreator} ariaLabel={`Topic for new ${createType}`} /></label>
                <button type="button" className={styles.addTopicButton} onClick={toggleTopicCreator}>{showTopicCreator ? <X size={16} /> : <Plus size={16} />} {showTopicCreator ? 'Cancel' : 'New topic'}</button>
              </div>
              {showTopicCreator && <div className={styles.topicCreator}>
                <input value={newTopicName} onChange={(event) => setNewTopicName(event.target.value)} onKeyDown={(event) => { if (event.key === 'Enter') { event.preventDefault(); addCustomTopic(); } }} maxLength="40" placeholder="Enter a topic name…" aria-label="New topic name" />
                <button type="button" onClick={addCustomTopic} disabled={!newTopicName.trim()}>Add topic</button>
              </div>}
              {createError && <p className={styles.createError} role="alert">{createError}</p>}
              <label>{createType === 'word' ? 'Vietnamese meaning' : 'English sentence'}<textarea required rows="3" value={newItem.meaning} onChange={(event) => setNewItem({ ...newItem, meaning: event.target.value })} placeholder={createType === 'word' ? 'Nhập nghĩa tiếng Việt…' : 'Enter the sentence you want to practise…'} /></label>
              {createType === 'word' && <label>Example sentence<input value={newItem.example} onChange={(event) => setNewItem({ ...newItem, example: event.target.value })} placeholder="Use the word in a sentence…" /></label>}
              <div className={styles.modalActions}><button type="button" onClick={() => setShowCreateForm(false)}>Cancel</button><button type="submit"><Plus size={17} /> Create {createType}</button></div>
            </form>
          </div>}
        </main>
      )}
    </div>
  );
}
