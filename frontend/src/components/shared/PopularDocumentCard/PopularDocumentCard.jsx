import { useUiTranslation } from "../../../i18n/useUiTranslation.jsx";
import React from 'react';
import styles from './PopularDocumentCard.module.css';

export default function PopularDocumentCard({ skillName, subTitle, badgeText, description }) {
  const ui = useUiTranslation();
  return (
    <div className={styles.cardContainer}>
      <div className={styles.cardHeader}>
        <div className={styles.titleSection}>
          <span className={styles.mainTitle}>APTIS {skillName.toUpperCase()}{ ' ' + ui("PRACTICE TESTS") }</span>
          <span className={styles.subTitle}>{subTitle || ui("accurate, with detailed explanations")}</span>
        </div>
        <div className={styles.badge}>
          <span className={styles.badgeText}>{badgeText || ui("LATEST 2026")}</span>
        </div>
      </div>
      <div className={styles.cardBody}>
        <span className={styles.descriptionText}>{ui(description)}</span>
      </div>
    </div>
  );
}
