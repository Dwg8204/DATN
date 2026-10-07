import { useEffect, useMemo, useRef, useState } from 'react';
import { Download, Eye, Paperclip, Search, Send, X } from 'lucide-react';
import { useToast } from '../../../context/ToastContext';
import Pagination from '../../../components/common/Pagination';
import AnswerSelect from '../../../components/common/AnswerSelect';
import WordDocumentPreview from '../../../components/common/WordDocumentPreview';
import SpreadsheetPreview from '../../../components/common/SpreadsheetPreview';
import PowerPointPreview from '../../../components/common/PowerPointPreview';
import { isPreviewablePowerPoint, isPreviewableSpreadsheet, isPreviewableWordDocument } from '../../../utils/attachmentPreview';
import { adminUsersApi } from '../users/services/adminUsersApi';
import { adminNotificationsApi } from './services/adminNotificationsApi';
import styles from './NotificationPage.module.css';
import useUrlQueryState, { queryParam } from '../../../hooks/useUrlQueryState';

const MAX_ATTACHMENT_SIZE = 2 * 1024 * 1024;
const NOTIFICATION_QUERY_SCHEMA = {
  page: queryParam.positiveInt(1),
  pageSize: { ...queryParam.positiveInt(8, 100), param: 'size' },
  search: { ...queryParam.string(''), param: 'q' },
};

const formatDate = (value) => new Intl.DateTimeFormat('en-US', {
  month: 'short', day: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit',
}).format(new Date(value));

const toLocalDateTimeMinute = (date = new Date()) => {
  const localDate = new Date(date.getTime() - date.getTimezoneOffset() * 60000);
  return localDate.toISOString().slice(0, 16);
};

const nextAvailableMinute = () => toLocalDateTimeMinute(new Date(Date.now() + 60000));

const emptyForm = () => ({
  target: 'Everyone', type: 'Push notification', deliveryMode: 'now', date: nextAvailableMinute(), content: '',
  subject: '',
  fileName: '', fileType: '', fileSize: 0, fileData: '', filePublicId: '',
});

const formatFileSize = (bytes = 0) => bytes < 1024 ? `${bytes} B` : bytes < 1024 * 1024 ? `${(bytes / 1024).toFixed(1)} KB` : `${(bytes / (1024 * 1024)).toFixed(1)} MB`;

