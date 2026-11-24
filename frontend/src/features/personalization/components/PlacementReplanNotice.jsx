import { useState } from "react";
import { useTranslation } from "react-i18next";
import styles from "./Personalization.module.css";

export default function PlacementReplanNotice({ planId }) {
  const { t } = useTranslation();
  const storageKey = `aptimate:placement-replan-dismissed:${planId}`;
  const [dismissed, setDismissed] = useState(() => {
    try {
      return localStorage.getItem(storageKey) === "1";
    } catch {
      return false;
    }
  });
  if (dismissed) return null;
  return (
    <div
      role="status"
      className={styles.muted}
      data-testid="placement-replan-notice"
    >
      <p>{t("personalization.placementReplan.message")}</p>
      <button
        type="button"
        onClick={() => {
          setDismissed(true);
          try {
            localStorage.setItem(storageKey, "1");
          } catch {
            /* Dismiss for this mount when storage is unavailable. */
          }
        }}
      >
        {t("personalization.placementReplan.dismiss")}
      </button>
    </div>
  );
}
