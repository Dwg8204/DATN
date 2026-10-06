import api from '../../../services/api.js';
import { API_ENDPOINTS } from '../../../services/endpoint.js';

const silentRequest = { notifyOnError: false };

export function mapUserNotification(row) {
  const attachment = row?.attachment && typeof row.attachment === 'object' ? row.attachment : {};
  return {
    id: String(row.recipient_id),
    notificationId: String(row.notification_id),
    title: row.title || '',
    content: row.content || '',
    type: row.channel === 'EMAIL' ? 'Email' : 'Push notification',
    target: 'You',
    date: row.delivered_at || row.created_at,
    readAt: row.read_at || null,
    fileName: attachment.name || '',
    fileType: attachment.mimeType || '',
    fileSize: Number(attachment.size) || 0,
    fileData: attachment.url || '',
  };
}

export const userNotificationsApi = {
  list: ({ unreadOnly, page = 1, pageSize = 100 } = {}) => api.get(API_ENDPOINTS.notifications.list, {
    ...silentRequest,
    params: { unreadOnly, page, pageSize },
  }).then(({ data }) => ({
    items: (data?.data || []).map(mapUserNotification),
    pagination: data?.pagination,
  })),
  unreadCount: () => api.get(API_ENDPOINTS.notifications.unreadCount, silentRequest)
    .then(({ data }) => Number(data?.unreadCount) || 0),
  markRead: id => api.patch(API_ENDPOINTS.notifications.read(id), undefined, silentRequest),
  markAllRead: () => api.patch(API_ENDPOINTS.notifications.readAll, undefined, silentRequest),
  dismiss: id => api.delete(API_ENDPOINTS.notifications.dismiss(id), silentRequest),
};
