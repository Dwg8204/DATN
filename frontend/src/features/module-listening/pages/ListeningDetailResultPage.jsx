import { useMemo } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import AnswerExplanation from '../../../components/common/AnswerExplanation';
import RichTextContent from '../../../components/common/RichTextContent';
import AudioPlayer from '../../../components/shared/AudioPlayer/AudioPlayer';
import TestFooter from '../../../components/layout/TestFooter';
import { AttemptPageState } from '../../test-attempts/components/AttemptPageState';
import { useAttemptPartResult, useAttemptResult } from '../../test-attempts/hooks/useAttemptResult';
import AttemptScoreSummary from '../../test-attempts/components/AttemptScoreSummary';
import useUrlQueryState, { queryParam } from '../../../hooks/useUrlQueryState';
import styles from './ListeningDetailResultPage.module.css';

const DETAIL_QUERY_SCHEMA = {
  selectedPart: { ...queryParam.positiveInt(1, 4), param: 'part' },
  currentPage: { ...queryParam.positiveInt(1), param: 'page' },
};
const statusName = outcome => outcome === 'CORRECT' ? 'correct' : outcome === 'INCORRECT' ? 'wrong' : 'skipped';

function StatusBadge({ outcome }) {
  const status = statusName(outcome);
  const labels = { correct: 'Correct', wrong: 'Incorrect', skipped: 'Skipped' };
  return <span className={`${styles.statusBadge} ${styles[status]}`}>{labels[status]}</span>;
}

function Part1Review({ questions, itemMap }) {
  return <div className={styles.contentRow}>
    <div className={styles.qaBox} style={{ flex: 1 }}>
      {questions.map((question, index) => {
        const item = itemMap.get(question.key);
        const selected = item?.selectedAnswer?.optionId;
        return <article className={styles.questionCard} key={question.key}>
          <div className={styles.questionHeading}><span className={styles.questionNumber}>{index + 1}</span><RichTextContent value={question.text} /><StatusBadge outcome={item?.outcome?.outcome} /></div>
          <div className={styles.optionsList}>{question.options.map(option => {
            const correct = option.id === item?.correctAnswer;
            const wrongSelection = option.id === selected && !correct;
            return <div className={`${styles.optionRow} ${correct ? styles.correctOption : ''} ${wrongSelection ? styles.wrongOption : ''}`} key={option.id}>
              <span className={styles.optionLetter}>{String.fromCharCode(65 + Number(option.id.slice(1)))}</span><span>{option.text}</span>
            </div>;
          })}</div>
        </article>;
      })}
    </div>
  </div>;
}

function Part2Review({ speakers, options, itemMap }) {
  return <div className={styles.contentRow}>
    <div className={styles.qaBox} style={{ flex: 1 }}>
      <div className={styles.matchingList}>{speakers.map((speaker, index) => {
        const item = itemMap.get(speaker.key);
        const status = statusName(item?.outcome?.outcome);
        const selected = options.find(option => option.id === item?.selectedAnswer?.optionId);
        const correct = options.find(option => option.id === item?.correctAnswer);
        return <article className={styles.matchingItem} key={speaker.key}>
          <div className={styles.matchingRow}>
            <span className={styles.targetWord}>{speaker.name} =</span>
            <div className={styles.answerColumn}>
              <div className={`${styles.answerField} ${styles[`${status}Field`]}`}>{selected ? selected.text : 'No answer'}</div>
              {status !== 'correct' && correct && <div className={styles.correctField}><strong>{correct.text}</strong></div>}
            </div>
            <StatusBadge outcome={item?.outcome?.outcome} />
          </div>
        </article>;
      })}</div>
    </div>
  </div>;
}

function Part3Review({ statements, options, itemMap }) {
  return <div className={styles.contentRow}>
    <div className={styles.qaBox} style={{ flex: 1 }}>
      <div className={styles.matchingList}>{statements.map((stmt) => {
        const item = itemMap.get(stmt.key);
        const status = statusName(item?.outcome?.outcome);
        const selected = options.find(option => option.id === item?.selectedAnswer?.optionId);
        const correct = options.find(option => option.id === item?.correctAnswer);
        return <article className={styles.matchingItem} key={stmt.key}>
          <div className={styles.matchingCol}>
            <div className={styles.matchingColHeader}>
              <RichTextContent value={stmt.text} className={styles.targetWord} style={{ fontWeight: 'normal', flex: 1 }} />
              <StatusBadge outcome={item?.outcome?.outcome} />
            </div>
            <div className={styles.answerColumn}>
              <div className={`${styles.answerField} ${styles[`${status}Field`]}`}>{selected ? selected.text : 'No answer'}</div>
              {status !== 'correct' && correct && <div className={styles.correctField}><strong>{correct.text}</strong></div>}
            </div>
          </div>
        </article>;
      })}</div>
    </div>
  </div>;
}

