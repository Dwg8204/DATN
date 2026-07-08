import Button from '../../../components/common/Button';

export default function PracticeExamCard({ title, duration, level }) {
  return (
    <article className="feature-card surface">
      <span className="feature-card__badge">{level}</span>
      <h3>{title}</h3>
      <p>Thời lượng: {duration}</p>
      <Button size="sm">Bắt đầu</Button>
    </article>
  );
}
