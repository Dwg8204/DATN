import { useEffect, useMemo, useRef, useState } from 'react';
import { Bell, BellRing, CheckCheck, Paperclip, Trash2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { mapUserNotification, userNotificationsApi } from '../../features/profile/services/userNotificationsApi';
import { subscribeToRealtimeNotifications } from '../../features/profile/services/notificationSocket';
import { useToast } from '../../context/ToastContext';
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
  const { showInfo } = useToast();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [filter, setFilter] = useState('all');
  const [notifications, setNotifications] = useState([]);
  const containerRef = useRef(null);

  const available = useMemo(() => notifications, [notifications]);
  const unreadCount = available.filter((item) => !item.readAt).length;
  const visible = filter === 'unread' ? available.filter((item) => !item.readAt) : available;

  useEffect(() => {
    const closeOutside = (event) => { if (!containerRef.current?.contains(event.target)) setOpen(false); };
    const refresh = () => userNotificationsApi.list().then(({ items }) => setNotifications(items)).catch(() => undefined);
    refresh();
    document.addEventListener('mousedown', closeOutside);
    return () => { document.removeEventListener('mousedown', closeOutside); };
  }, []);

  useEffect(() => subscribeToRealtimeNotifications(payload => {
    const item = mapUserNotification(payload);
    setNotifications(current => [item, ...current.filter(notification => notification.id !== item.id)]);
    showInfo(item.title ? `${item.title}: ${item.content}` : item.content);
  }), [showInfo]);

  const markRead = async (id) => {
    const item = notifications.find(notification => notification.id === String(id));
    if (!item || item.readAt) return;
    await userNotificationsApi.markRead(id);
    setNotifications(current => current.map(notification => notification.id === String(id)
      ? { ...notification, readAt: new Date().toISOString() }
      : notification));
  };
  const markAllRead = async () => {
    await userNotificationsApi.markAllRead();
    const readAt = new Date().toISOString();
    setNotifications(current => current.map(item => ({ ...item, readAt: item.readAt || readAt })));
  };
  const remove = async (id) => {
    await userNotificationsApi.dismiss(id);
    setNotifications(current => current.filter(item => item.id !== String(id)));
  };
  const viewDetail = async (item) => {
    await markRead(item.id).catch(() => undefined);
    setOpen(false);
    navigate('/profile/notifications', { state: { notificationId: String(item.id) } });
  };
  const togglePanel = () => {
    const nextOpen = !open;
    setOpen(nextOpen);
    if (nextOpen) {
      userNotificationsApi.list().then(({ items }) => setNotifications(items)).catch(() => undefined);
    }
  };

  return <div className={styles.container} ref={containerRef}>
    <button className={`${styles.bellButton} ${open ? styles.bellActive : ''}`} onClick={togglePanel} aria-label={t('notifications.title')} aria-expanded={open}>
      <Bell aria-hidden="true" />{unreadCount > 0 && <span className={styles.badge}>{unreadCount > 9 ? '9+' : unreadCount}</span>}
    </button>

    {open && <section className={styles.panel} aria-label={t('notifications.title')}>
      <header><h2>{t('notifications.title')}</h2><button onClick={() => markAllRead().catch(() => undefined)} disabled={!unreadCount} title={t('notifications.markAllRead')}><CheckCheck /></button></header>
      <nav><button className={filter === 'all' ? styles.activeFilter : ''} onClick={() => setFilter('all')}>{t('notifications.all')}</button><button className={filter === 'unread' ? styles.activeFilter : ''} onClick={() => setFilter('unread')}>{t('notifications.unread')}</button></nav>
      <div className={styles.list}>
        {visible.length ? visible.map((item) => {
          const unread = !item.readAt;
          return <article className={`${styles.item} ${unread ? styles.unread : ''}`} key={item.id} onClick={() => viewDetail(item)} role="button" tabIndex={0} onKeyDown={(event) => { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); viewDetail(item); } }}>
            <div className={styles.icon}>{item.type === 'Email' ? <BellRing /> : <Bell />}</div>
            <div className={styles.message}><p>{notificationContent(item, t)}</p><span>{relativeTime(item.date, t, i18n.language === 'vi' ? 'vi-VN' : 'en-US')} · {t(`notifications.types.${item.type}`, { defaultValue: item.type })}{item.fileData && <> · <Paperclip aria-hidden="true" /> {t('notifications.attachment')}</>}</span></div>
            <div className={styles.itemActions}>{unread && <i aria-label={t('notifications.unread')} />}<button onClick={(event) => { event.stopPropagation(); remove(item.id).catch(() => undefined); }} title={t('notifications.remove')}><Trash2 /></button></div>
          </article>;
        }) : <div className={styles.empty}><Bell /><h3>{t('notifications.caughtUp')}</h3><p>{t(filter === 'unread' ? 'notifications.emptyUnread' : 'notifications.empty')}</p></div>}
      </div>
      <footer><button onClick={() => { setOpen(false); navigate('/profile/notifications'); }}>{t('notifications.seeAll')}</button></footer>
    </section>}
  </div>;
}
