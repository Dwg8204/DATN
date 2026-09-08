export const ADMIN_NOTIFICATION_STORAGE_KEY = 'aptimate.admin.notifications';
export const USER_NOTIFICATION_STATE_KEY = 'aptimate.user.notificationState';

const defaultNotifications = [
  { id: 'welcome', date: new Date(Date.now() - 12 * 60000).toISOString(), content: 'Welcome to AptiMate! Start your first practice test and discover your current level.', target: 'Everyone', type: 'Push notification' },
  { id: 'streak', date: new Date(Date.now() - 3 * 3600000).toISOString(), content: 'You are one lesson away from completing today’s learning goal.', target: 'Student', type: 'Push notification' },
  { id: 'reading', date: new Date(Date.now() - 26 * 3600000).toISOString(), content: 'A new Reading practice set is now available. Give it a try!', target: 'Student', type: 'Push notification' },
];

export function readStoredJson(key, fallback) {
  try { return JSON.parse(window.localStorage.getItem(key) || JSON.stringify(fallback)); } catch { return fallback; }
}

export function getAvailableUserNotifications() {
  const adminNotifications = readStoredJson(ADMIN_NOTIFICATION_STORAGE_KEY, []);
  const now = Date.now();
  return [...adminNotifications, ...defaultNotifications]
    .filter((item) => ['Everyone', 'Student'].includes(item.target) && new Date(item.date).getTime() <= now)
    .sort((a, b) => new Date(b.date) - new Date(a.date));
}

export function getUserNotificationState() {
  return readStoredJson(USER_NOTIFICATION_STATE_KEY, { read: [], deleted: [] });
}

export function saveUserNotificationState(state) {
  window.localStorage.setItem(USER_NOTIFICATION_STATE_KEY, JSON.stringify(state));
  window.dispatchEvent(new CustomEvent('aptimate:notification-state-change'));
}

export function formatNotificationDate(value) {
  return new Intl.DateTimeFormat('en-GB', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }).format(new Date(value));
}
