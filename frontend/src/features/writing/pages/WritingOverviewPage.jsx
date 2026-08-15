import { useNavigate } from 'react-router-dom';
import styles from './WritingOverviewPage.module.css';

export default function WritingOverviewPage() {
  const navigate = useNavigate();

  return (
    <div className={styles.page}>
      <section className={styles.section}>
        <div className={styles.titleContainer}>
          <h1>WRITING OVERVIEW</h1>
          <div className={styles.divider} />
        </div>
        <div className={styles.contentBlock}>
          <h2>Overview of the Writing Test</h2>
          <p>
            The Aptis Writing test assesses your ability to communicate clearly in written English in real-life situations. The test contains four parts connected by a common topic. You may be asked to join a club, course or community group, respond to other members and write both informal and formal messages.
          </p>
          <p>
            You have 50 minutes to complete the full test. All responses are marked by an examiner, so your answers should be relevant, easy to understand and appropriate for the intended reader.
          </p>
        </div>
      </section>

      <section className={styles.section}>
        <div className={styles.contentBlock}>
          <h2>Overview of Aptis Writing Parts 1–4</h2>
          <h3>Part 1: Word-level writing</h3>
          <p>
            Respond to five short messages using a single word or a short phrase. This part carries fewer marks, so answer accurately without spending too much time on each item.
          </p>
          <h3>Part 2: Short text writing</h3>
          <p>
            Respond to a request for information in complete sentences. Write between 20 and 30 words and focus on relevant content, accurate grammar, punctuation and spelling.
          </p>
          <h3>Part 3: Three written responses</h3>
          <p>
            Reply to three questions from members of a club or group. Write approximately 30 to 40 words for each response and maintain a natural, friendly tone.
          </p>
          <h3>Part 4: Formal and informal writing</h3>
          <p>
            Write two emails about the same situation. The first is an informal email of 40 to 50 words to a friend. The second is a formal email of 120 to 150 words to a person in authority. Adapt your vocabulary, tone and organisation to each reader.
          </p>
        </div>

        <div className={styles.contentBlock}>
          <h2>Top tips for the Writing Test</h2>
          <p>
            Read every task carefully and make sure your response covers all requested points. Keep within the recommended word count and leave enough time for the longer tasks in Parts 3 and 4.
          </p>
          <p>
            Use complete sentences where required, organise longer responses into clear ideas and select an appropriate tone for formal and informal writing. Before submitting, check grammar, spelling, punctuation and whether your message is easy to understand.
          </p>
        </div>
      </section>

      <section className={styles.section}>
        <div className={styles.titleContainer}>
          <h1>WRITING DOCUMENTS</h1>
          <div className={styles.divider} />
        </div>
        <div className={styles.documents}>
          <span>Tips for taking the Aptis Writing test</span>
          <span>Aptis Writing practice test</span>
          <span>Question types in the Aptis Writing test</span>
          <span>Aptis Writing scores</span>
        </div>
      </section>

      <button className={styles.testButton} onClick={() => navigate('/writing/tests')}>
        View Writing Tests
      </button>
    </div>
  );
}
