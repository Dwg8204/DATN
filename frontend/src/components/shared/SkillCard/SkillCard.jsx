import styles from './SkillCard.module.css';

export default function SkillCard({ image, alt = '', onClick }) {
  return (
    <img
      src={image}
      alt={alt}
      className={styles.card}
      onClick={onClick}
    />
  );
}
