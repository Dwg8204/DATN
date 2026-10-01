import styles from './PageHeader.module.css';

export default function PageHeader({ title, description, actions }) {
  return <header className={styles.header}><div><h1>{title}</h1>{description && <p>{description}</p>}</div>{actions && <div className={styles.actions}>{actions}</div>}</header>;
}
