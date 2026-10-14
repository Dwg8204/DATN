import { useUiTranslation } from "../i18n/useUiTranslation.jsx";
import { Link } from 'react-router-dom';
import Button from '../components/common/Button';

export default function NotFoundPage() {
  const ui = useUiTranslation();
  return (
    <section className="page-section">
      <div className="container">
        <div className="surface not-found-card">
          <h1 className="section-title">404</h1>
          <p className="section-description">{ui("The page you are looking for does not exist.")}</p>
          <Button as={Link} to="/">{ui("Go to Homepage")}</Button>
        </div>
      </div>
    </section>
  );
}
