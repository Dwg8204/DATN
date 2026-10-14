import { useUiTranslation } from "../../../i18n/useUiTranslation.jsx";
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
  const ui = useUiTranslation();
  const navigate = useNavigate();

  return (
    <div className={styles.page}>
      <div className={styles.section}>
        <div className={styles.titleContainer}>
          <div className={styles.title}>
            <span className={styles.titleLight}>{ui("GRAMMAR & VOCAB")}</span>{ ' ' + ui("Overview") }</div>
          <div className={styles.divider}></div>
        </div>
        <div className={styles.contentBlock}>
          <div className={styles.heading}>
            <span className={styles.headingBold}>{ ui("Overview of the") + ' ' }</span>
            <span className={styles.headingLight}>{ui("GRAMMAR & VOCAB")}</span>
            <span className={styles.headingBold}>{ ' ' + ui("Test") }</span>
          </div>
          <div className={styles.text}>{ui("Complete all five components to receive your estimated CEFR band score. You can take the components in any order, but we recommend following the standard sequence.")}</div>
        </div>
      </div>

      <div className={styles.section}>
        <div className={styles.contentBlock}>
          <div className={styles.subHeading}>{ui("Overview of Aptis Grammar Part 1 and Part 2")}</div>
          <div className={styles.textBlock}>{ui("The Grammar and Vocabulary component is the core element of the Aptis test. It has two parts, and you will have 25 minutes to complete it.")}<br />{ui("The first part tests your knowledge of English grammar, and the second part focuses on your knowledge of English vocabulary.")}<br />{ui("The Grammar and Vocabulary test is marked on a scale from 0 to 50. No CEFR level is awarded for this component, but the score is used to assign you to the correct CEFR level for the other skill components.")}<br />{ui("Part 1: Grammar")}<br />{ui("In the Grammar section, you will be presented with 25 multiple-choice questions. Complete each sentence by choosing the correct option. Read the whole sentence before choosing your answer.")}<br />{ui("You can flag questions you find difficult and return to them later in the test.")}<br />{ui("Part 2: Vocabulary")}<br />{ui("The Vocabulary part also has 25 questions. There are several question types:")}<br />{ui("Word definition — match a word to its definition.")}<br />{ui("Word pairs — match a word to another word with a very similar meaning.")}<br />{ui("Word usage — choose a word that fits the context of a sentence.")}<br />{ui("Word combinations — combine words that are frequently used together.")}</div>
        </div>
        <div className={styles.contentBlock}>
          <div className={styles.subHeading}>{ui("Top tips for the Grammar and Vocabulary test")}</div>
          <div className={styles.text}>{ui("Read all the options before choosing your answer.")}<br />{ui("After choosing an option, read the sentence again to check your answer before moving on.")}<br />{ui("Do not spend too long on any question. You have to answer 50 questions in 25 minutes. If you cannot think of the answer immediately, continue with the test and return to it later.")}<br />{ui("Improve your vocabulary through practice games and activities on the LearnEnglish website.")}</div>
        </div>
      </div>

      <div className={styles.section}>
        <div className={styles.titleContainer}>
          <div className={styles.title}>{ui("GRAMMAR & VOCAB DOCUMENTS")}</div>
          <div className={styles.divider}></div>
        </div>
        <div className={styles.contentBlock}>
          <div className={styles.documentLink}>{ui("Tips for taking the Aptis Grammar & Vocabulary test")}</div>
          <div className={styles.documentLink}>{ui("Aptis Grammar & Vocabulary practice test")}</div>
          <div className={styles.documentLink}>{ui("Aptis Grammar & Vocabulary scores")}</div>
        </div>
      </div>

      <div className={styles.section}>
        <div className={styles.popularTitle}>{ui("MOST POPULAR")}</div>
        <div className={styles.popularGrid}>
          {popularDocs.map((doc) => (
            <div key={doc.id} className={styles.popularCard}>
              <div className={styles.cardHeader}>
                <div className={styles.cardHeaderTop}>
                  <div className={styles.cardTitle}>{ui(doc.title)}</div>
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

      <button className={styles.goToTestBtn} onClick={() => navigate('/grammar-vocab/tests')}>{ui("View Test List")}</button>
    </div>
  );
}
