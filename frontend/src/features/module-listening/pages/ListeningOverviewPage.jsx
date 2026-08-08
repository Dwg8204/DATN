import { useNavigate } from 'react-router-dom';
import styles from './ListeningOverviewPage.module.css';

const popularDocs = Array.from({ length: 5 }, (_, index) => ({
  id: index + 1,
  title: 'APTIS LISTENING PRACTICE',
  subTitle: 'Practice questions with detailed explanations',
  badge: 'LATEST 2026',
  desc: 'Improve your listening skills with regularly updated Aptis practice materials.',
}));

export default function ListeningOverviewPage() {
  const navigate = useNavigate();

  return (
    <div className={styles.page}>
      <div className={styles.section}>
        <div className={styles.titleContainer}>
          <div className={styles.title}>
            <span className={styles.titleLight}>LISTENING</span> OVERVIEW
          </div>
          <div className={styles.divider}></div>
        </div>
        <div className={styles.contentBlock}>
          <div className={styles.heading}>
            <span className={styles.headingBold}>A quick look at the </span>
            <span className={styles.headingLight}>Aptis Listening</span>
            <span className={styles.headingBold}> test</span>
          </div>
          <div className={styles.textBlock}>
            <p>Duration: approximately 40 minutes</p>
            <p>
              The Listening test is relevant for both Aptis and Aptis ESOL. You will need to complete 17 tasks with a total of 20 questions in response to multiple recordings focusing on different aspects of real-life listening.
            </p>
            <p>
              You will listen to a variety of recordings including short messages, dialogues, short monologues and longer monologues. You can hear each recording twice.
              <br />These questions test your ability to:
              <br />- Identify specific information from short messages or dialogues
              <br />- Match speakers to pieces of information on a common topic
              <br />- Identify who expresses which opinion in a discussion
              <br />- Identify a speaker's opinion or point of view in longer monologues
            </p>
          </div>
        </div>

        <div className={styles.contentBlock}>
          <div className={styles.subHeading}>Listening part details:</div>
          <div className={styles.textBlock}>
            Part 1 — Information recognition: You will listen to a short message or a dialogue and need to identify specific information such as a phone number, a time or a place.<br />
            Part 2 — Information matching: You will listen to short monologues on a common topic by four different people. You will be asked to match each speaker to a piece of information.<br />
            Part 3 — Inference (discussion): You will listen to a man and a woman discuss a topic and express certain opinions. You will be asked to identify who expresses which opinion.<br />
            Part 4 — Inference (longer monologues): You will listen to two longer monologues on different topics. You will be asked to identify the speaker's opinion or point of view on two aspects of each topic.
          </div>
        </div>
      </div>

      <div className={styles.section}>
        <div className={styles.titleContainer}>
          <div className={styles.title}>LISTENING DOCUMENTS</div>
          <div className={styles.divider}></div>
        </div>
        <div className={styles.contentBlock}>
          <div className={styles.documentLink}>Some tips for taking the APTIS Listening test</div>
          <div className={styles.documentLink}>APTIS Listening practice test</div>
          <div className={styles.documentLink}>Question types in the APTIS Listening test</div>
          <div className={styles.documentLink}>APTIS Listening band scores</div>
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
      
      <button className={styles.goToTestBtn} onClick={() => navigate('/listening/tests')}>
        View Test List
      </button>
    </div>
  );
}
