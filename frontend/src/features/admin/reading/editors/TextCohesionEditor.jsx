import { Card, Field } from '../components/EditorFields';

export default function TextCohesionEditor({ value, onChange }) {
  // Preserve the answer key of tests made with the old position selector.
  const sentences = [...value.sentences].sort((a, b) => a.correctPosition - b.correctPosition);
  const update = (id, content) => onChange({
    ...value,
    sentences: sentences.map((sentence, index) => ({
      ...sentence,
      content: sentence.id === id ? content : sentence.content,
      correctPosition: index + 1,
    })),
  });
  return <>
    <Field label="Text title" value={value.title} onChange={title => onChange({ ...value, title })} />
    <p>Enter all six sentences in the correct reading order. Sentence 1 is given to the candidate. Sentences 2–6 are shuffled when the test opens.</p>
    {sentences.map((sentence, index) => (
      <Card key={sentence.id} title={index === 0 ? 'Sentence 1 — given example' : `Sentence ${index + 1}`}>
        <Field label="Sentence content" multiline maxWords={100} value={sentence.content} onChange={content => update(sentence.id, content)} />
      </Card>
    ))}
  </>;
}
