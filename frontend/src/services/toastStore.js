// One in-memory notification survives route changes. Never persist messages.
let currentToast = null;
let sequence = 0;
const listeners = new Set();
const publish = () => listeners.forEach(listener => listener());

function show(message, type, options = {}) {
  if (typeof message !== 'string' || !message.trim()) return;
  currentToast = { ...options, id: ++sequence, message: message.trim(), type };
  publish();
  return currentToast.id;
}

export const toast = {
  show,
  error: message => show(message, 'error'),
  success: message => show(message, 'success'),
  info: message => show(message, 'info'),
  dismiss: id => {
    if (id !== undefined && currentToast?.id !== id) return;
    currentToast = null;
    publish();
  },
};

export const getToastSnapshot = () => currentToast;
export const subscribeToToasts = listener => {
  listeners.add(listener);
  return () => listeners.delete(listener);
};
