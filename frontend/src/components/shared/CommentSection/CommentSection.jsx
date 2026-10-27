import PageLoader from '../../common/PageLoader.jsx';
import { useEffect, useRef, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Send } from 'lucide-react';
import { useAuth } from '../../../context/AuthContext';
import { commentsApi } from './commentsApi';
import CommentItem from './CommentItem';
import styles from './CommentSection.module.css';

// Every skill/session owns its state, so old requests cannot fill another skill's screen.
export default function CommentSection({ skill }) {
  const { user, isAuthReady } = useAuth();
  return <SkillComments key={`${skill}:${user?.id ?? 'guest'}`} skill={skill} user={user} isAuthReady={isAuthReady} />;
}

function SkillComments({ skill, user, isAuthReady }) {
  const { t } = useTranslation();
  const location = useLocation();
  const [comments, setComments] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [revision, setRevision] = useState(0);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [content, setContent] = useState('');
  const [replyText, setReplyText] = useState('');
  const [target, setTarget] = useState(null);
  const replyInput = useRef(null);
  const mutationLock = useRef(false);

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true); setLoadError(false);
    commentsApi.list(skill, page, controller.signal).then(result => {
      if (controller.signal.aborted) return;
      setComments(previous => page === 1 ? result.comments : [...previous, ...result.comments.filter(c => !previous.some(p => p.id === c.id))]);
      setTotal(result.total); setHasMore(result.hasMore);
    }).catch(() => { if (!controller.signal.aborted) setLoadError(true); })
      .finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [skill, page, revision]);

  useEffect(() => { if (target) replyInput.current?.focus(); }, [target]);

  const mutationError = failure => {
    const code = failure.response?.data?.error?.code;
    if (failure.response?.status === 401) return 'comments.sessionExpired';
    if (code === 'COMMENT_NOT_FOUND') return 'comments.unavailable';
    if (failure.response?.status === 429) return 'comments.rateLimit';
    return 'comments.sendError';
  };

  const submit = async (event, replying = false) => {
    event.preventDefault();
    const text = (replying ? replyText : content).trim();
    if (!text || mutationLock.current || loading || !user) return;
    mutationLock.current = true;
    setBusy(true); setError('');
    try {
      const created = await commentsApi.create(skill, text, replying ? target.id : undefined);
      setComments(previous => created.parentId
        ? previous.map(root => root.id === created.parentId ? { ...root, replies: [...root.replies, created] } : root)
        : [created, ...previous]);
      setTotal(value => value + 1);
      if (replying) { setReplyText(''); setTarget(null); } else setContent('');
    } catch (failure) { setError(mutationError(failure)); }
    finally { mutationLock.current = false; setBusy(false); }
  };

  const remove = async comment => {
    if (mutationLock.current || loading) return;
    mutationLock.current = true;
    setBusy(true); setError('');
    try {
      await commentsApi.remove(skill, comment.id);
      const deleted = item => item.id === comment.id ? { ...item, content: '', deletedAt: new Date().toISOString() } : item;
      setComments(previous => previous.map(root => ({ ...deleted(root), replies: root.replies.map(deleted) })));
      setTotal(value => Math.max(0, value - 1));
      if (target?.id === comment.id) { setTarget(null); setReplyText(''); }
    } catch (failure) { setError(mutationError(failure)); }
    finally { mutationLock.current = false; setBusy(false); }
  };

  const chooseReply = comment => { setTarget(comment); setReplyText(''); setError(''); };
  const composer = replying => <form className={styles.mainInputContainer} onSubmit={event => submit(event, replying)}>
    <div className={styles.inputWrap}>
      <textarea ref={replying ? replyInput : undefined} className={styles.replyInput} rows={2} maxLength={2000}
        aria-label={t(replying ? 'comments.replyPlaceholder' : 'comments.placeholder')}
        placeholder={t(replying ? 'comments.replyPlaceholder' : 'comments.placeholder')}
        value={replying ? replyText : content} disabled={busy}
        onChange={event => replying ? setReplyText(event.target.value) : setContent(event.target.value)}
        onKeyDown={event => { if (event.key === 'Enter' && (event.ctrlKey || event.metaKey)) submit(event, replying); }} />
    </div>
    <button className={styles.submitButton} type="submit" disabled={busy || loading || !(replying ? replyText : content).trim()}
      aria-label={t(busy ? 'comments.sending' : 'comments.send')} title={t(busy ? 'comments.sending' : 'comments.send')} aria-busy={busy}>
      <Send size={20} aria-hidden="true" />
    </button>
  </form>;

  return <section className={styles.container} aria-label={t('comments.title')}>
    <h2 className={styles.replyCount}>{t('comments.count', { count: total })}</h2>
    {!isAuthReady ? <PageLoader compact /> : user ? composer(false) :
      <Link to="/login" state={{ from: location.pathname + location.search }}>{t('comments.login')}</Link>}
    {error && <p className={styles.error} role="alert">{t(error)}</p>}
    {loading && <PageLoader compact />}
    {loadError && <div role="alert"><p>{t('comments.loadError')}</p>
      <button type="button" disabled={busy} onClick={() => setRevision(value => value + 1)}>{t('comments.retry')}</button></div>}
    {!loading && !loadError && !comments.length && <p>{t('comments.empty')}</p>}
    <div className={styles.commentList}>
      {comments.map(root => <div className={styles.commentThread} key={root.id}>
        <CommentItem comment={root} userId={user?.id} busy={busy || loading} onReply={chooseReply} onDelete={remove} />
        <div className={styles.repliesContainer}>
          {root.replies.map(reply => <CommentItem key={reply.id} comment={reply} userId={user?.id}
            busy={busy || loading} onReply={chooseReply} onDelete={remove} />)}
          {target && (target.parentId ?? target.id) === root.id && <div>
            <p>{t('comments.replyingTo', { name: target.author })}</p>
            {target.authorId !== user?.id && <span className={styles.mention}>@{target.author}</span>}
            {composer(true)}
            <button className={styles.replyBtn} type="button" disabled={busy} onClick={() => { setTarget(null); setReplyText(''); }}>{t('comments.cancel')}</button>
          </div>}
        </div>
      </div>)}
    </div>
    {hasMore && !loadError && <button type="button" disabled={loading || busy} onClick={() => setPage(value => value + 1)}>{t('comments.more')}</button>}
  </section>;
}
