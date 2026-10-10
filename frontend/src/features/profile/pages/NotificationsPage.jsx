import { useEffect, useMemo, useState } from 'react';
import { Bell, BellRing, CheckCheck, Clock3, Download, Eye, Mail, Paperclip, Trash2, X } from 'lucide-react';
import { useLocation } from 'react-router-dom';
import ProfileSidebar from '../components/ProfileSidebar';
import { formatNotificationDate } from '../../../utils/notificationStorage';
import { mapUserNotification, userNotificationsApi } from '../services/userNotificationsApi';
import { subscribeToRealtimeNotifications } from '../services/notificationSocket';
import WordDocumentPreview from '../../../components/common/WordDocumentPreview';
import SpreadsheetPreview from '../../../components/common/SpreadsheetPreview';
import PowerPointPreview from '../../../components/common/PowerPointPreview';
import { isPreviewablePowerPoint, isPreviewableSpreadsheet, isPreviewableWordDocument } from '../../../utils/attachmentPreview';
import styles from './NotificationsPage.module.css';
import useUrlQueryState, { queryParam } from '../../../hooks/useUrlQueryState';
import { useTranslation } from 'react-i18next';

const NOTIFICATION_QUERY_SCHEMA = { filter: queryParam.enum(['all', 'unread'], 'all') };
const notificationContent = (item, t) => t(`notifications.default${String(item.id).charAt(0).toUpperCase()}${String(item.id).slice(1)}`, { defaultValue: item.content });