function Part4Review({ recordings, itemMap, currentRecordingIndex, isFullTest }) {
  const recording = recordings[currentRecordingIndex];
  if (!recording) return null;
  const allQuestions = recordings.flatMap(r => r.subQuestions);

  return <div className={styles.contentRow}>
    <div className={styles.qaBox} style={{ flex: 1 }}>
      {recording.subQuestions.map(question => {
        const item = itemMap.get(question.key);
        const selected = item?.selectedAnswer?.optionId;
        const globalIdx = allQuestions.findIndex(q => q.key === question.key);
        const displayLabel = isFullTest ? 16 + globalIdx : 1 + globalIdx;
        return <article className={styles.questionCard} key={question.key}>
          <div className={styles.questionHeading}><span className={styles.questionNumber}>{displayLabel}</span><RichTextContent value={question.text} /><StatusBadge outcome={item?.outcome?.outcome} /></div>
          <div className={styles.optionsList}>{question.options.map((option, idx) => {
            const correct = option.id === item?.correctAnswer;
            const wrongSelection = option.id === selected && !correct;
            return <div className={`${styles.optionRow} ${correct ? styles.correctOption : ''} ${wrongSelection ? styles.wrongOption : ''}`} key={option.id}>
              <span className={styles.optionLetter}>{String.fromCharCode(65 + idx)}</span><span>{option.text}</span>
            </div>;
          })}</div>
        </article>;
      })}
    </div>
  </div>;
}

