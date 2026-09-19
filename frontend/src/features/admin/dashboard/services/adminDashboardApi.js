import api from '../../../../services/api';
import { API_ENDPOINTS } from '../../../../services/endpoint';

export const adminDashboardApi = {
  get: (period, signal) => api.get(API_ENDPOINTS.adminDashboard, {
    params: { period },
    signal,
  }).then(({ data }) => data),
};
