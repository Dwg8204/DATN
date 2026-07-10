import React from 'react';
import { useNavigate } from 'react-router-dom';
import styles from './GrammarVocabOverviewPage.module.css';

const popularDocs = Array(5).fill({
  title: 'Tổng hợp đề thi IELTS WRITING',
  subTitle: 'chính xác kèm bài giải chi tiết',
  badge: 'MỚI NHẤT 2025',
  desc: 'Tổng hợp bài mẫu IELTS Writing mới nhất. Cập nhật liên tục',
});

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
            Complete all 5 components to receive your estimated CEFR band score. You can take the components in any order, but we recommend following the standard sequence.
          </div>
        </div>
      </div>

      <div className={styles.section}>
        <div className={styles.contentBlock}>
          <div className={styles.subHeading}>Overview of APTIS Grammar Part 1 and Part 2</div>
          <div className={styles.textBlock}>
            The Grammar and Vocabulary component is the core element of the Aptis test. It has two parts and you will have 25 minutes to complete it.<br />
            The first part tests your knowledge of English grammar and the second part focuses on your knowledge of English vocabulary.<br />
            The Grammar and vocabulary test is marked on a scale from 0 to 50. No CEFR level is awarded for this component but the score is used to assign you to the correct CEFR level for the other skill components.<br />
            Part 1: Grammar<br />
            In the Grammar section, you will be presented with 25 multiple choice questions where you should complete a sentence by choosing the correct option. Read the whole sentence before choosing the answer.<br />
            You can flag up questions you find difficult and go back to complete them later in the test.<br />
            Part 2: Vocabulary<br />
            The vocabulary part also has 25 questions. There are several question types:<br />
            Word definition – match a word to its definition.<br />
            Word pairs – match a word to another word of very similar meaning.<br />
            Word usage – choose a word to be used in the context of a sentence.<br />
            Word combinations – combine words that are frequently used together.
          </div>
        </div>
        <div className={styles.contentBlock}>
          <div className={styles.subHeading}>Top tips for the Grammar and vocabulary test</div>
          <div className={styles.text}>
            Read all the options before choosing your answer.<br />
            After you have chosen an option, read the sentence again to check your answer before you move on.<br />
            Do not spend too long on any of the questions. Remember you have to answer 50 questions in 25 minutes. If you can’t think of the answer immediately, it’s better to continue with the test and then come back to it later.<br />
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
          <div className={styles.documentLink}>Some tips for taking the APTIS Grammar&Vocab test</div>
          <div className={styles.documentLink}>APTIS Grammar&Vocab practice test</div>
          <div className={styles.documentLink}>APTIS Grammar&Vocab band scores</div>
        </div>
      </div>

      <div className={styles.section}>
        <div className={styles.popularTitle}>MOST POPULAR</div>
        <div className={styles.popularGrid}>
          {popularDocs.map((doc, idx) => (
            <div key={idx} className={styles.popularCard}>
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
