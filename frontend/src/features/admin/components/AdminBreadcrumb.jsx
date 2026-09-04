import { Link } from 'react-router-dom';
import { ChevronRight } from 'lucide-react';
import styles from './AdminBreadcrumb.module.css';

export default function AdminBreadcrumb({ current }) {
  return <nav className={styles.crumb} aria-label="Breadcrumb">
    <Link to="/admin/tests">Test Management</Link>
    {current && <><ChevronRight aria-hidden="true" /><span>{current}</span></>}
  </nav>;
}
