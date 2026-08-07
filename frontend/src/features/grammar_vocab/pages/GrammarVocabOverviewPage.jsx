import { useNavigate } from 'react-router-dom';
import styles from './GrammarVocabOverviewPage.module.css';

const popularDocs = Array.from({ length: 5 }, (_, index) => ({
  id: index + 1,
  title: 'APTIS GRAMMAR & VOCABULARY PRACTICE',
  subTitle: 'Practice questions with detailed explanations',
  badge: 'LATEST 2026',
  desc: 'Improve your grammar and vocabulary with regularly updated Aptis practice materials.',
}));

export default function GrammarVocabOverviewPage() {
  const navigate = useNavigate();

  return (
    <div className={styles.page}>
      <div className={styles.section}>
        <div className={styles.titleContainer}>
          <div className={styles.title}>
            <span className={styles.titleLight}>GRAMMAR & VOCAB</span> OVERVIEW
          </div>
          <div className={styles.divider}></div>
        </div>
        <div className={styles.contentBlock}>
          <div className={styles.heading}>
            <span className={styles.headingBold}>Overview of the </span>
            <span className={styles.headingLight}>GRAMMAR & VOCAB</span>
            <span className={styles.headingBold}> Test</span>
          </div>
          <div className={styles.text}>
            Complete all five components to receive your estimated CEFR band score. You can take the components in any order, but we recommend following the standard sequence.
          </div>
        </div>
        <button className={styles.mobileTestBtn} onClick={() => navigate('/grammar-vocab/tests')}>
          View Practice Tests
        </button>
      </div>

      <div className={styles.section}>
        <div className={styles.contentBlock}>
          <div className={styles.subHeading}>Overview of Aptis Grammar Part 1 and Part 2</div>
          <div className={styles.textBlock}>
            The Grammar and Vocabulary component is the core element of the Aptis test. It has two parts, and you will have 25 minutes to complete it.<br />
            The first part tests your knowledge of English grammar, and the second part focuses on your knowledge of English vocabulary.<br />
            The Grammar and Vocabulary test is marked on a scale from 0 to 50. No CEFR level is awarded for this component, but the score is used to assign you to the correct CEFR level for the other skill components.<br />
            Part 1: Grammar<br />
            In the Grammar section, you will be presented with 25 multiple-choice questions. Complete each sentence by choosing the correct option. Read the whole sentence before choosing your answer.<br />
            You can flag questions you find difficult and return to them later in the test.<br />
            Part 2: Vocabulary<br />
            The Vocabulary part also has 25 questions. There are several question types:<br />
            Word definition — match a word to its definition.<br />
            Word pairs — match a word to another word with a very similar meaning.<br />
            Word usage — choose a word that fits the context of a sentence.<br />
            Word combinations — combine words that are frequently used together.
          </div>
        </div>
        <div className={styles.contentBlock}>
          <div className={styles.subHeading}>Top tips for the Grammar and Vocabulary test</div>
          <div className={styles.text}>
            Read all the options before choosing your answer.<br />
            After choosing an option, read the sentence again to check your answer before moving on.<br />
            Do not spend too long on any question. You have to answer 50 questions in 25 minutes. If you cannot think of the answer immediately, continue with the test and return to it later.<br />
            Improve your vocabulary through practice games and activities on the LearnEnglish website.
          </div>
        </div>
      </div>

      <div className={styles.section}>
        <div className={styles.titleContainer}>
          <div className={styles.title}>GRAMMAR & VOCAB DOCUMENTS</div>
          <div className={styles.divider}></div>
        </div>
        <div className={styles.contentBlock}>
          <div className={styles.documentLink}>Tips for taking the Aptis Grammar & Vocabulary test</div>
          <div className={styles.documentLink}>Aptis Grammar & Vocabulary practice test</div>
          <div className={styles.documentLink}>Aptis Grammar & Vocabulary scores</div>
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

      <button className={styles.goToTestBtn} onClick={() => navigate('/grammar-vocab/tests')}>
        View Test List
      </button>
    </div>
  );
}
