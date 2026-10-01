import api from '../../../services/api';
import { API_ENDPOINTS } from '../../../services/endpoint';

const formRequest = { notifyOnError: false };

export const profileApi = {
  getProfile: () => api.get(API_ENDPOINTS.profile.me, formRequest).then(({ data }) => data),
  
  updateProfile: (payload) => api.patch(API_ENDPOINTS.profile.me, payload, formRequest).then(({ data }) => data),
  
  uploadAvatar: (file) => {
    const formData = new FormData();
    formData.append('avatar', file);
    return api.post(API_ENDPOINTS.profile.avatar, formData, {
      ...formRequest,
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    }).then(({ data }) => data);
  },
  
  deleteAvatar: () => api.delete(API_ENDPOINTS.profile.avatar, formRequest),
};