export default function NotificationsPage() {
  const { t, i18n } = useTranslation();
  const location = useLocation();
  const [urlState, setUrlState] = useUrlQueryState(NOTIFICATION_QUERY_SCHEMA);
  const { filter } = urlState;
  const setFilter = value => setUrlState({ filter: value });
  const [notifications, setNotifications] = useState([]);
  const [selected, setSelected] = useState(null);
  const [previewAttachment, setPreviewAttachment] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    userNotificationsApi.list().then(({ items }) => {
      if (!active) return;
      setNotifications(items);
      const requestedId = location.state?.notificationId;
      if (requestedId) setSelected(items.find(item => item.id === String(requestedId)) || null);
    }).catch(() => undefined).finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [location.state?.notificationId]);

  useEffect(() => subscribeToRealtimeNotifications(payload => {
    const item = mapUserNotification(payload);
    setNotifications(current => [item, ...current.filter(notification => notification.id !== item.id)]);
  }), []);

  const available = useMemo(() => notifications, [notifications]);
  const visible = filter === 'unread'
    ? available.filter((item) => !item.readAt)
    : available;
  const unreadCount = available.filter((item) => !item.readAt).length;

  const markRead = async (id) => {
    const item = notifications.find(notification => notification.id === String(id));
    if (!item || item.readAt) return;
    await userNotificationsApi.markRead(id);
    setNotifications(current => current.map(notification => notification.id === String(id)
      ? { ...notification, readAt: new Date().toISOString() }
      : notification));
  };
  const openDetail = (item) => {
    setSelected({ ...item, readAt: item.readAt || new Date().toISOString() });
    markRead(item.id).catch(() => undefined);
  };
  const remove = async (item) => {
    await userNotificationsApi.dismiss(item.id);
    setNotifications(current => current.filter(notification => notification.id !== item.id));
    if (selected?.id === item.id) setSelected(null);
  };
  const markAllRead = async () => {
    await userNotificationsApi.markAllRead();
    const readAt = new Date().toISOString();
    setNotifications(current => current.map(item => ({ ...item, readAt: item.readAt || readAt })));
  };

  return (
    <div className={styles.page}>
      <div className={styles.container}>
        <ProfileSidebar activeTab="notifications" />
        <main className={styles.content}>
          <header className={styles.header}>
            <div><span>{t('notifications.accountCentre')}</span><h1>{t('notifications.title')}</h1><p>{t('notifications.description')}</p></div>
            <button className={styles.markAll} onClick={markAllRead} disabled={!unreadCount}><CheckCheck size={18} /> {t('notifications.markAllRead')}</button>
          </header>

          <div className={styles.filters}>
            <button className={filter === 'all' ? styles.active : ''} onClick={() => setFilter('all')}>{t('notifications.all')} <span>{available.length}</span></button>
            <button className={filter === 'unread' ? styles.active : ''} onClick={() => setFilter('unread')}>{t('notifications.unread')} <span>{unreadCount}</span></button>
          </div>

          <section className={styles.list} aria-label={t('notifications.title')}>
            {visible.length ? visible.map((item) => {
              const unread = !item.readAt;
              return (
                <article className={`${styles.item} ${unread ? styles.unread : ''}`} key={item.id} onClick={() => openDetail(item)}>
                  <div className={styles.icon}>{item.type === 'Email' ? <Mail /> : <Bell />}</div>
                  <div className={styles.itemBody}>
                    <div className={styles.itemTop}><strong>{t(item.type === 'Email' ? 'notifications.email' : 'notifications.learning')}</strong>{unread && <i />}</div>
                    <p>{notificationContent(item, t)}</p>
                    <time><Clock3 size={13} />{formatNotificationDate(item.date, i18n.language === 'vi' ? 'vi-VN' : 'en-GB')}</time>
                  </div>
                  <button className={styles.delete} onClick={(event) => { event.stopPropagation(); remove(item).catch(() => undefined); }} title={t('notifications.remove')}><Trash2 size={17} /></button>
                </article>
              );
            }) : !loading && <div className={styles.empty}><BellRing /><h2>{t('notifications.caughtUp')}</h2><p>{t(filter === 'unread' ? 'notifications.emptyUnread' : 'notifications.empty')}</p></div>}
          </section>
        </main>
      </div>

      {selected && <div className={styles.overlay} role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) setSelected(null); }}>
        <section className={styles.detail} role="dialog" aria-modal="true" aria-labelledby="notification-detail-title">
          <button className={styles.close} onClick={() => setSelected(null)} aria-label={t('dictionary.close')}><X /></button>
          <div className={styles.detailIcon}>{selected.type === 'Email' ? <Mail /> : <Bell />}</div>
          <span className={styles.detailEyebrow}>{t('notifications.detail')}</span>
          <h2 id="notification-detail-title">{t(selected.type === 'Email' ? 'notifications.email' : 'notifications.learning')}</h2>
          <p className={styles.fullMessage}>{notificationContent(selected, t)}</p>
          <dl><div><dt>{t('notifications.dateTime')}</dt><dd>{formatNotificationDate(selected.date, i18n.language === 'vi' ? 'vi-VN' : 'en-GB')}</dd></div><div><dt>{t('notifications.type')}</dt><dd>{t(`notifications.types.${selected.type}`, { defaultValue: selected.type })}</dd></div><div><dt>{t('notifications.sentTo')}</dt><dd>{t(`notifications.targets.${selected.target}`, { defaultValue: selected.target })}</dd></div></dl>
          {selected.fileName && <div className={styles.attachment}>
            <Paperclip />
            <div><strong>{selected.fileName}</strong>{selected.fileSize > 0 && <small>{selected.fileSize < 1048576 ? `${(selected.fileSize / 1024).toFixed(1)} KB` : `${(selected.fileSize / 1048576).toFixed(1)} MB`}</small>}</div>
            {selected.fileData ? <div className={styles.attachmentActions}>
              <button type="button" onClick={() => setPreviewAttachment(selected)}><Eye />{t('notifications.preview')}</button>
              <a href={selected.fileData} download={selected.fileName}><Download />{t('notifications.download')}</a>
            </div> : <span className={styles.fileUnavailable}>{t('notifications.unavailable')}</span>}
          </div>}
          <button className={styles.done} onClick={() => setSelected(null)}>{t('notifications.done')}</button>
        </section>
      </div>}

      {previewAttachment && <div className={styles.fileOverlay} onMouseDown={(event) => { if (event.target === event.currentTarget) setPreviewAttachment(null); }}>
        <section className={styles.fileModal} role="dialog" aria-modal="true" aria-labelledby="user-file-preview-title">
          <header><div><span>{t('notifications.attachmentPreview')}</span><h2 id="user-file-preview-title">{previewAttachment.fileName}</h2></div><button type="button" onClick={() => setPreviewAttachment(null)} aria-label={t('notifications.closePreview')}><X /></button></header>
          <div className={styles.fileViewer}>
            {isPreviewableWordDocument(previewAttachment.fileType, previewAttachment.fileName) && <WordDocumentPreview key={previewAttachment.fileData} source={previewAttachment.fileData} fileName={previewAttachment.fileName} />}
            {isPreviewableSpreadsheet(previewAttachment.fileType, previewAttachment.fileName) && <SpreadsheetPreview key={previewAttachment.fileData} source={previewAttachment.fileData} fileName={previewAttachment.fileName} />}
            {isPreviewablePowerPoint(previewAttachment.fileType, previewAttachment.fileName) && <PowerPointPreview key={previewAttachment.fileData} source={previewAttachment.fileData} fileName={previewAttachment.fileName} />}
            {previewAttachment.fileType?.startsWith('image/') && <img src={previewAttachment.fileData} alt={previewAttachment.fileName} />}
            {(previewAttachment.fileType === 'application/pdf' || previewAttachment.fileType?.startsWith('text/')) && <iframe src={previewAttachment.fileData} title={previewAttachment.fileName} />}
            {previewAttachment.fileType?.startsWith('audio/') && <audio src={previewAttachment.fileData} controls />}
            {previewAttachment.fileType?.startsWith('video/') && <video src={previewAttachment.fileData} controls />}
            {!isPreviewableWordDocument(previewAttachment.fileType, previewAttachment.fileName) && !isPreviewableSpreadsheet(previewAttachment.fileType, previewAttachment.fileName) && !isPreviewablePowerPoint(previewAttachment.fileType, previewAttachment.fileName) && !previewAttachment.fileType?.startsWith('image/') && previewAttachment.fileType !== 'application/pdf' && !previewAttachment.fileType?.startsWith('text/') && !previewAttachment.fileType?.startsWith('audio/') && !previewAttachment.fileType?.startsWith('video/') && <div className={styles.unsupported}><Paperclip /><strong>{t('notifications.unsupported')}</strong><p>{t('notifications.unsupportedHint')}</p></div>}
          </div>
          <footer><button type="button" onClick={() => setPreviewAttachment(null)}>{t('dictionary.close')}</button><a href={previewAttachment.fileData} download={previewAttachment.fileName}><Download />{t('notifications.downloadFile')}</a></footer>
        </section>
      </div>}
    </div>
  );
}
