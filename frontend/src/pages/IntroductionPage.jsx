import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import styles from './IntroductionPage.module.css';
import { startGrammarVocabSession } from '../features/grammar_vocab/utils/grammarVocabSessionStorage';
import { startListeningSession } from '../features/module-listening/utils/listeningSessionStorage';
import { startReadingSession } from '../features/module-reading/utils/readingSessionStorage';
import { startWritingSession } from '../features/writing/utils/writingSessionStorage';

const skillConfigs = {
  reading: {
    title: 'APTIS GENERAL READING',
    time: 'Time: 35 min',
    instructions: 'Answer all the questions.\nYou can change your answers at any time during the test.',
    information:
      'This test consists of 4 parts.\nThe tasks become more difficult as the test progresses.\nThe test clock will show you when there are 10 minutes and 5 minutes remaining.',
  },
  listening: {
    title: 'APTIS GENERAL LISTENING',
    time: 'Time: 40 min',
    instructions: 'Answer all the questions.\nYou can change your answers at any time during the test.',
    information:
      'There are 17 tasks and a total of 20 different recordings in this test.\nThere are four parts to the test.\nTo listen, just click on the Play button.\nYou can hear each recording twice.\nEach question carries one mark.',
  },
  writing: {
    title: 'APTIS GENERAL WRITING',
    time: 'Time: 50 min',
    instructions: 'Answer all the questions.\nYou can change your answers at any time during the test.',
    information:
      'This test consists of 4 parts.\nThe tasks become more difficult as the test progresses.\nThe test clock will show you when there are 10 minutes and 5 minutes remaining.',
  },
  speaking: {
    title: 'APTIS GENERAL SPEAKING',
    time: 'Time: 12 min',
    instructions: 'Ensure your headphones and camera are working properly before starting.\nPlease note that you will not be able to go back to a previous section of the test.\nMake sure to answer each question carefully.',
    information:
      'In the APTIS Speaking test, you will have a 12-minute discussion with our AI examiner.\nThis discussion will be interactive and as close to a real conversation as possible.\nA visible timer will indicate the remaining time for each part of the test.',
  },
  'grammar-vocab': {
    title: 'APTIS GENERAL GRAMMAR & VOCABULARY',
    time: 'Time: 25 min',
    instructions: 'Answer all the questions.\nYou can change your answers at any time during the test.',
    information:
      'This test consists of 2 parts.\nPart 1 focuses on grammar and Part 2 focuses on vocabulary.\nThe test clock will show you when there are 10 minutes and 5 minutes remaining.',
  }
};

const readingModeConfigs = {
  part1: {
    title: 'APTIS GENERAL READING - PART 1',
    time: 'Time: 5 min',
    instructions: 'Read the short text. Choose a word from the list to complete the text.',
    information: 'This part consists of 1 short letter with 5 gaps. Choose the correct word for each gap.'
  },
  part2: {
    title: 'APTIS GENERAL READING - PART 2',
    time: 'Time: 6 min',
    instructions: 'The sentences below are from a report. Put the sentences in the right order.',
    information: 'This part consists of 1 short text split into 6 sentences. Put them in the correct order.'
  },
  part3: {
    title: 'APTIS GENERAL READING - PART 3',
    time: 'Time: 10 min',
    instructions: 'Read the opinions of four people and match them to the statements.',
    information: 'This part consists of 4 short texts from 4 people. Match the 7 statements to the correct speakers.'
  },
  part4: {
    title: 'APTIS GENERAL READING - PART 4',
    time: 'Time: 14 min',
    instructions: 'Read the passage. Choose a heading for each numbered paragraph.',
    information: 'This part consists of a long text with 7 paragraphs. Select the best heading for each paragraph from the 8 options.'
  },
  full: {
    title: 'APTIS GENERAL READING',
    time: 'Time: 35 min',
    instructions: 'Answer all the questions.\nYou can change your answers at any time during the test.',
    information: 'This test consists of 4 parts.\nThe tasks become more difficult as the test progresses.\nThe test clock will show you when there are 10 minutes and 5 minutes remaining.'
  }
};

