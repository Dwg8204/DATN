import { useMemo, useRef, useState } from 'react';
import { Download, Eye, Paperclip, Send, X } from 'lucide-react';
import { AdminToast } from '../components/AdminFeedback';
import Pagination from '../../../components/common/Pagination';
import AnswerSelect from '../../../components/common/AnswerSelect';
import styles from './NotificationPage.module.css';

const STORAGE_KEY = 'aptimate.admin.notifications';
const MAX_ATTACHMENT_SIZE = 2 * 1024 * 1024;


const initialNotifications = [
  { id: 1, date: '2026-07-15T07:30', content: 'Hey Lee! We’re thrilled to have you on board. Start your first practice test today.', target: 'Student', type: 'Push notification' },
  { id: 2, date: '2026-09-09T09:00', content: 'A new Writing test is ready for review. Please check the submitted content.', target: 'Teacher', type: 'Email' },
  { id: 3, date: '2026-09-09T10:30', content: 'AptiMate maintenance is scheduled for tonight from 11:00 PM.', target: 'Everyone', type: 'Push notification' },
  { id: 4, date: '2026-03-09T08:15', content: 'Your weekly learning report is now available.', target: 'Everyone', type: 'Email' },
  { id: 5, date: '2025-11-12T14:00', content: 'Your Reading practice streak has reached seven days. Keep it going!', target: 'Student', type: 'Push notification' },
  { id: 6, date: '2025-12-28T16:45', content: 'New student submissions are waiting for feedback.', target: 'Teacher', type: 'Email' },
  { id: 7, date: '2025-10-14T11:20', content: 'Explore our latest Aptis preparation resources.', target: 'Everyone', type: 'Push notification' },
  { id: 8, date: '2025-07-24T13:10', content: 'Your assigned Speaking assessments have been updated.', target: 'Teacher', type: 'Push notification' },
  { id: 9, date: '2025-12-21T08:00', content: 'Holiday study challenge: complete three lessons this week.', target: 'Everyone', type: 'Email' },
];

function loadNotifications() {
  try {
    const saved = JSON.parse(window.localStorage.getItem(STORAGE_KEY) || '[]');
    return [...saved.filter((item) => item.type !== 'Banner'), ...initialNotifications];
  } catch {
    return initialNotifications;
  }
}

const formatDate = (value) => new Intl.DateTimeFormat('en-US', {
  month: 'short', day: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit',
}).format(new Date(value));

const toLocalDateTimeMinute = (date = new Date()) => {
  const localDate = new Date(date.getTime() - date.getTimezoneOffset() * 60000);
  return localDate.toISOString().slice(0, 16);
};

const nextAvailableMinute = () => toLocalDateTimeMinute(new Date(Date.now() + 60000));

const emptyForm = () => ({
  target: 'Everyone', type: 'Push notification', deliveryMode: 'now', date: nextAvailableMinute(), content: '', fileName: '', fileType: '', fileSize: 0, fileData: '',
});

const formatFileSize = (bytes = 0) => bytes < 1024 ? `${bytes} B` : bytes < 1024 * 1024 ? `${(bytes / 1024).toFixed(1)} KB` : `${(bytes / (1024 * 1024)).toFixed(1)} MB`;

function AttachmentLink({ notification, onPreview }) {
  if (!notification.fileName) return null;
  return <div className={styles.previewFile}>
    <Paperclip />
    <div><strong>{notification.fileName}</strong>{notification.fileSize > 0 && <small>{formatFileSize(notification.fileSize)}</small>}</div>
    {notification.fileData
      ? <div className={styles.fileActions}>
          <button type="button" onClick={() => onPreview(notification)} title={`Preview ${notification.fileName}`}><Eye />Preview</button>
          <a href={notification.fileData} download={notification.fileName} title={`Download ${notification.fileName}`}><Download />Download</a>
        </div>
      : <span className={styles.unavailableFile}>File data unavailable</span>}
  </div>;
}

