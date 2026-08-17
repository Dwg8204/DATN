import { useNavigate } from 'react-router-dom';
import styles from './SpeakingOverviewPage.module.css';

const popularDocs = Array.from({ length: 5 }, (_, index) => ({
  id: index + 1,
  title: 'APTIS SPEAKING PRACTICE',
  subTitle: 'Practice questions with detailed explanations',
  badge: 'LATEST 2026',
  desc: 'Improve your speaking skills with regularly updated Aptis practice materials.',
}));

export default function SpeakingOverviewPage() {
  const navigate = useNavigate();

  return (
    <div className={styles.page}>
      <div className={styles.section}>
        <div className={styles.titleContainer}>
          <div className={styles.title}>
            <span className={styles.titleLight}>SPEAKING</span> TEST
          </div>
          <div className={styles.divider}></div>
        </div>
        <div className={styles.contentBlock}>
          <div className={styles.heading}>
            <span className={styles.headingBold}>A quick look at the </span>
            <span className={styles.headingLight}>Aptis Speaking</span>
            <span className={styles.headingBold}> test</span>
          </div>
          <div className={styles.textBlock}>
            <p>The Aptis Speaking component tests your ability to communicate in English in real-life situations.</p>
            <p>
              It takes about 12 minutes and it is divided into four sections. Your responses will be recorded and marked by our examiners.
            </p>
            <p>
              If you are taking Aptis Advanced, you will have 10 minutes to complete this part.
            </p>
          </div>
        </div>

        <div className={styles.contentBlock}>
          <div className={styles.subHeading}>Speaking part details:</div>
          <div className={styles.textBlock}>
            Part 1: Sentence comprehension<br />
            You will be asked three questions about yourself and your interests. You are expected to speak for 30 seconds for each question.<br /><br />
            Part 2: Describe, express opinion and provide reasons and explanations<br />
            You will be asked to describe a photograph, then answer two questions on the topic of the photograph. The questions will ask you to talk about your own experience of the topic and to comment on some more general aspect of the topic. In this part you are expected to speak for 45 seconds for each response.<br /><br />
            Part 3: Describe, compare and provide reasons and explanations<br />
            You will be asked to describe two photographs, then answer two questions on the topic of the photographs. The questions will ask you to compare some aspect of the topic and to express an opinion on or speculate about the topic. Again, you are expected to speak for 45 seconds for each response.<br /><br />
            Part 4: Discuss personal experience and opinion on an abstract topic<br />
            You will be asked three questions on a single topic and given one minute to prepare an answer. You can take brief notes and use these to help structure your answer. You are expected to talk for two minutes.
          </div>
        </div>
      </div>

      <div className={styles.section}>
        <div className={styles.titleContainer}>
          <div className={styles.title}>SPEAKING DOCUMENTS</div>
          <div className={styles.divider}></div>
        </div>
        <div className={styles.contentBlock}>
          <div className={styles.documentLink}>Some tips for taking the APTIS Speaking test</div>
          <div className={styles.documentLink}>APTIS Speaking practice test</div>
          <div className={styles.documentLink}>Question types in the APTIS Speaking test</div>
          <div className={styles.documentLink}>APTIS Speaking band scores</div>
        </div>
      </div>

      <div className={styles.section}>
        <div className={styles.popularTitle}>MOST POPULAR</div>
        <div className={styles.popularGrid}>
          {popularDocs.map((doc) => (
            <div key={doc.id} className={styles.popularCard}>
              <div className={styles.cardHeader}>
                <div className={styles.cardHeaderTop}>
                  <div className={styles.cardTitle}>{doc.title}</div>
                  <div className={styles.cardSubTitle}>{doc.subTitle}</div>
                </div>
                <div className={styles.cardBadge}>
                  <span className={styles.cardBadgeText}>{doc.badge}</span>
                </div>
              </div>
              <div className={styles.cardBody}>
                <div className={styles.cardBodyText}>{doc.desc}</div>
              </div>
            </div>
          ))}
        </div>
      </div>
      
      <button className={styles.goToTestBtn} onClick={() => navigate('/speaking/tests')}>
        View Test List
      </button>
    </div>
  );
}
