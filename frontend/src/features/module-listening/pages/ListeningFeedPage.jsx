import { useNavigate } from 'react-router-dom';
import styles from './ListeningFeedPage.module.css';

const popularDocs = Array.from({ length: 5 }, (_, index) => ({
  id: index + 1,
  title: 'APTIS LISTENING PRACTICE',
  subTitle: 'Practice questions with detailed explanations',
  badge: 'LATEST 2026',
  desc: 'Improve your listening skills with regularly updated Aptis practice materials.',
}));

export default function ListeningFeedPage() {
  const navigate = useNavigate();

  const bandScores = [
    {
      band: 'C — Proficient',
      level: 'Expert user',
      desc: 'Can fully and accurately understand all types of listening tasks, including complex opinion inference in extended monologues. Demonstrates no difficulty in processing information across a wide range of real-life situations.'
    },
    {
      band: 'B2 — Upper Intermediate',
      level: 'Good user',
      desc: 'Can identify specific information, match details, and infer opinions in most situations. May occasionally make minor errors in more complex or inference-based listening tasks, but overall demonstrates a strong ability to handle the different task types in the test.'
    },
    {
      band: 'B1 — Intermediate',
      level: 'Independent user',
      desc: 'Can process specific information and perform basic matching tasks. May experience difficulty with listening tasks that require opinion inference or involve more abstract and complex content.'
    },
    {
      band: 'A2 — Elementary',
      level: 'Basic user',
      desc: 'Can recognise very simple and familiar information such as phone numbers, times, and places in short conversations. Has significant difficulty with matching tasks and inferring opinions.'
    },
    {
      band: 'A1 — Beginner',
      level: 'Beginner user',
      desc: 'Can only understand isolated words or simple phrases in very familiar contexts. Listening ability is very limited, and the user is not yet able to infer meaning or match information systematically.'
    }
  ];

  return (
    <div className={styles.page}>
      <div className={styles.section}>
        <div className={styles.titleContainer}>
          <div className={styles.title}>
            <span className={styles.titleLight}>APTIS LISTENING</span> BAND SCORES
          </div>
          <div className={styles.divider}></div>
        </div>
        <div className={styles.contentBlock}>
          <div className={styles.heading}>
            <span className={styles.headingBold}>Listening </span>
            <span className={styles.headingLight}>band scores</span>
          </div>
          <div className={styles.textBlock}>
            <p>The Aptis Listening test consists of 17 tasks with a total of 20 questions based on a variety of audio recordings. It focuses on listening skills in real-life situations. Your final score is calculated based on the number of correct answers you provide.</p>
            <p>The questions in the Listening test are based on four different task types: identifying specific information from short messages or conversations (Part 1), matching information from four speakers talking about the same topic (Part 2), inferring opinions from a conversation between a man and a woman (Part 3), and inferring opinions from longer monologues on a range of topics (Part 4).</p>
            <p>You will have approximately 40 minutes to complete the Listening test. Each correct answer is worth one mark, and the total score is converted to the Aptis scale from A1 to C. Each audio recording can be played a maximum of two times.</p>
            <p>For example, to achieve a B2 level in the Listening test, you need to reach the required score threshold according to the Aptis scale, demonstrating your ability to process real-life information and infer meaning across a range of contexts.</p>
          </div>

          <div className={styles.bandScoresGrid}>
            {bandScores.map((score, index) => (
              <div key={index} className={styles.scoreCard}>
                <h3 className={styles.scoreBand}>{score.band}</h3>
                <div className={styles.scoreDetail}>
                  <div className={styles.scoreRow}>
                    <span className={styles.scoreLabel}>Skill level</span>
                    <span className={styles.scoreValue}>{score.level}</span>
                  </div>
                  <div className={styles.scoreRow}>
                    <span className={styles.scoreLabel}>Description</span>
                    <span className={styles.scoreValue}>{score.desc}</span>
                  </div>
                </div>
              </div>
            ))}
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