export default function NotificationPage() {
  const [form, setForm] = useState(emptyForm);
  const [notifications, setNotifications] = useState(loadNotifications);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(8);
  const [preview, setPreview] = useState(false);
  const [selectedNotification, setSelectedNotification] = useState(null);
  const [previewAttachment, setPreviewAttachment] = useState(null);
  const [toast, setToast] = useState('');
  const [error, setError] = useState('');
  const [readingFile, setReadingFile] = useState(false);
  const fileRef = useRef(null);
  const visibleNotifications = useMemo(() => notifications.slice((page - 1) * pageSize, page * pageSize), [notifications, page, pageSize]);

  const update = (field, value) => setForm((current) => ({ ...current, [field]: value }));
  const validate = () => {
    if (readingFile) return 'Please wait for the attachment to finish loading.';
    if (!form.content.trim()) return 'Please enter notification content.';
    if (form.deliveryMode === 'scheduled') {
      if (!form.date) return 'Please select a delivery date and time.';
      if (new Date(form.date).getTime() <= Date.now()) return 'Scheduled notifications must be set for a future time.';
    }
    return '';
  };
  const selectFile = (file) => {
    if (!file) {
      setForm((current) => ({ ...current, fileName: '', fileType: '', fileSize: 0, fileData: '' }));
      return;
    }
    if (file.size > MAX_ATTACHMENT_SIZE) {
      setError('Attachment must be 2 MB or smaller.');
      if (fileRef.current) fileRef.current.value = '';
      return;
    }
    setReadingFile(true);
    setError('');
    const reader = new FileReader();
    reader.onload = () => {
      setForm((current) => ({ ...current, fileName: file.name, fileType: file.type, fileSize: file.size, fileData: String(reader.result || '') }));
      setReadingFile(false);
    };
    reader.onerror = () => {
      setError('The selected file could not be read. Please choose another file.');
      setReadingFile(false);
      if (fileRef.current) fileRef.current.value = '';
    };
    reader.readAsDataURL(file);
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
    const created = { ...form, date: form.deliveryMode === 'now' ? new Date().toISOString() : form.date, id: Date.now() };
    const saved = [created, ...notifications.filter((item) => !initialNotifications.some((initial) => initial.id === item.id))];
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(saved));
    } catch {
      setError('The attachment could not be saved because browser storage is full. Please use a smaller file.');
      return;
    }
    setNotifications((current) => [created, ...current]);
    setForm(emptyForm());
    setPage(1);
    setPreview(false);
    setError('');
    setToast(form.deliveryMode === 'now' ? 'Notification sent successfully.' : 'Notification scheduled successfully.');
    if (fileRef.current) fileRef.current.value = '';
  };

  return (
    <div className={styles.page}>
      <AdminToast message={toast} onClose={() => setToast('')} />

      <section className={styles.workspace}>
        <form className={styles.composer} onSubmit={(event) => { event.preventDefault(); sendNotification(); }}>
          <header><h3>Create a new notification</h3><p>Choose an audience and delivery method.</p></header>

          <label className={styles.field}>Target
            <AnswerSelect value={form.target} onChange={(event) => update('target', event.target.value)} options={['Everyone','Student','Teacher']} ariaLabel="Target audience"/>
          </label>

          <fieldset className={styles.types}>
            <legend>Notification type</legend>
            {['Push notification', 'Email'].map((type) => <label key={type}><input type="radio" name="notificationType" checked={form.type === type} onChange={() => update('type', type)} /><span>{type}</span></label>)}
          </fieldset>

          <fieldset className={styles.deliveryOptions}>
            <legend>Delivery time</legend>
            <div>
              <label className={form.deliveryMode === 'now' ? styles.selectedDelivery : ''}>
                <input type="radio" name="deliveryMode" checked={form.deliveryMode === 'now'} onChange={() => { update('deliveryMode', 'now'); setError(''); }} />
                <span><strong>Send immediately</strong><small>Deliver as soon as you confirm.</small></span>
              </label>
              <label className={form.deliveryMode === 'scheduled' ? styles.selectedDelivery : ''}>
                <input type="radio" name="deliveryMode" checked={form.deliveryMode === 'scheduled'} onChange={() => { setForm((current) => ({ ...current, deliveryMode: 'scheduled', date: new Date(current.date).getTime() > Date.now() ? current.date : nextAvailableMinute() })); setError(''); }} />
                <span><strong>Schedule for later</strong><small>Choose a future delivery time.</small></span>
              </label>
            </div>
          </fieldset>

          {form.deliveryMode === 'scheduled' && <label className={styles.field}>Scheduled date &amp; time
            <input type="datetime-local" min={nextAvailableMinute()} step="60" value={form.date} onChange={(event) => { update('date', event.target.value); setError(''); }} />
          </label>}

          <label className={styles.field}>Content
            <textarea rows="7" maxLength="500" value={form.content} onChange={(event) => { update('content', event.target.value); setError(''); }} placeholder="Write the message here" />
            <small>{form.content.length}/500 characters</small>
          </label>
          {error && <p className={styles.error}>{error}</p>}

          <div className={styles.composerFooter}>
            <label className={styles.attachment}><Paperclip /><span>{readingFile ? 'Loading file…' : form.fileName || 'Attach files (max 2 MB)'}</span><input ref={fileRef} type="file" onChange={(event) => selectFile(event.target.files?.[0])} /></label>
            <div><button type="button" className={styles.previewButton} onClick={showPreview}><Eye />Preview</button><button type="submit" className={styles.sendButton}><Send />Send</button></div>
          </div>
        </form>

        <section className={styles.history}>
          <header><div><h3>Notification history</h3><p>{notifications.length} messages</p></div></header>
          <div className={styles.tableScroll}>
            <table>
              <thead><tr><th>Date &amp; time</th><th>Content</th><th>Target</th><th>Type</th><th><span className={styles.visuallyHidden}>Actions</span></th></tr></thead>
              <tbody>{visibleNotifications.map((item) => <tr key={item.id}>
                <td>{formatDate(item.date)}</td>
                <td><span className={styles.contentPreview} title={item.content}>{item.content}</span></td>
                <td><span className={`${styles.target} ${styles[item.target.toLowerCase()]}`}>{item.target}</span></td>
                <td>{item.type}</td>
                <td><button type="button" className={styles.viewButton} onClick={() => setSelectedNotification(item)} aria-label={`View notification sent on ${formatDate(item.date)}`} title="View details"><Eye /></button></td>
              </tr>)}</tbody>
            </table>
          </div>
          <Pagination page={page} totalItems={notifications.length} pageSize={pageSize} onPageChange={setPage} onPageSizeChange={setPageSize} />
        </section>
      </section>

      {preview && <div className={styles.backdrop} onMouseDown={() => setPreview(false)}><section className={styles.previewModal} role="dialog" aria-modal="true" onMouseDown={(event) => event.stopPropagation()}>
        <header><div><span>Notification preview</span><h3>{form.type}</h3></div><button onClick={() => setPreview(false)} aria-label="Close preview"><X /></button></header>
        <div className={styles.previewAudience}>To: <strong>{form.target}</strong> · {form.deliveryMode === 'now' ? 'Send immediately' : formatDate(form.date)}</div>
        <p>{form.content}</p>
        <AttachmentLink notification={form} onPreview={setPreviewAttachment} />
        <footer><button onClick={() => setPreview(false)}>Back to edit</button><button onClick={sendNotification}><Send />Confirm &amp; send</button></footer>
      </section></div>}

      {selectedNotification && <div className={styles.backdrop} onMouseDown={() => setSelectedNotification(null)}><section className={styles.previewModal} role="dialog" aria-modal="true" aria-labelledby="notification-detail-title" onMouseDown={(event) => event.stopPropagation()}>
        <header><div><span>Notification details</span><h3 id="notification-detail-title">{selectedNotification.type}</h3></div><button type="button" onClick={() => setSelectedNotification(null)} aria-label="Close notification details"><X /></button></header>
        <dl className={styles.detailMeta}>
          <div><dt>Target</dt><dd><span className={`${styles.target} ${styles[selectedNotification.target.toLowerCase()]}`}>{selectedNotification.target}</span></dd></div>
          <div><dt>Date &amp; time</dt><dd>{formatDate(selectedNotification.date)}</dd></div>
        </dl>
        <div className={styles.detailContent}><strong>Content</strong><p>{selectedNotification.content}</p></div>
        <AttachmentLink notification={selectedNotification} onPreview={setPreviewAttachment} />
        <footer><button type="button" onClick={() => setSelectedNotification(null)}>Close</button></footer>
      </section></div>}

      {previewAttachment && <div className={styles.fileBackdrop} onMouseDown={() => setPreviewAttachment(null)}>
        <section className={styles.filePreviewModal} role="dialog" aria-modal="true" aria-labelledby="file-preview-title" onMouseDown={(event) => event.stopPropagation()}>
          <header>
            <div><span>Attachment preview</span><h3 id="file-preview-title">{previewAttachment.fileName}</h3></div>
            <button type="button" onClick={() => setPreviewAttachment(null)} aria-label="Close file preview"><X /></button>
          </header>
          <div className={styles.fileViewer}>
            {previewAttachment.fileType?.startsWith('image/') && <img src={previewAttachment.fileData} alt={previewAttachment.fileName} />}
            {previewAttachment.fileType === 'application/pdf' && <iframe src={previewAttachment.fileData} title={previewAttachment.fileName} />}
            {previewAttachment.fileType?.startsWith('text/') && <iframe src={previewAttachment.fileData} title={previewAttachment.fileName} />}
            {previewAttachment.fileType?.startsWith('audio/') && <audio src={previewAttachment.fileData} controls />}
            {previewAttachment.fileType?.startsWith('video/') && <video src={previewAttachment.fileData} controls />}
            {!previewAttachment.fileType?.startsWith('image/') && previewAttachment.fileType !== 'application/pdf' && !previewAttachment.fileType?.startsWith('text/') && !previewAttachment.fileType?.startsWith('audio/') && !previewAttachment.fileType?.startsWith('video/') && <div className={styles.unsupportedPreview}><Paperclip /><strong>Preview is not available for this file type.</strong><span>You can download the file and open it with a compatible application.</span></div>}
          </div>
          <footer>
            <button type="button" onClick={() => setPreviewAttachment(null)}>Close</button>
            <a href={previewAttachment.fileData} download={previewAttachment.fileName}><Download />Download file</a>
          </footer>
        </section>
      </div>}
    </div>
  );
}
