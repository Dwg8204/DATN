import { useNavigate } from 'react-router-dom';
import styles from './WritingOverviewPage.module.css';

const parts = [
  ['Part 1: Word-level writing', 'Respond to five messages using single words or short phrases.'],
  ['Part 2: Short text writing', 'Write 20–30 words in response to a request for information.'],
  ['Part 3: Three written responses', 'Write three social-network responses of approximately 30–40 words each.'],
  ['Part 4: Formal and informal writing', 'Write an informal email of 40–50 words and a formal email of 120–150 words.'],
];

export default function WritingOverviewPage() {
  const navigate = useNavigate();
  return (
    <div className={styles.page}>
      <header className={styles.titleBlock}><h1>WRITING OVERVIEW</h1><div /></header>
      <section className={styles.intro}>
        <div><h2>Overview of the Writing Test</h2><p>The Aptis Writing test assesses your ability to use written English in real-life situations. All four parts share a common club, course or group context and are marked by an examiner.</p></div>
        <div className={styles.imagePlaceholder}>Writing test overview</div>
      </section>
      <section><h2>Overview of Aptis Writing Parts 1–4</h2><div className={styles.partGrid}>{parts.map(([title, text]) => <article key={title}><h3>{title}</h3><p>{text}</p></article>)}</div></section>
      <section><h2>Top tips for the Writing test</h2><ul><li>Read each task carefully and answer every point.</li><li>Keep to the recommended word count.</li><li>Use the appropriate tone for formal and informal writing.</li><li>Leave time to check grammar, spelling and punctuation.</li></ul></section>
      <section><h2>WRITING DOCUMENTS</h2><div className={styles.documents}><span>Tips for taking the Aptis Writing test</span><span>Aptis Writing practice test</span><span>Question types in the Aptis Writing test</span><span>Aptis Writing scores</span></div></section>
      <button className={styles.testButton} onClick={() => navigate('/writing/tests')}>View Writing Tests</button>
    </div>
  );
}
