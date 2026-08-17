import { useNavigate } from 'react-router-dom';
import styles from './SpeakingFeedPage.module.css';

const popularDocs = Array.from({ length: 5 }, (_, index) => ({
  id: index + 1,
  title: 'APTIS SPEAKING PRACTICE',
  subTitle: 'Practice questions with detailed explanations',
  badge: 'LATEST 2026',
  desc: 'Improve your speaking skills with regularly updated Aptis practice materials.',
}));

export default function SpeakingFeedPage() {
  const navigate = useNavigate();

  const bandScores = [
    {
      band: 'Level C',
      level: 'Expert user',
      desc: 'Speaks fluently and naturally, with almost no hesitation in finding words. Ideas are expanded logically and profoundly, especially in Part 4. Uses a rich vocabulary, including idioms and fixed phrases (collocations). Able to express abstract topics easily.'
    },
    {
      band: 'Level B2',
      level: 'Good user',
      desc: 'Able to speak continuously within the allotted time. Occasionally hesitates when handling difficult topics, but does not interrupt the flow of the conversation for too long. Uses complex sentences and different tenses well. Grammatical errors are few and do not affect the content.'
    },
    {
      band: 'Level B1',
      level: 'Independent user',
      desc: 'Speaks at length without noticeable effort or loss of coherence. May demonstrate language-related hesitation at times, or some repetition and/or self-correction. Uses a range of connectives and discourse markers with some flexibility.'
    },
    {
      band: 'Level A2',
      level: 'Basic user',
      desc: 'Usually maintains the flow of speech but uses repetition, self-correction, and/or slow speech to keep going. Cannot respond without noticeable pauses and may speak slowly. Links basic sentences but with some breakdowns in coherence. Able to talk about familiar topics.'
    },
    {
      band: 'Level A1',
      level: 'Beginner user',
      desc: 'Pauses lengthily before most words with little communication possible. Produces only isolated words or memorized utterances. In some cases, no communication is possible and no rateable language is present.'
    }
  ];

  return (
    <div className={styles.page}>
      <div className={styles.section}>
        <div className={styles.titleContainer}>
          <div className={styles.title}>
            <span className={styles.titleLight}>SPEAKING</span> FEED
          </div>
          <div className={styles.divider}></div>
        </div>
        <div className={styles.contentBlock}>
          <div className={styles.heading}>
            <span className={styles.headingBold}>Speaking </span>
            <span className={styles.headingLight}>band scores</span>
          </div>
          <div className={styles.textBlock}>
            <p>The Aptis Speaking test is assessed by experienced language experts to ensure objectivity and accuracy. Examiners evaluate your recorded responses against standardized assessment criteria, and their performance is subject to regular quality monitoring and review.</p>
            <p>The Speaking test consists of four parts that increase in difficulty, assessing language proficiency from beginner to advanced levels (A1 – C2 on the CEFR scale). Candidates complete the test on a computer, and the total duration is approximately 12 minutes.</p>
            <p>Your responses in the Speaking component are assessed against the following criteria:</p>
            <p>Grammatical Range and Accuracy: The ability to use a variety of grammatical structures and appropriate vocabulary accurately.</p>
            <p>Pronunciation: The clarity of speech, including individual sounds, word stress, and natural intonation.</p>
            <p>Fluency: The speed and smoothness of speech, and the ability to link ideas together without excessive hesitation.</p>
            <p>Task Fulfillment: The ability to address the prompt effectively, providing relevant answers and developing ideas within the given time limits.</p>
            <p>Each part of the Speaking test focuses on specific skills, ranging from providing basic personal information to comparing and discussing abstract topics. To find out more about the detailed scoring levels, you can refer to the official AptiMate public band descriptors.</p>
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