export default function ListeningDetailResultPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const attemptId = searchParams.get('attemptId');
  const [urlState, setUrlState] = useUrlQueryState(DETAIL_QUERY_SCHEMA);
  const { selectedPart, currentPage } = urlState;
  const setCurrentPage = next => setUrlState(current => ({ currentPage: typeof next === 'function' ? next(current.currentPage) : next }));
  
  const summary = useAttemptResult(attemptId);
  const availableParts = useMemo(() => summary.data?.result?.parts?.map(part => part.partNumber).sort((a, b) => a - b) ?? [], [summary.data]);
  const activePart = availableParts.includes(selectedPart) ? selectedPart : availableParts[0] ?? null;
  
  const detail = useAttemptPartResult(attemptId, activePart);
  const paper = detail.data?.paper;
  const itemMap = useMemo(() => new Map((detail.data?.items ?? []).map(item => [item.key, item])), [detail.data]);
  
  const isFullTest = availableParts.length > 1;

  if (summary.loading || summary.error) return <AttemptPageState loading={summary.loading} error={summary.error} />;
  if (!activePart || detail.loading || detail.error) return <AttemptPageState loading={!detail.error} error={detail.error} />;

  let content = null;
  let totalPages = 1;
  let footerQuestions = [];
  let currentQuestionIds = [];
  let audioUrl = null;
  
  if (activePart === 1) {
    const questions = paper?.questions ?? [];
    totalPages = questions.length;
    footerQuestions = questions.map((q, idx) => ({ id: q.key, displayLabel: idx + 1 }));
    currentQuestionIds = [questions[currentPage - 1]?.key];
    audioUrl = questions[currentPage - 1]?.audioUrl;
    content = <Part1Review questions={[questions[currentPage - 1]].filter(Boolean)} itemMap={itemMap} />;
  } else if (activePart === 2) {
    totalPages = 1;
    footerQuestions = [{ id: 'p2', displayLabel: 14 }];
    currentQuestionIds = ['p2'];
    audioUrl = paper?.audioUrl;
    content = <Part2Review speakers={paper?.speakers ?? []} options={paper?.options ?? []} itemMap={itemMap} />;
  } else if (activePart === 3) {
    totalPages = 1;
    footerQuestions = [{ id: 'p3', displayLabel: 15 }];
    currentQuestionIds = ['p3'];
    audioUrl = paper?.audioUrl;
    content = <Part3Review statements={paper?.statements ?? []} options={paper?.options ?? []} itemMap={itemMap} />;
  } else if (activePart === 4) {
    const recordings = paper?.recordings ?? [];
    totalPages = recordings.length;
    const allQuestions = recordings.flatMap(r => r.subQuestions);
    footerQuestions = allQuestions.map((q, idx) => ({ id: q.key, displayLabel: isFullTest ? 16 + idx : 1 + idx }));
    currentQuestionIds = recordings[currentPage - 1]?.subQuestions.map(q => q.key) ?? [];
    audioUrl = recordings[currentPage - 1]?.audioUrl;
    content = <Part4Review recordings={recordings} itemMap={itemMap} currentRecordingIndex={currentPage - 1} isFullTest={isFullTest} />;
  }

  const answeredIds = (detail.data?.items ?? []).filter(item => item.selectedAnswer).map(item => item.key);

  const changePart = part => setUrlState({ selectedPart: part, currentPage: 1 });
  const previous = () => {
    if (currentPage > 1) setCurrentPage(page => page - 1);
    else {
      const index = availableParts.indexOf(activePart);
      if (index > 0) setUrlState({ selectedPart: availableParts[index - 1], currentPage: 1 });
    }
  };
  const next = () => {
    if (currentPage < totalPages) setCurrentPage(page => page + 1);
    else {
      const index = availableParts.indexOf(activePart);
      if (index < availableParts.length - 1) setUrlState({ selectedPart: availableParts[index + 1], currentPage: 1 });
    }
  };

  const getSectionTitle = () => {
    if (activePart === 1) return `Question ${currentPage}`;
    if (activePart === 2) return `Questions 14.1-14.4`;
    if (activePart === 3) return `Questions 15a-15d`;
    if (activePart === 4) {
      const qs = currentQuestionIds;
      if (qs.length === 0) return '';
      const allQs = paper?.recordings?.flatMap(r => r.subQuestions) ?? [];
      const firstIdx = allQs.findIndex(q => q.key === qs[0]);
      const lastIdx = allQs.findIndex(q => q.key === qs[qs.length - 1]);
      const start = isFullTest ? 16 + firstIdx : 1 + firstIdx;
      const end = isFullTest ? 16 + lastIdx : 1 + lastIdx;
      return `Questions ${start}-${end}`;
    }
  };

  const getSectionSubtitle = () => {
    if (activePart === 1) return 'Information recognition';
    if (activePart === 2) return 'Information matching';
    if (activePart === 3) return 'Inference/discussion';
    if (activePart === 4) return 'Identifying opinions';
  };

  return <div className={styles.page}>
    <main className={styles.content}>
      <AttemptScoreSummary score={summary.data?.score} maxScore={summary.data?.maxScore} title="Final score" subtitle="Listening" />
      {isFullTest && <div className={styles.partTabs}>{availableParts.map(part => <button key={part} className={activePart === part ? styles.activeTab : ''} onClick={() => changePart(part)}>Part {part}</button>)}</div>}
      <div className={styles.sectionHeader}>
        <strong>{getSectionTitle()}</strong>
        <span>{getSectionSubtitle()}</span>
      </div>
      {content}
      <div className={styles.audioBar}>
        {audioUrl && <AudioPlayer src={audioUrl} maxPlays={Infinity} compact />}
      </div>
    </main>
    <TestFooter
      partLabel={`Part ${activePart}`}
      questions={footerQuestions}
      answeredIds={answeredIds}
      currentPageQuestionIds={currentQuestionIds}
      onQuestionClick={key => {
        if (activePart === 1) setCurrentPage(paper?.questions?.findIndex(q => q.key === key) + 1);
        else if (activePart === 4) setCurrentPage(paper?.recordings?.findIndex(r => r.subQuestions.some(sq => sq.key === key)) + 1);
      }}
      onPrevClick={previous}
      onNextClick={next}
      onSubmitClick={() => navigate('/listening/tests')}
      submitLabel="Take another test"
      hasPrev={currentPage > 1 || availableParts.indexOf(activePart) > 0}
      hasNext={currentPage < totalPages || availableParts.indexOf(activePart) < availableParts.length - 1}
    />
  </div>;
}
