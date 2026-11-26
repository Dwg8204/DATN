import { ChevronDown } from 'lucide-react';
import styles from './LearningControls.module.css';

export default function LearningSummary({ icon: Icon, children }) {
  return <summary className={styles.disclosure}>
    <Icon size={18} aria-hidden="true" />
    <span>{children}</span>
    <ChevronDown size={16} aria-hidden="true" />
  </summary>;
}
