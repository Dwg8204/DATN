import { useEffect, useMemo, useRef, useState } from 'react';
import { Bell, BellRing, CheckCheck, Trash2 } from 'lucide-react';
import styles from './UserNotifications.module.css';

const ADMIN_STORAGE_KEY = 'aptimate.admin.notifications';
const USER_STATE_KEY = 'aptimate.user.notificationState';

const defaultNotifications = [
  { id: 'welcome', date: new Date(Date.now() - 12 * 60000).toISOString(), content: 'Welcome to AptiMate! Start your first practice test and discover your current level.', target: 'Everyone', type: 'Push notification' },
  { id: 'streak', date: new Date(Date.now() - 3 * 3600000).toISOString(), content: 'You are one lesson away from completing today’s learning goal.', target: 'Student', type: 'Push notification' },
  { id: 'reading', date: new Date(Date.now() - 26 * 3600000).toISOString(), content: 'A new Reading practice set is now available. Give it a try!', target: 'Student', type: 'Banner' },
];

function readJson(key, fallback) {
  try { return JSON.parse(window.localStorage.getItem(key) || JSON.stringify(fallback)); } catch { return fallback; }
}

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

function loadAvailableNotifications() {
  const adminNotifications = readJson(ADMIN_STORAGE_KEY, []);
  const now = Date.now();
  return [...adminNotifications, ...defaultNotifications]
    .filter((item) => ['Everyone', 'Student'].includes(item.target) && new Date(item.date).getTime() <= now)
    .sort((a, b) => new Date(b.date) - new Date(a.date));
}

export default function UserNotifications() {
  const [open, setOpen] = useState(false);
  const [filter, setFilter] = useState('all');
  const [notifications, setNotifications] = useState(loadAvailableNotifications);
  const [state, setState] = useState(() => readJson(USER_STATE_KEY, { read: [], deleted: [] }));
  const containerRef = useRef(null);

  const saveState = (next) => { setState(next); window.localStorage.setItem(USER_STATE_KEY, JSON.stringify(next)); };
  const available = useMemo(() => notifications.filter((item) => !state.deleted.includes(String(item.id))), [notifications, state.deleted]);
  const unreadCount = available.filter((item) => !state.read.includes(String(item.id))).length;
  const visible = filter === 'unread' ? available.filter((item) => !state.read.includes(String(item.id))) : available;

  useEffect(() => {
    const closeOutside = (event) => { if (!containerRef.current?.contains(event.target)) setOpen(false); };
    const refresh = () => setNotifications(loadAvailableNotifications());
    document.addEventListener('mousedown', closeOutside);
    window.addEventListener('storage', refresh);
    return () => { document.removeEventListener('mousedown', closeOutside); window.removeEventListener('storage', refresh); };
  }, []);

  const markRead = (id) => {
    const key = String(id);
    if (!state.read.includes(key)) saveState({ ...state, read: [...state.read, key] });
  };
  const markAllRead = () => saveState({ ...state, read: [...new Set([...state.read, ...available.map((item) => String(item.id))])] });
  const remove = (id) => saveState({ ...state, deleted: [...state.deleted, String(id)] });

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
          return <article className={`${styles.item} ${unread ? styles.unread : ''}`} key={item.id} onClick={() => markRead(item.id)}>
            <div className={styles.icon}>{item.type === 'Email' ? <BellRing /> : <Bell />}</div>
            <div className={styles.message}><p>{item.content}</p><span>{relativeTime(item.date)} · {item.type}</span></div>
            <div className={styles.itemActions}>{unread && <i aria-label="Unread" />}<button onClick={(event) => { event.stopPropagation(); remove(item.id); }} title="Remove notification"><Trash2 /></button></div>
          </article>;
        }) : <div className={styles.empty}><Bell /><h3>You’re all caught up</h3><p>No {filter === 'unread' ? 'unread ' : ''}notifications to show.</p></div>}
      </div>
      <footer><button onClick={() => { markAllRead(); setOpen(false); }}>See all notifications</button></footer>
    </section>}
  </div>;
}
