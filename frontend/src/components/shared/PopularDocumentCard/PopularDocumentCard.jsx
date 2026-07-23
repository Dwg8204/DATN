import React from 'react';
import styles from './PopularDocumentCard.module.css';

export default function PopularDocumentCard({ skillName, subTitle, badgeText, description }) {
  return (
    <div className={styles.cardContainer}>
      <div className={styles.cardHeader}>
        <div className={styles.titleSection}>
          <span className={styles.mainTitle}>APTIS {skillName.toUpperCase()} PRACTICE TESTS</span>
          <span className={styles.subTitle}>{subTitle || 'chính xác kèm bài giải chi tiết'}</span>
        </div>
        <div className={styles.badge}>
          <span className={styles.badgeText}>{badgeText || 'MỚI NHẤT 2026'}</span>
        </div>
      </div>
      <div className={styles.cardBody}>
        <span className={styles.descriptionText}>{description}</span>
      </div>
    </div>
  );
}
