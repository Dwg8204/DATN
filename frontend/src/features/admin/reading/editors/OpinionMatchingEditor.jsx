import { Card, Field, Choice } from '../components/EditorFields';
export default function OpinionMatchingEditor({
  value,
  onChange
}) {
  const updateQuestion = (index, patch) => onChange({
    ...value,
    questions: value.questions.map((q, i) => i === index ? {
      ...q,
      ...patch
    } : q)
  });
  return <>{value.speakers.map((speaker, i) => <Card key={i} title={`Speaker ${i + 1}`}><Field label="Name" value={speaker} onChange={name => onChange({
        ...value,
        speakers: value.speakers.map((s, j) => j === i ? name : s),
        questions: value.questions.map(q => q.answer === speaker ? {
          ...q,
          answer: name
        } : q)
      })} /><Field label="Opinion / post" multiline value={value.posts[i]} onChange={post => onChange({
        ...value,
        posts: value.posts.map((p, j) => j === i ? post : p)
      })} /></Card>)}{value.questions.map((q, i) => <Card key={q.id} title={`Statement ${i + 1}`}><Field label="Statement" multiline maxWords={100} value={q.statement} onChange={statement => updateQuestion(i, {
        statement
      })} /><Choice label="Correct speaker" value={q.answer} onChange={answer => updateQuestion(i, {
        answer
      })} options={value.speakers.map(s => ({
        value: s,
        label: s
      }))} /></Card>)}</>;
}
