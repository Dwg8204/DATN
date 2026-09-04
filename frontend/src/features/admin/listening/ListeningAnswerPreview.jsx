import styles from '../reading/components/ReadingEditor.module.css';
import AudioField from '../shared-test-builder/AudioField';

function Options({ question }) {
  return <div>{question.options.map((option, index) => <div key={index} style={{ padding: 10, margin: '6px 0', borderRadius: 6, background: index === question.correctAnswer ? '#edf9f0' : '#f6f6f6', border: index === question.correctAnswer ? '1px solid #80c99a' : '1px solid transparent' }}><b>{String.fromCharCode(65 + index)}. </b>{option}{index === question.correctAnswer && ' ✓'}</div>)}</div>;
}
function Recording({ item, index }) {
  return <article><h3>Recording {index + 1}</h3><p>{item.context}</p><AudioField readOnly label="Audio preview" value={item.audioUrl} />{item.subQuestions.map(question => <section key={question.id}><h4>{question.text}</h4><Options question={question} /></section>)}</article>;
}
function PartOneQuestion({ question, index }) {
  return <article>
    <h3>Question {index + 1}</h3>
    <AudioField readOnly label="Audio preview" value={question.audioUrl} />
    <h4>{question.text}</h4>
    <Options question={question} />
  </article>;
}
export default function ListeningAnswerPreview({ test, part }) {
  const data = test.parts[part];
  return <div className={styles.preview}>
    {part === 1 && data.questions.map((question, index) => <PartOneQuestion key={question.id} question={question} index={index} />)}
    {part === 2 && <><AudioField readOnly label="Audio preview" value={data.audioUrl} />{data.speakers.map((speaker, index) => <article key={speaker}><b>{speaker}</b><p style={{ color: '#17653a' }}>{data.answers[index]} ✓</p></article>)}</>}
    {part === 3 && <><AudioField readOnly label="Audio preview" value={data.audioUrl} /><p>{data.context}</p>{data.statements.map(statement => <article key={statement.id}><p>{statement.text}</p><b style={{ color: '#17653a' }}>{statement.answer} ✓</b></article>)}</>}
    {part === 4 && data.recordings.map((recording, index) => <Recording key={recording.id} item={recording} index={index} />)}
  </div>;
}
