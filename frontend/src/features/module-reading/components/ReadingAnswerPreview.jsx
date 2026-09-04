import styles from './ReadingAnswerPreview.module.css';

function Answer({ children }) {
  return <span className={styles.answer}><span aria-hidden="true">✓ </span>{children || 'Answer not set'}</span>;
}

/** Read-only answer-key view: same passage/question relationships as the exam. */
export default function ReadingAnswerPreview({ test, part }) {
  const data = test[`part${part}`];
  if (!data) return null;
  return <div className={styles.preview}>
    {part === 1 && <>
      <div className={styles.instruction}>Questions 1–5 · Choose the correct word for each gap.</div>
      <section className={styles.passage}>
        {data.passage.split(/(\[\d+\])/g).map((text, index) => {
          const match = text.match(/^\[(\d+)\]$/);
          const question = match && data.questions.find(q => q.position === Number(match[1]));
          return question ? <span key={index} className={styles.gap}><small>{question.position}</small> <Answer>{question.answer}</Answer></span> : <span key={index}>{text}</span>;
        })}
      </section>
      <div className={styles.optionsGrid}>{data.questions.map(q => <section className={styles.card} key={q.id}>
        <h3>Question {q.position}</h3>
        {q.options.map((option, i) => <div className={option === q.answer ? styles.correctOption : styles.option} key={i}>
          <b>{String.fromCharCode(65 + i)}</b><span>{option}</span>{option === q.answer && <b aria-label="Correct answer">✓</b>}
        </div>)}
      </section>)}</div>
    </>}
    {part === 2 && <>
      <div className={styles.instruction}>Questions 6–10 · Put the sentences in order. The first sentence is given.</div>
      <h2>{data.title}</h2>
      <p className={styles.note}>Correct reading order. Candidates receive sentences 2–6 in a shuffled list.</p>
      {[...data.sentences].sort((a, b) => a.correctPosition - b.correctPosition).map(s => <section className={styles.sentence} key={s.id}>
        <b className={styles.number}>{s.correctPosition}</b><div><p>{s.content}</p><small>{s.correctPosition === 1 ? 'Given example' : 'Correct position'}</small></div>
      </section>)}
    </>}
    {part === 3 && <>
      <div className={styles.instruction}>Questions 11–17 · Match each statement to a person.</div>
      <div className={styles.columns}>
        <section><h2>Posts</h2>{data.posts ? data.speakers.map((speaker, i) => <article className={styles.card} key={i}><h3>{speaker}</h3><p>{data.posts[i]}</p></article>) : <div className={styles.passage}>{data.passage}</div>}</section>
        <section><h2>Questions</h2>{data.questions.map((q, i) => <article className={styles.card} key={q.id}><p><b>{i + 11}. </b>{q.statement}</p><Answer>{q.answer}</Answer></article>)}</section>
      </div>
    </>}
    {part === 4 && <>
      <div className={styles.instruction}>Questions 18–24 · Match each paragraph to its heading.</div>
      <h2>{data.title}</h2>
      <div className={styles.headingLayout}>
        <aside className={styles.card}><h3>Available headings</h3>{data.headings.map((heading, i) => <div className={styles.heading} key={heading.id}><b>{String.fromCharCode(65 + i)}. </b>{heading.text}</div>)}</aside>
        <div>{data.paragraphs.map((paragraph, i) => <article className={styles.card} key={paragraph.id}>
          <h3>{i + 18}. {paragraph.label}</h3>
          <Answer>{data.headings.find(h => h.correctParagraph === paragraph.id)?.text}</Answer>
          <p>{paragraph.content}</p>
        </article>)}</div>
      </div>
    </>}
  </div>;
}
