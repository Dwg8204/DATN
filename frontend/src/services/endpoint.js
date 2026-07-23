export const API_ENDPOINTS = {
  auth: {
    login: '/auth/login',
    me: '/auth/me',
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
