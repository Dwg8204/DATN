import { useTranslation } from 'react-i18next';
import { Reply, Trash2 } from 'lucide-react';
import styles from './CommentSection.module.css';

export default function CommentItem({ comment, userId, busy, onReply, onDelete }) {
  const { t, i18n } = useTranslation();
  const date = new Intl.DateTimeFormat(i18n.language === 'vi' ? 'vi-VN' : 'en-GB', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(comment.createdAt));
  return <article className={styles.commentItem}>
    <div className={styles.avatar}>
      {comment.avatar ? <img className={styles.avatarImg} src={comment.avatar} alt="" loading="lazy" /> :
        <span className={styles.avatarFallback} aria-hidden="true">{comment.author?.slice(0, 1).toUpperCase()}</span>}
    </div>
    <div className={styles.commentBody}>
      <div className={styles.commentMeta}>
        <span className={styles.authorName}>{comment.author}</span>
        <span className={styles.roleBadge}>{t(`comments.roles.${comment.role}`)}</span>
        <time className={styles.time} dateTime={comment.createdAt}>{date}</time>
      </div>
      <div className={styles.commentContent}>
        {comment.deletedAt ? t('comments.deleted') : <>
          {comment.mention && <span className={styles.mention}>@{comment.mention} </span>}{comment.content}
        </>}
      </div>
      {!comment.deletedAt && userId && <div className={styles.commentActions}>
        <button className={styles.actionIcon} type="button" disabled={busy} onClick={() => onReply(comment)}
          aria-label={t('comments.reply')} title={t('comments.reply')}>
          <Reply size={18} aria-hidden="true" />
        </button>
        {userId === comment.authorId && <button className={`${styles.actionIcon} ${styles.deleteIcon}`} type="button" disabled={busy}
          onClick={() => onDelete(comment)} aria-label={t('comments.delete')} title={t('comments.delete')}>
          <Trash2 size={18} aria-hidden="true" />
        </button>}
      </div>}
    </div>
  </article>;
}
