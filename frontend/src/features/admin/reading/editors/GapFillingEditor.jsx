import { Card, Choice, Field } from '../components/EditorFields';
import styles from '../components/ReadingEditor.module.css';
import { buildPassage, getPassageSegments } from '../utils/passageSegments';

export default function GapFillingEditor({ value, onChange }) {
  const segments = getPassageSegments(value.passage);
  const updateQuestion = (index, patch) => onChange({
    ...value,
    questions: value.questions.map((question, questionIndex) => questionIndex === index ? { ...question, ...patch } : question),
  });
  const updateSegment = (index, text) => {
    const next = segments.map((segment, segmentIndex) => segmentIndex === index ? text : segment);
    onChange({ ...value, passage: buildPassage(next) });
  };

  return <>
    <div className={styles.editorHelp}>
      <strong>Build the passage around five gaps</strong>
      <p>Write the text in natural sections. AptiMate inserts and numbers each answer gap automatically.</p>
    </div>
    {segments.map((segment, index) => <div className={styles.passageSegment} key={index}>
      <Field
        label={index === 0 ? 'Opening text — before Gap 1' : index === 5 ? 'Ending text — after Gap 5' : `Text between Gap ${index} and Gap ${index + 1}`}
        multiline
        maxWords={150}
        value={segment}
        onChange={text => updateSegment(index, text)}
      />
      {index < 5 && <div className={styles.gapDivider}><span>Gap {index + 1}</span></div>}
    </div>)}
    <h2 className={styles.sectionTitle}>Answer options</h2>
    {value.questions.map((question, index) => <Card key={question.id} title={`Gap ${index + 1}`}>
      {question.options.map((option, optionIndex) => <Field
        key={optionIndex}
        label={`Option ${String.fromCharCode(65 + optionIndex)}`}
        maxWords={50}
        value={option}
        onChange={text => updateQuestion(index, {
          options: question.options.map((current, currentIndex) => currentIndex === optionIndex ? text : current),
          answer: question.answer === option ? text : question.answer,
        })}
      />)}
      <Choice
        label="Correct answer"
        value={question.answer}
        onChange={answer => updateQuestion(index, { answer })}
        options={question.options.filter(Boolean).map(text => ({ value: text, label: text }))}
      />
    </Card>)}
  </>;
}
