import api from '../../../services/api.js';
import { API_ENDPOINTS } from '../../../services/endpoint.js';

export const attemptMediaApi = {
  uploadAudio(file) {
    const body = new FormData();
    body.append('file', file, file.name || 'speaking-response.webm');
    return api.post(API_ENDPOINTS.attemptMedia.audio, body, {
      notifyOnError: false,
      timeout: 60_000,
      headers: { 'Content-Type': 'multipart/form-data' },
    }).then(response => response.data);
  },
};
