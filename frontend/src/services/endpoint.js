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
  adminGrammarTests: {
    list: '/admin/grammar-tests',
    detail: (id) => `/admin/grammar-tests/${id}`,
    publish: (id) => `/admin/grammar-tests/${id}/publish`,
  },
  adminWritingTests: {
    list: '/admin/writing-tests',
    detail: (id) => `/admin/writing-tests/${id}`,
    publish: (id) => `/admin/writing-tests/${id}/publish`,
  },
  grammarTests: {
    list: '/grammar-tests',
    detail: (id) => `/grammar-tests/${id}`,
  },
  writingTests: {
    list: '/writing-tests',
    detail: (id) => `/writing-tests/${id}`,
  },
  adminMedia: {
    testCovers: '/admin/media/test-covers',
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
