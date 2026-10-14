import { useUiTranslation } from "../../../i18n/useUiTranslation.jsx";
import styles from './PageHeader.module.css';

export default function PageHeader({ title, description, actions }) {
  const ui = useUiTranslation();
  return <header className={styles.header}><div><h1>{ui(title)}</h1>{description && <p>{ui(description)}</p>}</div>{actions && <div className={styles.actions}>{actions}</div>}</header>;
}
