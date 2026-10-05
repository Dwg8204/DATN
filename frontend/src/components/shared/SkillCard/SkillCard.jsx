import styles from './SkillCard.module.css';
import { Link } from 'react-router-dom';

export default function SkillCard({ image, alt = '', to }) {
  return (
    <Link to={to} className={styles.card} aria-label={alt}>
      <img src={image} alt={alt} className={styles.image} width="512" height="512" decoding="async" />
    </Link>
  );
}