export default function IntroductionPage({
  title,
  time,
  instructions,
  information,
  warningText = "Do not click 'Start test' until you are told to do so.",
  startButtonText = 'Start test',
  onStartTest,
}) {
  const navigate = useNavigate();
  const { skill } = useParams();
  const [searchParams] = useSearchParams();
  const mode = searchParams.get('mode') || 'full';

  // Use props first, then fall back to skill config from URL params
  let config = skillConfigs[skill] || skillConfigs.reading;
  if (skill === 'reading' && readingModeConfigs[mode]) {
    config = readingModeConfigs[mode];
  }

  const finalTitle = title || config.title;
  const finalTime = time || config.time;
  const finalInstructions = instructions || config.instructions;
  const finalInformation = information || config.information;

  const handleStartTest = () => {
    if (onStartTest) {
      onStartTest();
    } else if (skill) {
      const testId = searchParams.get('testId') || '1';

      if (skill === 'grammar-vocab') {
        startGrammarVocabSession(testId, mode, { force: true });
        if (mode === 'full') {
          navigate(`/${skill}/test/part1${testId ? `?testId=${testId}&isFull=true` : '?isFull=true'}`);
        } else {
          navigate(`/${skill}/test/${mode}${testId ? `?testId=${testId}` : ''}`);
        }
      } else if (skill === 'listening') {
        startListeningSession(testId, mode, { force: true });
        if (mode === 'full') {
          navigate(`/${skill}/test/part1${testId ? `?testId=${testId}&isFull=true` : '?isFull=true'}`);
        } else {
          navigate(`/${skill}/test/${mode}${testId ? `?testId=${testId}` : ''}`);
        }
      } else if (skill === 'reading') {
        startReadingSession(testId, mode, { force: true });
        navigate(`/reading/test/${testId}?mode=${mode}`);
      } else if (skill === 'writing') {
        startWritingSession(testId, mode, { force: true });
        const firstPart = mode === 'full' ? 'part1' : mode;
        navigate(`/writing/test/${firstPart}?testId=${testId}${mode === 'full' ? '&isFull=true' : ''}&fresh=true`);
      } else if (skill === 'speaking') {
        const firstPart = mode === 'full' ? 'part1' : mode;
        navigate(`/speaking/test/${firstPart}?testId=${testId}${mode === 'full' ? '&isFull=true' : ''}`);
      }
    }
  };

  return (
    <div className={styles.wrapper}>
      <div className={styles.card}>
        <div className={styles.cardContent}>
          {/* Title & Time */}
          <div className={styles.titleBlock}>
            <div className={styles.titleWrap}>
              <span className={styles.title}>{finalTitle}</span>
            </div>
            <span className={styles.time}>{finalTime}</span>
          </div>

          {/* Instructions */}
          <div className={styles.infoBlock}>
            <span className={styles.infoTitle}>INSTRUCTIONS TO CANDIDATES</span>
            <span className={styles.infoText}>
              {finalInstructions.split('\n').map((line, i) => (
                <span key={i}>
                  {line}
                  {i < finalInstructions.split('\n').length - 1 && <br />}
                </span>
              ))}
            </span>
          </div>

          {/* Information */}
          <div className={styles.infoBlockWide}>
            <span className={styles.infoTitle}>INFORMATION FOR CANDIDATES</span>
            <span className={styles.infoTextWide}>
              {finalInformation.split('\n').map((line, i) => (
                <span key={i}>
                  {line}
                  {i < finalInformation.split('\n').length - 1 && <br />}
                </span>
              ))}
            </span>
          </div>
        </div>

        {/* Action */}
        <div className={styles.actionBlock}>
          <span className={styles.warning}>{warningText}</span>
          <button className={styles.startBtn} onClick={handleStartTest}>
            <span className={styles.startBtnText}>{startButtonText}</span>
          </button>
        </div>
      </div>
    </div>
  );
}
