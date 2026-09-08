import { useEffect, useMemo, useRef, useState } from 'react';
import { Bell, BellRing, CheckCheck, Trash2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { getAvailableUserNotifications, getUserNotificationState, saveUserNotificationState } from '../../utils/notificationStorage';
import styles from './UserNotifications.module.css';

function relativeTime(value) {
  const seconds = Math.max(1, Math.floor((Date.now() - new Date(value).getTime()) / 1000));
  if (seconds < 60) return 'Just now';
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d`;
  return new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric' }).format(new Date(value));
}

export default function UserNotifications() {
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
    <button className={`${styles.bellButton} ${open ? styles.bellActive : ''}`} onClick={() => setOpen((value) => !value)} aria-label={`Notifications${unreadCount ? `, ${unreadCount} unread` : ''}`} aria-expanded={open}>
      <Bell aria-hidden="true" />{unreadCount > 0 && <span className={styles.badge}>{unreadCount > 9 ? '9+' : unreadCount}</span>}
    </button>

    {open && <section className={styles.panel} aria-label="Notifications">
      <header><h2>Notifications</h2><button onClick={markAllRead} disabled={!unreadCount} title="Mark all as read"><CheckCheck /></button></header>
      <nav><button className={filter === 'all' ? styles.activeFilter : ''} onClick={() => setFilter('all')}>All</button><button className={filter === 'unread' ? styles.activeFilter : ''} onClick={() => setFilter('unread')}>Unread</button></nav>
      <div className={styles.list}>
        {visible.length ? visible.map((item) => {
          const unread = !state.read.includes(String(item.id));
          return <article className={`${styles.item} ${unread ? styles.unread : ''}`} key={item.id} onClick={() => viewDetail(item)} role="button" tabIndex={0} onKeyDown={(event) => { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); viewDetail(item); } }}>
            <div className={styles.icon}>{item.type === 'Email' ? <BellRing /> : <Bell />}</div>
            <div className={styles.message}><p>{item.content}</p><span>{relativeTime(item.date)} · {item.type}</span></div>
            <div className={styles.itemActions}>{unread && <i aria-label="Unread" />}<button onClick={(event) => { event.stopPropagation(); remove(item.id); }} title="Remove notification"><Trash2 /></button></div>
          </article>;
        }) : <div className={styles.empty}><Bell /><h3>You’re all caught up</h3><p>No {filter === 'unread' ? 'unread ' : ''}notifications to show.</p></div>}
      </div>
      <footer><button onClick={() => { setOpen(false); navigate('/profile/notifications'); }}>See all notifications</button></footer>
    </section>}
  </div>;
}
