
import PopularDocumentCard from '../../../components/shared/PopularDocumentCard/PopularDocumentCard';
import styles from './ListeningFeedPage.module.css';

export default function ListeningFeedPage() {
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
    <div className={styles.pageContainer}>
      <div className={styles.mainLayout}>
        {/* Left Column - Article */}
        <div className={styles.articleSection}>
          <h1 className={styles.mainTitle}>Aptis Listening band scores</h1>
          <h2 className={styles.subTitle}>Listening band scores</h2>
          
          <div className={styles.textContent}>
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

      <div className={styles.bottomSection}>
        <div className={styles.documentsBlock}>
          <h2 className={styles.bottomTitle}>LISTENING DOCUMENTS</h2>
          <div className={styles.docLinks}>
            <a href="#" className={styles.docLink}>Some tips for taking the APTIS Listening test</a>
            <a href="#" className={styles.docLink}>APTIS Listening practice test</a>
            <a href="#" className={styles.docLink}>Question types in the APTIS Listening test</a>
            <a href="#" className={styles.docLink}>APTIS Listening band scores</a>
          </div>
        </div>

        <div className={styles.popularBlock}>
          <h2 className={styles.bottomTitle}>MOST POPULAR</h2>
          <div className={styles.popularGrid}>
            <PopularDocumentCard 
              skillName="WRITING" 
              description="Explore the latest Aptis Writing samples, updated regularly."
            />
            <PopularDocumentCard 
              skillName="READING" 
              description="Explore the latest Aptis Reading samples, updated regularly."
            />
            <PopularDocumentCard 
              skillName="LISTENING" 
              description="Explore the latest Aptis Listening samples, updated regularly."
            />
            <PopularDocumentCard 
              skillName="SPEAKING" 
              description="Explore the latest Aptis Speaking samples, updated regularly."
            />
          </div>
        </div>
      </div>
    </div>
  );
}
