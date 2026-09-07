import { useMemo, useRef, useState } from 'react';
import { Eye, Paperclip, Send, X } from 'lucide-react';
import { AdminToast } from '../components/AdminFeedback';
import Pagination from '../../../components/common/Pagination';
import AnswerSelect from '../../../components/common/AnswerSelect';
import styles from './NotificationPage.module.css';

const STORAGE_KEY = 'aptimate.admin.notifications';


const initialNotifications = [
  { id: 1, date: '2026-07-15T07:30', content: 'Hey Lee! We’re thrilled to have you on board. Start your first practice test today.', target: 'Student', type: 'Push notification' },
  { id: 2, date: '2026-09-09T09:00', content: 'A new Writing test is ready for review. Please check the submitted content.', target: 'Teacher', type: 'Email' },
  { id: 3, date: '2026-09-09T10:30', content: 'AptiMate maintenance is scheduled for tonight from 11:00 PM.', target: 'Everyone', type: 'Push notification' },
  { id: 4, date: '2026-03-09T08:15', content: 'Your weekly learning report is now available.', target: 'Everyone', type: 'Email' },
  { id: 5, date: '2025-11-12T14:00', content: 'Your Reading practice streak has reached seven days. Keep it going!', target: 'Student', type: 'Push notification' },
  { id: 6, date: '2025-12-28T16:45', content: 'New student submissions are waiting for feedback.', target: 'Teacher', type: 'Email' },
  { id: 7, date: '2025-10-14T11:20', content: 'Explore our latest Aptis preparation resources.', target: 'Everyone', type: 'Banner' },
  { id: 8, date: '2025-07-24T13:10', content: 'Your assigned Speaking assessments have been updated.', target: 'Teacher', type: 'Push notification' },
  { id: 9, date: '2025-12-21T08:00', content: 'Holiday study challenge: complete three lessons this week.', target: 'Everyone', type: 'Email' },
];

function loadNotifications() {
  try {
    const saved = JSON.parse(window.localStorage.getItem(STORAGE_KEY) || '[]');
    return [...saved, ...initialNotifications];
  } catch {
    return initialNotifications;
  }
}

const formatDate = (value) => new Intl.DateTimeFormat('en-US', {
  month: 'short', day: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit',
}).format(new Date(value));

const emptyForm = () => ({
  target: 'Everyone', type: 'Push notification', date: new Date(Date.now() + 3600000).toISOString().slice(0, 16), content: '', fileName: '',
});

export default function NotificationPage() {
  const [form, setForm] = useState(emptyForm);
  const [notifications, setNotifications] = useState(loadNotifications);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(8);
  const [preview, setPreview] = useState(false);
  const [toast, setToast] = useState('');
  const [error, setError] = useState('');
  const fileRef = useRef(null);
  const visibleNotifications = useMemo(() => notifications.slice((page - 1) * pageSize, page * pageSize), [notifications, page, pageSize]);

  const update = (field, value) => setForm((current) => ({ ...current, [field]: value }));
  const validate = () => {
    if (!form.content.trim()) return 'Please enter notification content.';
    if (!form.date) return 'Please select a delivery date and time.';
    return '';
  };
  const showPreview = () => {
    const message = validate();
    if (message) { setError(message); return; }
    setError('');
    setPreview(true);
  };
  const sendNotification = () => {
    const message = validate();
    if (message) { setError(message); return; }
    const created = { ...form, id: Date.now() };
    const saved = [created, ...notifications.filter((item) => !initialNotifications.some((initial) => initial.id === item.id))];
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(saved));
    setNotifications((current) => [created, ...current]);
    setForm(emptyForm());
    setPage(1);
    setPreview(false);
    setError('');
    setToast('Notification scheduled successfully.');
    if (fileRef.current) fileRef.current.value = '';
  };

  return (
    <div className={styles.page}>
      <AdminToast message={toast} onClose={() => setToast('')} />
      <div className={styles.heading}>
        <div><span>Communication centre</span><h2>Notifications</h2><p>Create announcements and review messages sent to AptiMate users.</p></div>
      </div>

      <section className={styles.workspace}>
        <form className={styles.composer} onSubmit={(event) => { event.preventDefault(); sendNotification(); }}>
          <header><h3>Create a new notification</h3><p>Choose an audience and delivery method.</p></header>

          <label className={styles.field}>Target
            <AnswerSelect value={form.target} onChange={(event) => update('target', event.target.value)} options={['Everyone','Student','Teacher']} ariaLabel="Target audience"/>
          </label>

          <fieldset className={styles.types}>
            <legend>Notification type</legend>
            {['Push notification', 'Email', 'Banner'].map((type) => <label key={type}><input type="radio" name="notificationType" checked={form.type === type} onChange={() => update('type', type)} /><span>{type}</span></label>)}
          </fieldset>

          <label className={styles.field}>Date &amp; time
            <input type="datetime-local" value={form.date} onChange={(event) => update('date', event.target.value)} />
          </label>

          <label className={styles.field}>Content
            <textarea rows="7" maxLength="500" value={form.content} onChange={(event) => { update('content', event.target.value); setError(''); }} placeholder="Write the message here" />
            <small>{form.content.length}/500 characters</small>
          </label>
          {error && <p className={styles.error}>{error}</p>}

          <div className={styles.composerFooter}>
            <label className={styles.attachment}><Paperclip /><span>{form.fileName || 'Attach files'}</span><input ref={fileRef} type="file" onChange={(event) => update('fileName', event.target.files?.[0]?.name || '')} /></label>
            <div><button type="button" className={styles.previewButton} onClick={showPreview}><Eye />Preview</button><button type="submit" className={styles.sendButton}><Send />Send</button></div>
          </div>
        </form>

        <section className={styles.history}>
          <header><div><h3>Notification history</h3><p>{notifications.length} messages</p></div></header>
          <div className={styles.tableScroll}>
            <table>
              <thead><tr><th>Date &amp; time</th><th>Content</th><th>Target</th><th>Type</th></tr></thead>
              <tbody>{visibleNotifications.map((item) => <tr key={item.id}><td>{formatDate(item.date)}</td><td title={item.content}>{item.content}</td><td><span className={`${styles.target} ${styles[item.target.toLowerCase()]}`}>{item.target}</span></td><td>{item.type}</td></tr>)}</tbody>
            </table>
          </div>
          <Pagination page={page} totalItems={notifications.length} pageSize={pageSize} onPageChange={setPage} onPageSizeChange={setPageSize} />
        </section>
      </section>

      {preview && <div className={styles.backdrop} onMouseDown={() => setPreview(false)}><section className={styles.previewModal} role="dialog" aria-modal="true" onMouseDown={(event) => event.stopPropagation()}>
        <header><div><span>Notification preview</span><h3>{form.type}</h3></div><button onClick={() => setPreview(false)} aria-label="Close preview"><X /></button></header>
        <div className={styles.previewAudience}>To: <strong>{form.target}</strong> · {formatDate(form.date)}</div>
        <p>{form.content}</p>
        {form.fileName && <div className={styles.previewFile}><Paperclip />{form.fileName}</div>}
        <footer><button onClick={() => setPreview(false)}>Back to edit</button><button onClick={sendNotification}><Send />Confirm &amp; send</button></footer>
      </section></div>}
    </div>
  );
}
