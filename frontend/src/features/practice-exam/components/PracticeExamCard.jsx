import { useUiTranslation } from "../../../i18n/useUiTranslation.jsx";
import Button from '../../../components/common/Button';

export default function PracticeExamCard({ title, duration, level }) {
  const ui = useUiTranslation();
  return (
    <article className="feature-card surface">
      <span className="feature-card__badge">{level}</span>
      <h3>{ui(title)}</h3>
      <p>{ ui("Duration:") + ' ' }{duration}</p>
      <Button size="sm">{ui("Start")}</Button>
    </article>
  );
}