const mapAdminNotification = (row) => {
  const attachment = row?.attachment && typeof row.attachment === 'object' ? row.attachment : {};
  const recipientEmails = Array.isArray(row?.recipient_emails) ? row.recipient_emails : [];
  const fallbackTarget = row?.audience_type === 'ALL' ? 'Everyone' : row?.audience_type === 'ROLE' ? 'Role' : 'Selected users';
  return {
    id: row.id,
    date: row.scheduled_at || row.sent_at || row.created_at,
    createdAt: row.created_at,
    content: row.content || '',
    subject: row.channel === 'EMAIL' ? row.title || '' : '',
    target: recipientEmails.length === 1 ? recipientEmails[0] : recipientEmails.length > 1 ? recipientEmails.join(', ') : fallbackTarget,
    recipientEmails,
    recipientCount: Number(row.recipient_count) || recipientEmails.length,
    type: row.channel === 'EMAIL' ? 'Email' : 'Push notification',
    status: row.status || 'DRAFT',
    fileName: attachment.name || '',
    fileType: attachment.mimeType || '',
    fileSize: Number(attachment.size) || 0,
    fileData: attachment.url || '',
  };
};

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
  const { showError, showSuccess, dismissToast } = useToast();
  const [form, setForm] = useState(emptyForm);
  const [notifications, setNotifications] = useState([]);
  const [urlState, setUrlState] = useUrlQueryState(NOTIFICATION_QUERY_SCHEMA);
  const { page, pageSize, search } = urlState;
  const [totalItems, setTotalItems] = useState(0);
  const [loadingHistory, setLoadingHistory] = useState(true);
  const [historyError, setHistoryError] = useState('');
  const [historyVersion, setHistoryVersion] = useState(0);
  const setPage = next => setUrlState(current => ({ page: typeof next === 'function' ? next(current.page) : next }));
  const setPageSize = next => setUrlState(current => ({ pageSize: typeof next === 'function' ? next(current.pageSize) : next, page: 1 }));
  const [preview, setPreview] = useState(false);
  const [selectedNotification, setSelectedNotification] = useState(null);
  const [previewAttachment, setPreviewAttachment] = useState(null);
  const [readingFile, setReadingFile] = useState(false);
  const [userList, setUserList] = useState([]);
  const [loadingUsers, setLoadingUsers] = useState(true);
  const [userLoadError, setUserLoadError] = useState('');
  const [emailSearch, setEmailSearch] = useState('');
  const [selectedUserIds, setSelectedUserIds] = useState([]);
  const [sending, setSending] = useState(false);
  const fileRef = useRef(null);
  useEffect(() => {
    let isMounted = true;
    let requestId = 0;
    const controller = new AbortController();
    setLoadingHistory(true);
    setHistoryError('');
    const loadHistory = () => {
      const currentRequest = ++requestId;
      return adminNotificationsApi.list({ page, pageSize, search, signal: controller.signal })
      .then((result) => {
        if (!isMounted || currentRequest !== requestId) return;
        const rows = result?.data || [];
        const total = Number(result?.pagination?.totalItems ?? rows.length);
        setNotifications(rows.map(mapAdminNotification));
        setTotalItems(total);
        setHistoryError('');
        const lastPage = Math.max(1, Math.ceil(total / pageSize));
        if (page > lastPage) setUrlState({ page: lastPage });
      })
      .catch(() => {
        if (isMounted && currentRequest === requestId) setHistoryError('Unable to load notification history. Please try again.');
      })
      .finally(() => {
        if (isMounted && currentRequest === requestId) setLoadingHistory(false);
      });
    };
    const debounce = window.setTimeout(loadHistory, search ? 250 : 0);
    const timer = window.setInterval(loadHistory, 10_000);
    return () => {
      isMounted = false;
      controller.abort();
      window.clearTimeout(debounce);
      window.clearInterval(timer);
    };
  }, [page, pageSize, search, historyVersion, setUrlState]);

  useEffect(() => {
    let isMounted = true;
    const loadUsers = () => {
      setLoadingUsers(true);
      adminUsersApi.list({ status: 'ACTIVE', pageSize: 100 })
        .then((result) => {
          if (isMounted) {
            setUserList(Array.isArray(result?.data) ? result.data : []);
            setUserLoadError('');
          }
        })
        .catch(() => {
          if (isMounted) {
            setUserList([]);
            setUserLoadError('Unable to load active users. Please refresh and try again.');
          }
        })
        .finally(() => { if (isMounted) setLoadingUsers(false); });
    };
    const refreshWhenVisible = () => { if (document.visibilityState === 'visible') loadUsers(); };
    loadUsers();
    window.addEventListener('focus', loadUsers);
    document.addEventListener('visibilitychange', refreshWhenVisible);
    return () => {
      isMounted = false;
      window.removeEventListener('focus', loadUsers);
      document.removeEventListener('visibilitychange', refreshWhenVisible);
    };
  }, []);

  const audienceUsers = useMemo(() => {
    if (form.target === 'Everyone') return userList;
    return userList.filter((user) => user.role === form.target.toUpperCase());
  }, [form.target, userList]);

  const filteredUsers = useMemo(() => {
    if (!emailSearch.trim()) return audienceUsers;
    const term = emailSearch.toLowerCase();
    return audienceUsers.filter(
      (u) => u.fullName?.toLowerCase().includes(term) || u.email?.toLowerCase().includes(term)
    );
  }, [audienceUsers, emailSearch]);
  const selectedRecipients = useMemo(
    () => audienceUsers.filter(user => selectedUserIds.includes(user.id)),
    [audienceUsers, selectedUserIds],
  );
  const selectedRecipientLabel = useMemo(() => {
    if (selectedRecipients.length === 0) return 'No recipients selected';
    if (selectedRecipients.length === 1) return selectedRecipients[0].email;
    return selectedRecipients.map(user => user.email).join(', ');
  }, [selectedRecipients]);

  const update = (field, value) => setForm((current) => ({ ...current, [field]: value }));
  const validate = () => {
    if (readingFile) return 'Please wait for the attachment to finish loading.';
    if (loadingUsers) return 'Please wait while the recipient list is loading.';
    if (userLoadError) return userLoadError;
    if (audienceUsers.length === 0) return 'No active users match the selected audience.';
    if (selectedRecipients.length === 0) return `Please select at least one ${form.type.toLowerCase()} recipient.`;
    if (form.type === 'Email' && !form.subject.trim()) return 'Please enter an email subject.';
    if (!form.content.trim()) return 'Please enter notification content.';
    if (form.deliveryMode === 'scheduled') {
      if (!form.date) return 'Please select a delivery date and time.';
      const deliveryTime = new Date(form.date).getTime();
      if (!Number.isFinite(deliveryTime)) return 'Please select a valid delivery date and time.';
      if (deliveryTime <= Date.now()) return 'Scheduled notifications must be set for a future time.';
    }
    return '';
  };
  const selectFile = async (file) => {
    if (!file) {
      setForm((current) => ({ ...current, fileName: '', fileType: '', fileSize: 0, fileData: '', filePublicId: '' }));
      return;
    }
    if (file.size > MAX_ATTACHMENT_SIZE) {
      showError('Attachment must be 2 MB or smaller.');
      if (fileRef.current) fileRef.current.value = '';
      return;
    }
    setReadingFile(true);
    dismissToast();
    try {
      const uploaded = await adminNotificationsApi.uploadAttachment(file);
      setForm((current) => ({ ...current, fileName: uploaded.name, fileType: uploaded.mimeType,
        fileSize: uploaded.size, fileData: uploaded.url, filePublicId: uploaded.publicId }));
    } catch (error) {
      showError(error.response?.data?.error?.message || 'The selected file could not be uploaded. Please choose another file.');
      setForm((current) => ({ ...current, fileName: '', fileType: '', fileSize: 0, fileData: '', filePublicId: '' }));
    } finally {
      setReadingFile(false);
      if (fileRef.current) fileRef.current.value = '';
    }
  };
  const showPreview = () => {
    const message = validate();
    if (message) { showError(message); return; }
    dismissToast();
    setPreview(true);
  };
  const sendNotification = async () => {
    const message = validate();
    if (message) { showError(message); return; }
    setSending(true);
    dismissToast();
    try {
      await adminNotificationsApi.create({
        title: form.type === 'Email' ? form.subject.trim() : form.content.trim().slice(0, 80),
        content: form.content.trim(),
        type: 'SYSTEM',
        channel: form.type === 'Email' ? 'EMAIL' : 'IN_APP',
        audienceType: 'SELECTED_USERS',
        targetUserIds: selectedRecipients.map(user => user.id),
        ...(form.deliveryMode === 'scheduled' ? { scheduledAt: new Date(form.date).toISOString() } : {}),
        ...(form.fileData ? { attachment: { name: form.fileName, mimeType: form.fileType,
          size: form.fileSize, url: form.fileData, publicId: form.filePublicId } } : {}),
      });
      setHistoryVersion(current => current + 1);
    } catch (error) {
      showError(error.response?.data?.error?.message || 'The notification could not be sent. Please try again.');
      setSending(false);
      return;
    }
    setForm(emptyForm());
    setSelectedUserIds([]);
    setEmailSearch('');
    setPage(1);
    setPreview(false);
    showSuccess(form.deliveryMode === 'now' ? 'Notification sent successfully.' : 'Notification scheduled successfully.');
    setSending(false);
    if (fileRef.current) fileRef.current.value = '';
  };

  const getTargetClass = (targetStr) => {
    const lower = (targetStr || '').toLowerCase();
    if (lower === 'student') return styles.student;
    if (lower === 'teacher') return styles.teacher;
    if (lower === 'everyone') return styles.everyone;
    return styles.specificEmail;
  };

  const targetOptions = ['Everyone', 'Student', 'Teacher'];

  return (
    <div className={styles.page}>
      <section className={styles.workspace}>
        <form className={styles.composer} noValidate onSubmit={(event) => { event.preventDefault(); sendNotification(); }}>
          <header><h3>Create a new notification</h3><p>Choose an audience and delivery method.</p></header>

          <label className={styles.field}>Target
            <AnswerSelect
              value={form.target}
              onChange={(event) => { update('target', event.target.value); setEmailSearch(''); setSelectedUserIds([]); dismissToast(); }}
              options={targetOptions}
              ariaLabel="Target audience"
            />
          </label>

          <fieldset className={styles.types}>
            <legend>Notification type</legend>
            {['Push notification', 'Email'].map((type) => (
              <label key={type}>
                <input
                  type="radio"
                  name="notificationType"
                  checked={form.type === type}
                  onChange={() => {
                    update('type', type);
                    setEmailSearch('');
                    setSelectedUserIds([]);
                  }}
                />
                <span>{type}</span>
              </label>
            ))}
          </fieldset>

          <div className={styles.userEmailSection}>
              <div className={styles.userEmailHeader}>
                <label>{form.type} recipients</label>
                <span className={styles.userEmailBadgeCount}>{selectedRecipients.length}/{audienceUsers.length} selected</span>
              </div>

              <label className={styles.selectAllRecipients}>
                <input type="checkbox" checked={audienceUsers.length > 0 && selectedRecipients.length === audienceUsers.length}
                  onChange={(event) => setSelectedUserIds(event.target.checked ? audienceUsers.map(user => user.id) : [])} />
                <span>Select all {form.target.toLowerCase()} recipients</span>
              </label>

              <div className={styles.emailSearchBox}>
                <Search className={styles.emailSearchIcon} />
                <input
                  type="text"
                  placeholder="Search recipient by name or email..."
                  value={emailSearch}
                  onChange={(e) => setEmailSearch(e.target.value)}
                />
              </div>

              <div className={styles.userEmailList}>
                {loadingUsers ? (
                  <div style={{ padding: '12px', textAlign: 'center', color: '#888', fontSize: '12px' }}>
                    Loading recipients…
                  </div>
                ) : filteredUsers.length > 0 ? (
                  filteredUsers.map((user) => {
                    const isSelected = selectedUserIds.includes(user.id);
                    const roleClass = user.role === 'ADMIN' ? styles.roleAdmin : user.role === 'TEACHER' ? styles.roleTeacher : styles.roleStudent;
                    return (
                      <label
                        key={user.id || user.email}
                        className={`${styles.userEmailItem} ${isSelected ? styles.userEmailItemActive : ''}`}
                      >
                        <input type="checkbox" checked={isSelected} onChange={(event) => setSelectedUserIds(current => event.target.checked
                          ? [...new Set([...current, user.id])]
                          : current.filter(id => id !== user.id))} />
                        <div className={styles.userEmailInfo}>
                          <span className={styles.userEmailName}>{user.fullName || 'User'}</span>
                          <span className={styles.userEmailAddr}>{user.email}</span>
                        </div>
                        <span className={`${styles.userEmailRoleTag} ${roleClass}`}>{user.role}</span>
                      </label>
                    );
                  })
                ) : (
                  <div style={{ padding: '12px', textAlign: 'center', color: '#888', fontSize: '12px' }}>
                    No matching recipients found
                  </div>
                )}
              </div>

              <div style={{ marginTop: '10px', fontSize: '12px', color: '#157347', fontWeight: 600 }}>
                {selectedRecipients.length} recipient{selectedRecipients.length === 1 ? '' : 's'} selected from the {form.target} audience.
              </div>
          </div>

          <fieldset className={styles.deliveryOptions}>
            <legend>Delivery time</legend>
            <div>
              <label className={form.deliveryMode === 'now' ? styles.selectedDelivery : ''}>
                <input type="radio" name="deliveryMode" checked={form.deliveryMode === 'now'} onChange={() => { update('deliveryMode', 'now'); dismissToast(); }} />
                <span><strong>Send immediately</strong><small>Deliver as soon as you confirm.</small></span>
              </label>
              <label className={form.deliveryMode === 'scheduled' ? styles.selectedDelivery : ''}>
                <input type="radio" name="deliveryMode" checked={form.deliveryMode === 'scheduled'} onChange={() => { setForm((current) => ({ ...current, deliveryMode: 'scheduled', date: new Date(current.date).getTime() > Date.now() ? current.date : nextAvailableMinute() })); dismissToast(); }} />
                <span><strong>Schedule for later</strong><small>Choose a future delivery time.</small></span>
              </label>
            </div>
          </fieldset>

          {form.deliveryMode === 'scheduled' && <label className={styles.field}>Scheduled date &amp; time
            <input type="datetime-local" min={nextAvailableMinute()} step="60" value={form.date} onChange={(event) => { update('date', event.target.value); dismissToast(); }} />
          </label>}

          {form.type === 'Email' && <label className={styles.field}>Email subject
            <input type="text" maxLength="255" value={form.subject} onChange={(event) => { update('subject', event.target.value); dismissToast(); }} placeholder="Enter the email subject" />
            <small>{form.subject.length}/255 characters</small>
          </label>}

          <label className={styles.field}>Content
            <textarea rows="7" maxLength="500" value={form.content} onChange={(event) => { update('content', event.target.value); dismissToast(); }} placeholder="Write the message here" />
            <small>{form.content.length}/500 characters</small>
          </label>

          <div className={styles.composerFooter}>
            <label className={styles.attachment}><Paperclip /><span>{readingFile ? 'Loading file…' : form.fileName || 'Attach files (max 2 MB)'}</span><input ref={fileRef} type="file" onChange={(event) => selectFile(event.target.files?.[0])} /></label>
            <div><button type="button" className={styles.previewButton} onClick={showPreview} disabled={sending}><Eye />Preview</button><button type="submit" className={styles.sendButton} disabled={sending}><Send />{sending ? (form.deliveryMode === 'now' ? 'Sending…' : 'Scheduling…') : (form.deliveryMode === 'now' ? 'Send' : 'Schedule')}</button></div>
          </div>
        </form>

        <section className={styles.history}>
          <header><div><h3>Notification history</h3><p aria-live="polite">{totalItems} {search.trim() ? 'matching messages' : 'messages'}</p></div></header>
          {historyError && <div className={styles.historyError} role="alert">{historyError}<button type="button" onClick={() => setHistoryVersion(current => current + 1)}>Retry</button></div>}
          <div className={styles.tableScroll}>
            <table aria-label="Notification history">
              <colgroup>
                <col className={styles.dateColumn} />
                <col />
                <col className={styles.targetColumn} />
                <col className={styles.typeColumn} />
                <col className={styles.statusColumn} />
                <col className={styles.actionsColumn} />
              </colgroup>
              <thead><tr><th scope="col">Date &amp; time</th><th scope="col">Content</th><th scope="col">Recipients</th><th scope="col">Type</th><th scope="col">Status</th><th scope="col"><span className={styles.visuallyHidden}>Actions</span></th></tr></thead>
              <tbody>{loadingHistory ? <tr><td colSpan={6} className={styles.historyEmpty}>Loading notifications…</td></tr>
                : !historyError && notifications.length === 0 ? <tr><td colSpan={6} className={styles.historyEmpty}>{search.trim() ? 'No notifications match your search.' : 'No notifications yet.'}</td></tr>
                : notifications.map((item) => <tr key={item.id}>
                <td>{formatDate(item.date)}</td>
                <td><span className={styles.contentPreview} title={item.content}>{item.content}</span></td>
                <td><div className={styles.recipientSummary} title={item.target}>
                  <span className={`${styles.target} ${getTargetClass(item.target)}`}>{item.recipientEmails[0] || item.target}</span>
                  {item.recipientEmails.length > 1 && <span className={styles.recipientCount}>+{item.recipientEmails.length - 1}</span>}
                </div></td>
                <td>{item.type}</td>
                <td><span className={styles.notificationStatus} data-status={item.status}>{item.status}</span></td>
                <td><button type="button" className={styles.viewButton} onClick={() => setSelectedNotification(item)} aria-label={`View notification sent on ${formatDate(item.date)}`} title="View details"><Eye /></button></td>
              </tr>)}</tbody>
            </table>
          </div>
          <div className={styles.historyPagination}>
            <Pagination page={page} totalItems={totalItems} pageSize={pageSize} onPageChange={setPage} onPageSizeChange={setPageSize} />
          </div>
        </section>
      </section>

      {preview && <div className={styles.backdrop} onMouseDown={() => setPreview(false)}><section className={styles.previewModal} role="dialog" aria-modal="true" onMouseDown={(event) => event.stopPropagation()}>
        <header><div><span>Notification preview</span><h3>{form.type}</h3></div><button onClick={() => setPreview(false)} aria-label="Close preview"><X /></button></header>
        <div className={styles.previewAudience}>To: <strong>{selectedRecipientLabel}</strong> · {form.deliveryMode === 'now' ? 'Send immediately' : formatDate(form.date)}</div>
        {form.type === 'Email' && <div className={styles.detailContent}><strong>Subject</strong><p>{form.subject}</p></div>}
        <p>{form.content}</p>
        <AttachmentLink notification={form} onPreview={setPreviewAttachment} />
        <footer><button onClick={() => setPreview(false)} disabled={sending}>Back to edit</button><button onClick={sendNotification} disabled={sending}><Send />{sending ? (form.deliveryMode === 'now' ? 'Sending…' : 'Scheduling…') : (form.deliveryMode === 'now' ? 'Confirm & send' : 'Confirm schedule')}</button></footer>
      </section></div>}

      {selectedNotification && <div className={styles.backdrop} onMouseDown={() => setSelectedNotification(null)}><section className={styles.previewModal} role="dialog" aria-modal="true" aria-labelledby="notification-detail-title" onMouseDown={(event) => event.stopPropagation()}>
        <header><div><span>Notification details</span><h3 id="notification-detail-title">{selectedNotification.type}</h3></div><button type="button" onClick={() => setSelectedNotification(null)} aria-label="Close notification details"><X /></button></header>
        <dl className={styles.detailMeta}>
          <div><dt>Target</dt><dd><span className={`${styles.target} ${getTargetClass(selectedNotification.target)}`}>{selectedNotification.target}</span></dd></div>
          <div><dt>Date &amp; time</dt><dd>{formatDate(selectedNotification.date)}</dd></div>
          <div><dt>Status</dt><dd>{selectedNotification.status}</dd></div>
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
            {isPreviewableWordDocument(previewAttachment.fileType, previewAttachment.fileName) && <WordDocumentPreview key={previewAttachment.fileData} source={previewAttachment.fileData} fileName={previewAttachment.fileName} />}
            {isPreviewableSpreadsheet(previewAttachment.fileType, previewAttachment.fileName) && <SpreadsheetPreview key={previewAttachment.fileData} source={previewAttachment.fileData} fileName={previewAttachment.fileName} />}
            {isPreviewablePowerPoint(previewAttachment.fileType, previewAttachment.fileName) && <PowerPointPreview key={previewAttachment.fileData} source={previewAttachment.fileData} fileName={previewAttachment.fileName} />}
            {previewAttachment.fileType?.startsWith('image/') && <img src={previewAttachment.fileData} alt={previewAttachment.fileName} />}
            {previewAttachment.fileType === 'application/pdf' && <iframe src={previewAttachment.fileData} title={previewAttachment.fileName} />}
            {previewAttachment.fileType?.startsWith('text/') && <iframe src={previewAttachment.fileData} title={previewAttachment.fileName} />}
            {previewAttachment.fileType?.startsWith('audio/') && <audio src={previewAttachment.fileData} controls />}
            {previewAttachment.fileType?.startsWith('video/') && <video src={previewAttachment.fileData} controls />}
            {!isPreviewableWordDocument(previewAttachment.fileType, previewAttachment.fileName) && !isPreviewableSpreadsheet(previewAttachment.fileType, previewAttachment.fileName) && !isPreviewablePowerPoint(previewAttachment.fileType, previewAttachment.fileName) && !previewAttachment.fileType?.startsWith('image/') && previewAttachment.fileType !== 'application/pdf' && !previewAttachment.fileType?.startsWith('text/') && !previewAttachment.fileType?.startsWith('audio/') && !previewAttachment.fileType?.startsWith('video/') && <div className={styles.unsupportedPreview}><Paperclip /><strong>Preview is not available for this file type.</strong><span>You can download the file and open it with a compatible application.</span></div>}
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
