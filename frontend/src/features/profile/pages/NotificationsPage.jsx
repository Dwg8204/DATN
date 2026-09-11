import { useMemo, useState } from 'react';
import { Bell, BellRing, CheckCheck, Clock3, Download, Eye, Mail, Paperclip, Trash2, X } from 'lucide-react';
import { useLocation } from 'react-router-dom';
import ProfileSidebar from '../components/ProfileSidebar';
import {
  formatNotificationDate,
  getAvailableUserNotifications,
  getUserNotificationState,
  saveUserNotificationState,
} from '../../../utils/notificationStorage';
import styles from './NotificationsPage.module.css';

export default function NotificationsPage() {
  const location = useLocation();
  const [filter, setFilter] = useState('all');
  const [notifications] = useState(getAvailableUserNotifications);
  const [notificationState, setNotificationState] = useState(getUserNotificationState);
  const [selected, setSelected] = useState(() => {
    const requestedId = location.state?.notificationId;
    return requestedId
      ? getAvailableUserNotifications().find((item) => String(item.id) === requestedId) || null
      : null;
  });
  const [previewAttachment, setPreviewAttachment] = useState(null);

  const available = useMemo(
    () => notifications.filter((item) => !notificationState.deleted.includes(String(item.id))),
    [notifications, notificationState.deleted],
  );
  const visible = filter === 'unread'
    ? available.filter((item) => !notificationState.read.includes(String(item.id)))
    : available;
  const unreadCount = available.filter((item) => !notificationState.read.includes(String(item.id))).length;

  const updateState = (next) => {
    setNotificationState(next);
    saveUserNotificationState(next);
  };
  const markRead = (id) => {
    const key = String(id);
    if (!notificationState.read.includes(key)) {
      updateState({ ...notificationState, read: [...notificationState.read, key] });
    }
  };
  const openDetail = (item) => {
    markRead(item.id);
    setSelected(item);
  };
  const remove = (item) => {
    updateState({ ...notificationState, deleted: [...notificationState.deleted, String(item.id)] });
    if (selected?.id === item.id) setSelected(null);
  };
  const markAllRead = () => updateState({
    ...notificationState,
    read: [...new Set([...notificationState.read, ...available.map((item) => String(item.id))])],
  });

  return (
    <div className={styles.page}>
      <div className={styles.container}>
        <ProfileSidebar activeTab="notifications" />
        <main className={styles.content}>
          <header className={styles.header}>
            <div><span>ACCOUNT CENTRE</span><h1>Notifications</h1><p>Review updates and messages sent to your account.</p></div>
            <button className={styles.markAll} onClick={markAllRead} disabled={!unreadCount}><CheckCheck size={18} /> Mark all as read</button>
          </header>

          <div className={styles.filters}>
            <button className={filter === 'all' ? styles.active : ''} onClick={() => setFilter('all')}>All <span>{available.length}</span></button>
            <button className={filter === 'unread' ? styles.active : ''} onClick={() => setFilter('unread')}>Unread <span>{unreadCount}</span></button>
          </div>

          <section className={styles.list} aria-label="All notifications">
            {visible.length ? visible.map((item) => {
              const unread = !notificationState.read.includes(String(item.id));
              return (
                <article className={`${styles.item} ${unread ? styles.unread : ''}`} key={item.id} onClick={() => openDetail(item)}>
                  <div className={styles.icon}>{item.type === 'Email' ? <Mail /> : <Bell />}</div>
                  <div className={styles.itemBody}>
                    <div className={styles.itemTop}><strong>{item.type === 'Email' ? 'Email notification' : 'Learning notification'}</strong>{unread && <i />}</div>
                    <p>{item.content}</p>
                    <time><Clock3 size={13} />{formatNotificationDate(item.date)}</time>
                  </div>
                  <button className={styles.delete} onClick={(event) => { event.stopPropagation(); remove(item); }} title="Remove notification"><Trash2 size={17} /></button>
                </article>
              );
            }) : <div className={styles.empty}><BellRing /><h2>You’re all caught up</h2><p>There are no {filter === 'unread' ? 'unread ' : ''}notifications to display.</p></div>}
          </section>
        </main>
      </div>

      {selected && <div className={styles.overlay} role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) setSelected(null); }}>
        <section className={styles.detail} role="dialog" aria-modal="true" aria-labelledby="notification-detail-title">
          <button className={styles.close} onClick={() => setSelected(null)} aria-label="Close"><X /></button>
          <div className={styles.detailIcon}>{selected.type === 'Email' ? <Mail /> : <Bell />}</div>
          <span className={styles.detailEyebrow}>NOTIFICATION DETAIL</span>
          <h2 id="notification-detail-title">{selected.type === 'Email' ? 'Email notification' : 'Learning notification'}</h2>
          <p className={styles.fullMessage}>{selected.content}</p>
          <dl><div><dt>Date &amp; time</dt><dd>{formatNotificationDate(selected.date)}</dd></div><div><dt>Type</dt><dd>{selected.type}</dd></div><div><dt>Sent to</dt><dd>{selected.target}</dd></div></dl>
          {selected.fileName && <div className={styles.attachment}>
            <Paperclip />
            <div><strong>{selected.fileName}</strong>{selected.fileSize > 0 && <small>{selected.fileSize < 1048576 ? `${(selected.fileSize / 1024).toFixed(1)} KB` : `${(selected.fileSize / 1048576).toFixed(1)} MB`}</small>}</div>
            {selected.fileData ? <div className={styles.attachmentActions}>
              <button type="button" onClick={() => setPreviewAttachment(selected)}><Eye />Preview</button>
              <a href={selected.fileData} download={selected.fileName}><Download />Download</a>
            </div> : <span className={styles.fileUnavailable}>File unavailable</span>}
          </div>}
          <button className={styles.done} onClick={() => setSelected(null)}>Done</button>
        </section>
      </div>}

      {previewAttachment && <div className={styles.fileOverlay} onMouseDown={(event) => { if (event.target === event.currentTarget) setPreviewAttachment(null); }}>
        <section className={styles.fileModal} role="dialog" aria-modal="true" aria-labelledby="user-file-preview-title">
          <header><div><span>ATTACHMENT PREVIEW</span><h2 id="user-file-preview-title">{previewAttachment.fileName}</h2></div><button type="button" onClick={() => setPreviewAttachment(null)} aria-label="Close file preview"><X /></button></header>
          <div className={styles.fileViewer}>
            {previewAttachment.fileType?.startsWith('image/') && <img src={previewAttachment.fileData} alt={previewAttachment.fileName} />}
            {(previewAttachment.fileType === 'application/pdf' || previewAttachment.fileType?.startsWith('text/')) && <iframe src={previewAttachment.fileData} title={previewAttachment.fileName} />}
            {previewAttachment.fileType?.startsWith('audio/') && <audio src={previewAttachment.fileData} controls />}
            {previewAttachment.fileType?.startsWith('video/') && <video src={previewAttachment.fileData} controls />}
            {!previewAttachment.fileType?.startsWith('image/') && previewAttachment.fileType !== 'application/pdf' && !previewAttachment.fileType?.startsWith('text/') && !previewAttachment.fileType?.startsWith('audio/') && !previewAttachment.fileType?.startsWith('video/') && <div className={styles.unsupported}><Paperclip /><strong>This file cannot be previewed in the browser.</strong><p>Download it to open with a compatible application.</p></div>}
          </div>
          <footer><button type="button" onClick={() => setPreviewAttachment(null)}>Close</button><a href={previewAttachment.fileData} download={previewAttachment.fileName}><Download />Download file</a></footer>
        </section>
      </div>}
    </div>
  );
}
