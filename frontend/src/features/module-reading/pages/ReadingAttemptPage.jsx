import { useMemo, useState } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import InstructionBlock from '../../../components/common/InstructionBlock.jsx';
import TestFooter from '../../../components/layout/TestFooter.jsx';
import SubmitModal from '../../../components/shared/SubmitModal/SubmitModal.jsx';
import PracticeAnswerReveal from '../../practice/components/PracticeAnswerReveal.jsx';
import { AttemptPageState, SaveIndicator } from '../../test-attempts/components/AttemptPageState.jsx';
import { useTestAttempt } from '../../test-attempts/context/testAttemptContextStore.js';
import { ReadingTestContext } from '../context/ReadingTestContext.jsx';
import Part1GapFilling from '../components/test-engine/parts/Part1GapFilling.jsx';
import Part2TextCohesion from '../components/test-engine/parts/Part2TextCohesion.jsx';
import Part3OpinionMatch from '../components/test-engine/parts/Part3OpinionMatch.jsx';
import Part4MatchHeading from '../components/test-engine/parts/Part4MatchHeading.jsx';
import styles from './ReadingAttemptPage.module.css';

const instructions = {
  1: 'Read the passage and choose the correct word for each gap.',
  2: 'Arrange sentences 2–6 in both texts. The opening sentence of each text is fixed.',
  3: 'Read the four opinions and match each statement to the correct speaker.',
  4: 'Choose one heading for each paragraph.',
};

function legacyPart(number, part) {
  if (number === 1) return { ...part, questions: part.questions.map(question => ({ ...question, id: question.key,
    options: question.options.map(option => option.text) })) };
  if (number === 2) {
    const texts = Array.isArray(part.texts) ? part.texts : [{ id: 'p2-text1', ...part }];
    return { texts: texts.map((text, textIndex) => ({ id: text.id || `p2-text${textIndex + 1}`, title: text.title, sentences: [
      { id: `${text.id || `p2-text${textIndex + 1}`}-opening`, content: text.openingSentence, correctPosition: 1 },
      ...text.options.map((option, index) => ({ id: option.id, content: option.text, correctPosition: index + 2 })),
    ] })) };
  }
  if (number === 3) return { speakers: part.speakers.map(speaker => speaker.name),
    posts: part.speakers.map(speaker => speaker.post), passage: part.speakers.map(speaker => `${speaker.name}: ${speaker.post}`).join('\n\n'),
    questions: part.questions.map(question => ({ id: question.key, statement: question.statement })) };
  return { title: part.title, headings: part.headings, paragraphs: part.paragraphs.map(paragraph => ({
    id: paragraph.id, label: paragraph.label, content: paragraph.content, key: paragraph.key,
  })) };
}

function findPaperPart(paper, number) {
  const parts = paper?.parts;
  if (!parts) return null;
  if (Array.isArray(parts)) {
    return parts.find(candidate => Number(candidate?.partNumber ?? candidate?.number) === number) ?? null;
  }
  return parts[String(number)] ?? parts[`part${number}`] ?? null;
}

