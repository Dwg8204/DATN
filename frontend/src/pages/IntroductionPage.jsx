import { useNavigate, useParams } from 'react-router-dom';
import styles from './IntroductionPage.module.css';

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
      'This test consists of 4 parts.\nThe tasks become more difficult as the test progresses.\nThe test clock will show you when there are 10 minutes and 5 minutes remaining.',
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
    instructions: 'Answer all the questions.\nYou can change your answers at any time during the test.',
    information:
      'This test consists of 4 parts.\nThe tasks become more difficult as the test progresses.\nThe test clock will show you when there are 10 minutes and 5 minutes remaining.',
  },
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

  // Use props first, then fall back to skill config from URL params
  const config = skillConfigs[skill] || skillConfigs.reading;
  const finalTitle = title || config.title;
  const finalTime = time || config.time;
  const finalInstructions = instructions || config.instructions;
  const finalInformation = information || config.information;

  const handleStartTest = () => {
    if (onStartTest) {
      onStartTest();
    } else if (skill) {
      navigate(`/${skill}/test`);
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
