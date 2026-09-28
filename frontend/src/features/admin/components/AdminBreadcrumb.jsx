import { Link, useSearchParams } from 'react-router-dom';
import { ChevronRight } from 'lucide-react';
import styles from './AdminBreadcrumb.module.css';

export default function AdminBreadcrumb({ current, purpose }) {
  const [params] = useSearchParams();
  const returnPurpose = purpose === 'PRACTICE' || params.get('purpose') === 'PRACTICE' ? 'PRACTICE' : 'EXAM';
  return <nav className={styles.crumb} aria-label="Breadcrumb">
    <Link to={`/admin/tests?purpose=${returnPurpose}`}>Test Management</Link>
    {current && <><ChevronRight aria-hidden="true" /><span>{current}</span></>}
  </nav>;
}