export default function ReadingAttemptPage() {
  const { part = 'part1' } = useParams();
  const number = Number(part.replace('part', ''));
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { attemptId, paper, answers, loading, loadError, saveStatus, isPractice,
    setAnswer, flush, submit, approveNavigation } = useTestAttempt();
  const [showSubmit, setShowSubmit] = useState(false);
  const current = findPaperPart(paper, number);
  const data = useMemo(() => current ? legacyPart(number, current) : null, [current, number]);
  const isFull = paper?.mode === 'full';

  const legacyAnswers = useMemo(() => {
    if (!current) return {};
    if (number === 1) return Object.fromEntries(current.questions.map(question => {
      const selected = question.options.find(option => option.id === answers[question.key]?.optionId);
      return [question.key, selected?.text ?? ''];
    }));
    if (number === 2) {
      const texts = Array.isArray(current.texts) ? current.texts : [{ id: 'p2-text1', ...current }];
      return Object.fromEntries(texts.flatMap(text => text.positions.flatMap(position => {
        const sentenceId = answers[position.key]?.optionId;
        return sentenceId ? [[sentenceId, position.position]] : [];
      })));
    }
    if (number === 3) return Object.fromEntries(current.questions.map(question => {
      const selected = current.speakers.find(speaker => speaker.id === answers[question.key]?.optionId);
      return [question.key, selected?.name ?? ''];
    }));
    return Object.fromEntries(current.paragraphs.map(paragraph => [paragraph.id, answers[paragraph.key]?.optionId ?? '']));
  }, [answers, current, number]);

  if (loading || loadError) return <AttemptPageState loading={loading} error={loadError} />;
  if (!data || ![1, 2, 3, 4].includes(number)) return <AttemptPageState error="This Reading part is not available." />;

  const handleLegacyAnswer = (key, value) => {
    if (number === 1) {
      const question = current.questions.find(item => item.key === key);
      const option = question.options.find(item => item.text === value);
      setAnswer(key, option ? { kind: 'CHOICE', optionId: option.id } : null);
    } else if (number === 2) {
      const texts = Array.isArray(current.texts) ? current.texts : [{ id: 'p2-text1', ...current }];
      const text = texts.find(item => item.options.some(option => option.id === key));
      const position = text?.positions.find(item => item.position === value);
      if (position) setAnswer(position.key, { kind: 'MATCH', optionId: key });
      for (const item of text?.positions || []) {
        if (item.position !== value && answers[item.key]?.optionId === key) setAnswer(item.key, null);
      }
    } else if (number === 3) {
      const speaker = current.speakers.find(item => item.name === value);
      setAnswer(key, speaker ? { kind: 'MATCH', optionId: speaker.id } : null);
    } else {
      const paragraph = current.paragraphs.find(item => item.id === key);
      setAnswer(paragraph.key, value ? { kind: 'MATCH', optionId: value } : null);
    }
  };
  const goNextPart = async () => {
    await flush();
    const params = new URLSearchParams(searchParams); params.set('attemptId', attemptId);
    navigate(`/reading/test/part${number + 1}?${params.toString()}`);
  };
  const primary = () => isFull && number < 4 ? void goNextPart() : setShowSubmit(true);
  const finish = async () => {
    setShowSubmit(false);
    try {
      const result = await submit();
      if (result) { approveNavigation(); navigate(`/reading/result?attemptId=${attemptId}${isPractice ? '&practice=true' : ''}`); }
    } catch { /* Provider displays the API error. */ }
  };
  const revealItems = number === 1 ? current.questions.map(item => ({ ...item, options: item.options }))
    : number === 2 ? (Array.isArray(current.texts) ? current.texts : [{ id: 'p2-text1', ...current }])
      .flatMap(text => text.positions.map(item => ({ ...item, textId: text.id, options: text.options })))
      : number === 3 ? current.questions.map(item => ({ ...item, options: current.speakers.map(speaker => ({ id: speaker.id, text: speaker.name })) }))
        : current.paragraphs.map(item => ({ ...item, options: current.headings }));
  const questionIds = revealItems.map(item => item.key);
  const answeredIds = questionIds.filter(key => answers[key]);
  const renderAnswerReveal = legacyKey => {
    const item = number === 2
      ? revealItems.find(candidate => candidate.position === legacyKey.position && candidate.textId === legacyKey.textId)
      : number === 4
        ? revealItems.find(candidate => candidate.id === legacyKey)
        : revealItems.find(candidate => candidate.key === legacyKey);
    return item ? <PracticeAnswerReveal questionKey={item.key} options={item.options} /> : null;
  };
  const provider = { answers: legacyAnswers, handleAnswerChange: handleLegacyAnswer, renderAnswerReveal };

  return <div className={styles.page}><main className={styles.content}>
    <header className={styles.heading}><div><strong>Reading · Part {number}</strong><span>{paper.title}</span></div><SaveIndicator status={saveStatus} /></header>
    <InstructionBlock title={`Part ${number}`}>{instructions[number]}</InstructionBlock>
    <ReadingTestContext.Provider value={provider}>
      <div className={styles.task}>{number === 1 ? <Part1GapFilling data={data} /> : number === 2 ? <Part2TextCohesion data={data} />
        : number === 3 ? <Part3OpinionMatch data={data} /> : <Part4MatchHeading data={data} />}</div>
    </ReadingTestContext.Provider>
  </main>
  <TestFooter partLabel={`Part ${number}`} questions={questionIds.map((id, index) => ({ id, displayLabel: index + 1 }))}
    answeredIds={answeredIds} currentPageQuestionIds={questionIds} onQuestionClick={() => undefined}
    onPrevClick={() => number > 1 && navigate(`/reading/test/part${number - 1}?${searchParams.toString()}`)}
    onNextClick={() => number < 4 && navigate(`/reading/test/part${number + 1}?${searchParams.toString()}`)}
    onSubmitClick={primary} submitLabel={isFull && number < 4 ? 'Next Part' : 'Submit'} hasPrev={isFull && number > 1} hasNext={isFull && number < 4} />
  <SubmitModal isOpen={showSubmit} onBack={() => setShowSubmit(false)} onNext={finish} />
  </div>;
}
