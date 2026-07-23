import styles from './HeroBanner.module.css';

export default function HeroBanner({
  title = 'Learn Smarter, Score Higher',
  description = 'Practice APTIS Listening, Reading, Writing, and Speaking — powered by AI. Get instant answers, detailed feedback, and personalized improvement tips.',
  buttonText = 'aptis Test',
  onButtonClick,
}) {
  return (
    <div className={styles.heroBanner}>
      <div className={styles.inner}>
        <span className={styles.title}>{title}</span>
        <span className={styles.description}>{description}</span>
        {buttonText && (
          <button className={styles.ctaBtn} onClick={onButtonClick}>
            <span className={styles.ctaBtnText}>{buttonText}</span>
          </button>
        )}
      </div>
    </div>
  );
}
