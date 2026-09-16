export const API_ENDPOINTS = {
  auth: {
    login: '/auth/login',
    register: '/auth/register',
    refresh: '/auth/refresh',
    logout: '/auth/logout',
    me: '/auth/me',
    requestPasswordOtp: '/auth/forgot-password/request-otp',
    verifyPasswordOtp: '/auth/forgot-password/verify-otp',
    resetPassword: '/auth/forgot-password/reset',
    changePassword: '/auth/change-password',
  },
  adminUsers: {
    list: '/admin/users',
    detail: (id) => `/admin/users/${id}`,
    role: (id) => `/admin/users/${id}/role`,
  },
  practiceExam: {
    list: '/practice-exams',
    detail: (id) => `/practice-exams/${id}`,
  },
  writingTest: {
    submit: '/writing-tests/submit',
  },
  chatbot: {
    messages: '/chatbot/messages',
  },
};
