import { Link } from 'react-router-dom';
import Button from '../components/common/Button';

export default function NotFoundPage() {
  return (
    <section className="page-section">
      <div className="container">
        <div className="surface not-found-card">
          <h1 className="section-title">404</h1>
          <p className="section-description">The page you are looking for does not exist.</p>
          <Button as={Link} to="/">Về trang chủ</Button>
        </div>
      </div>
    </section>
  );
}
