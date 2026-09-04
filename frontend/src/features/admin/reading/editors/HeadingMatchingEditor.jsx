import { Card, Field, Choice } from '../components/EditorFields';
export default function HeadingMatchingEditor({
  value,
  onChange
}) {
  return <><Field label="Passage title" value={value.title} onChange={title => onChange({
      ...value,
      title
    })} />{value.paragraphs.map((p, i) => <Card key={p.id} title={p.label}><Field label="Paragraph content" multiline value={p.content} onChange={content => onChange({
        ...value,
        paragraphs: value.paragraphs.map((item, j) => j === i ? {
          ...item,
          content
        } : item)
      })} /></Card>)}<p>Create exactly 7 headings and match one unique heading to each paragraph.</p>{value.headings.slice(0, 7).map((h, i) => <Card key={h.id} title={`Heading ${i + 1}`}><Field label="Heading text" value={h.text} onChange={text => onChange({
        ...value,
        headings: value.headings.slice(0, 7).map((item, j) => j === i ? {
          ...item,
          text
        } : item)
      })} /><Choice label="Correct paragraph" value={h.correctParagraph || ''} onChange={correctParagraph => onChange({
        ...value,
        headings: value.headings.slice(0, 7).map((item, j) => j === i ? {
          ...item,
          correctParagraph
        } : item)
      })} options={value.paragraphs.map(p => ({
        value: p.id,
        label: p.label
      }))} /></Card>)}</>;
}
