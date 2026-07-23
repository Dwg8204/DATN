import styles from './Comment.module.css';

export default function CommentItem({ author, content, time }) {
  return (
    <article className={styles.commentItem}>
      <div className={styles.commentItem__meta}>
        <span className={styles.commentItem__author}>{author}</span>
        <span>{time}</span>
      </div>
      <p className={styles.commentItem__content}>{content}</p>
    </article>
  );
}
