import PaginationDots from '../../common/PaginationDots';
import styles from './FeatureShowcase.module.css';

export default function FeatureShowcase({
  sectionTitle = 'Key Features',
  featureTitle = 'Realistic Exam Interface',
  featureImage = 'https://storage.googleapis.com/tagjs-prod.appspot.com/v1/YiUdaz83Xp/jie2waj6_expires_30_days.png',
  featureDescription = 'YouReady.net simulates the actual IELTS test format and timing, helping learners get familiar with the real test environment from home. Accessible on both laptops and mobile phones for flexible learning.',
  totalDots = 3,
  activeDot = 0,
}) {
  return (
    <div className={styles.section}>
      <div className={styles.content}>
        <span className={styles.sectionTitle}>{sectionTitle}</span>
        <div className={styles.showcase}>
          <span className={styles.featureTitle}>{featureTitle}</span>
          <div className={styles.imageWrap}>
            <img
              src={featureImage}
              alt={featureTitle}
              className={styles.featureImage}
            />
            <span className={styles.featureDescription}>
              {featureDescription}
            </span>
          </div>
        </div>
      </div>
      <PaginationDots total={totalDots} active={activeDot} />
    </div>
  );
}
