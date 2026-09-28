import { useEffect, useMemo, useRef, useState } from 'react';
import { Bell, BellRing, CheckCheck, Paperclip, Trash2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { getAvailableUserNotifications, getUserNotificationState, saveUserNotificationState } from '../../utils/notificationStorage';
import styles from './UserNotifications.module.css';
import { useTranslation } from 'react-i18next';

function relativeTime(value, t, locale) {
  const seconds = Math.max(1, Math.floor((Date.now() - new Date(value).getTime()) / 1000));
  if (seconds < 60) return t('notifications.justNow');
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return t('notifications.minutesAgo', { count: minutes });
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return t('notifications.hoursAgo', { count: hours });
  const days = Math.floor(hours / 24);
  if (days < 7) return t('notifications.daysAgo', { count: days });
  return new Intl.DateTimeFormat(locale, { month: 'short', day: 'numeric' }).format(new Date(value));
}

const notificationContent = (item, t) => t(`notifications.default${String(item.id).charAt(0).toUpperCase()}${String(item.id).slice(1)}`, { defaultValue: item.content });

export default function UserNotifications() {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [filter, setFilter] = useState('all');
  const [notifications, setNotifications] = useState(getAvailableUserNotifications);
  const [state, setState] = useState(getUserNotificationState);
  const containerRef = useRef(null);

  const saveState = (next) => { setState(next); saveUserNotificationState(next); };
  const available = useMemo(() => notifications.filter((item) => !state.deleted.includes(String(item.id))), [notifications, state.deleted]);
  const unreadCount = available.filter((item) => !state.read.includes(String(item.id))).length;
  const visible = filter === 'unread' ? available.filter((item) => !state.read.includes(String(item.id))) : available;

  useEffect(() => {
    const closeOutside = (event) => { if (!containerRef.current?.contains(event.target)) setOpen(false); };
    const refresh = () => { setNotifications(getAvailableUserNotifications()); setState(getUserNotificationState()); };
    document.addEventListener('mousedown', closeOutside);
    window.addEventListener('storage', refresh);
    window.addEventListener('aptimate:notification-state-change', refresh);
    return () => { document.removeEventListener('mousedown', closeOutside); window.removeEventListener('storage', refresh); window.removeEventListener('aptimate:notification-state-change', refresh); };
  }, []);

  const markRead = (id) => {
    const key = String(id);
    if (!state.read.includes(key)) saveState({ ...state, read: [...state.read, key] });
  };
  const markAllRead = () => saveState({ ...state, read: [...new Set([...state.read, ...available.map((item) => String(item.id))])] });
  const remove = (id) => saveState({ ...state, deleted: [...state.deleted, String(id)] });
  const viewDetail = (item) => {
    markRead(item.id);
    setOpen(false);
    navigate('/profile/notifications', { state: { notificationId: String(item.id) } });
  };

  return <div className={styles.container} ref={containerRef}>
    <button className={`${styles.bellButton} ${open ? styles.bellActive : ''}`} onClick={() => setOpen((value) => !value)} aria-label={t('notifications.title')} aria-expanded={open}>
      <Bell aria-hidden="true" />{unreadCount > 0 && <span className={styles.badge}>{unreadCount > 9 ? '9+' : unreadCount}</span>}
    </button>

    {open && <section className={styles.panel} aria-label={t('notifications.title')}>
      <header><h2>{t('notifications.title')}</h2><button onClick={markAllRead} disabled={!unreadCount} title={t('notifications.markAllRead')}><CheckCheck /></button></header>
      <nav><button className={filter === 'all' ? styles.activeFilter : ''} onClick={() => setFilter('all')}>{t('notifications.all')}</button><button className={filter === 'unread' ? styles.activeFilter : ''} onClick={() => setFilter('unread')}>{t('notifications.unread')}</button></nav>
      <div className={styles.list}>
        {visible.length ? visible.map((item) => {
          const unread = !state.read.includes(String(item.id));
          return <article className={`${styles.item} ${unread ? styles.unread : ''}`} key={item.id} onClick={() => viewDetail(item)} role="button" tabIndex={0} onKeyDown={(event) => { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); viewDetail(item); } }}>
            <div className={styles.icon}>{item.type === 'Email' ? <BellRing /> : <Bell />}</div>
            <div className={styles.message}><p>{notificationContent(item, t)}</p><span>{relativeTime(item.date, t, i18n.language === 'vi' ? 'vi-VN' : 'en-US')} · {t(`notifications.types.${item.type}`, { defaultValue: item.type })}{item.fileData && <> · <Paperclip aria-hidden="true" /> {t('notifications.attachment')}</>}</span></div>
            <div className={styles.itemActions}>{unread && <i aria-label={t('notifications.unread')} />}<button onClick={(event) => { event.stopPropagation(); remove(item.id); }} title={t('notifications.remove')}><Trash2 /></button></div>
          </article>;
        }) : <div className={styles.empty}><Bell /><h3>{t('notifications.caughtUp')}</h3><p>{t(filter === 'unread' ? 'notifications.emptyUnread' : 'notifications.empty')}</p></div>}
      </div>
      <footer><button onClick={() => { setOpen(false); navigate('/profile/notifications'); }}>{t('notifications.seeAll')}</button></footer>
    </section>}
  </div>;
}
