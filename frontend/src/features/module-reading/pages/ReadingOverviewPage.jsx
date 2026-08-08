import React from 'react';
import { useNavigate } from 'react-router-dom';
import styles from './ReadingOverviewPage.module.css';

const popularDocs = Array.from({ length: 5 }, (_, index) => ({
  id: index + 1,
  title: 'APTIS READING PRACTICE',
  subTitle: 'Practice questions with detailed explanations',
  badge: 'LATEST 2026',
  desc: 'Improve your reading skills with regularly updated Aptis practice materials.',
}));

export default function ReadingOverviewPage() {
  const navigate = useNavigate();
  return (
    <div className={styles.page}>
      <div className={styles.section}>
        <div className={styles.titleContainer}>
          <div className={styles.title}>
            <span className={styles.titleLight}>READING</span> OVERVIEW
          </div>
          <div className={styles.divider}></div>
        </div>
        
        <div className={styles.contentBlock}>
          <div className={styles.heading}>
            <span className={styles.headingBold}>A quick look at the </span>
            <span className={styles.headingLight}>Aptis Reading</span>
            <span className={styles.headingBold}> test</span>
          </div>
          <div className={styles.textBlock}>
            <p>
              APTIS Reading is one of the four components of the APTIS test, developed by the British Council, which is designed to assess a test taker's proficiency in the English language. The APTIS Reading test evaluates your ability to understand and interpret written texts in English across a range of contexts and complexity levels.
            </p>
            
            <p>
              <strong>Test Format:</strong><br />
              The APTIS Reading test is divided into four sections, and the tasks become progressively more difficult as the test advances. Unlike a single fixed format, the time allowed varies depending on the version of the test:
              <br />- Aptis General – 35 minutes
              <br />- Aptis Advanced – 60 minutes
              <br />- Aptis for Teens – 30 minutes
              <br />- Aptis for Teachers – 30 minutes
            </p>

            <p>
              <strong>Question Types:</strong><br />
              - Part 1 – Sentence Comprehension: You will read a short text in the form of a note or an email. For five sentences in the text, you must choose a word to complete each sentence. This part tests your ability to read and understand simple sentences.
              <br />- Part 2 – Text Cohesion: This section contains two separate texts. Each text consists of six sentences, but only the first sentence is placed correctly. Your task is to arrange the remaining five sentences in the correct order to form a complete, coherent text.
              <br />- Part 3 – Opinion Matching: You will read a text made up of four paragraphs on a common topic, each paragraph representing a different person's opinions or preferences. You will then match seven given statements to the correct person.
              <br />- Part 4 – Long Text Comprehension: In the final section, you will read a longer text of approximately 750 words, consisting of eight paragraphs. You are given eight headings and must match seven of them to seven of the paragraphs.
            </p>

            <p>
              <strong>Top tips for the reading test:</strong>
              <br />- Read all the sentences carefully first, then decide on the correct order. You need to look for words that show how the sentences link with each other.
              <br />- To perform well in section two, first read each paragraph so you understand each person's point of view. Then read the statements and decide which person's opinion it best represents.
              <br />- In section three it is necessary to scroll the reading text to see all of it. Select the appropriate heading from the drop-down list on the left-hand side. There is always an extra heading that does not fit with any paragraph.
            </p>

            <p>
              <strong>Skills Assessed:</strong>
              <br />- Understanding simple sentences and everyday language
              <br />- Recognizing how texts are structured and how ideas connect
              <br />- Identifying individual opinions and matching them to statements
              <br />- Comprehending extended texts and identifying the main idea of each section
            </p>
            
            <p style={{ fontStyle: 'italic', fontSize: '14px', marginTop: '16px', color: '#666' }}>
              *Cre: British Council – Aptis Reading Component
            </p>
          </div>
        </div>
      </div>

      <div className={styles.section}>
        <div className={styles.titleContainer}>
          <div className={styles.title}>READING DOCUMENTS</div>
          <div className={styles.divider}></div>
        </div>
        <div className={styles.contentBlock}>
          <div className={styles.documentLink}>Some tips for taking the APTIS Reading test</div>
          <div className={styles.documentLink}>APTIS Reading practice test</div>
          <div className={styles.documentLink}>Question types in the APTIS Reading test</div>
          <div className={styles.documentLink}>APTIS Reading band scores</div>
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
      
      <button className={styles.goToTestBtn} onClick={() => navigate('/reading/tests')}>
        View Test List
      </button>
    </div>
  );
}
