import PaginationDots from '../../common/PaginationDots';
import styles from './FeatureShowcase.module.css';

export default function FeatureShowcase({
  sectionTitle = 'Key Features',
  featureTitle = 'Realistic Aptis Exam Experience',
  featureImage = 'https://storage.googleapis.com/tagjs-prod.appspot.com/v1/YiUdaz83Xp/jie2waj6_expires_30_days.png',
  featureDescription = 'AptiMate recreates the Aptis test format, question types, and timing so you can practise Listening, Reading, Writing, Speaking, Grammar, and Vocabulary with confidence. Study on desktop or mobile, receive instant results, review every answer, and focus your practice on the skills that need the most improvement.',
  totalDots = 3,
  activeDot = 0,
}) {
  return (
    <div className={styles.section}>
      <div className={styles.content}>
        <span className={styles.sectionTitle}>{sectionTitle}</span>
        <div className={styles.showcase}>
          <div className={styles.textWrap}>
            <span className={styles.featureTitle}>{featureTitle}</span>
            <span className={styles.featureDescription}>
              {featureDescription}
            </span>
          </div>
          <div className={styles.imageWrap}>
            <img
              src={featureImage}
              alt={featureTitle}
              className={styles.featureImage}
            />
          </div>
        </div>
      </div>
      <PaginationDots total={totalDots} active={activeDot} />
    </div>
  );
}
