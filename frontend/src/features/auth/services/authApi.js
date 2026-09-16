import api from '../../../services/api';
import { API_ENDPOINTS } from '../../../services/endpoint';

// Forms display one toast for either local validation or an API error.
const formRequest = { notifyOnError: false };

export const authApi = {
  register: payload => api.post(API_ENDPOINTS.auth.register, payload, formRequest).then(({ data }) => data),
  login: payload => api.post(API_ENDPOINTS.auth.login, payload, formRequest).then(({ data }) => data),
  logout: () => api.post(API_ENDPOINTS.auth.logout),
  me: () => api.get(API_ENDPOINTS.auth.me, formRequest).then(({ data }) => data),
  requestPasswordOtp: email => api.post(API_ENDPOINTS.auth.requestPasswordOtp, { email }, formRequest).then(({ data }) => data),
  verifyPasswordOtp: (email, otp) => api.post(API_ENDPOINTS.auth.verifyPasswordOtp, { email, otp }, formRequest).then(({ data }) => data),
  resetPassword: payload => api.post(API_ENDPOINTS.auth.resetPassword, payload, formRequest),
  changePassword: payload => api.patch(API_ENDPOINTS.auth.changePassword, payload, formRequest),
};

export { getApiError } from '../../../services/apiError';
