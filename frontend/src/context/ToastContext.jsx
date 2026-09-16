import { createContext, useContext, useSyncExternalStore } from 'react';
import { ToastViewport } from '../components/common/ToastNotification';
import { getToastSnapshot, subscribeToToasts, toast } from '../services/toastStore';

const actions = {
  showError: toast.error,
  showSuccess: toast.success,
  showInfo: toast.info,
  dismissToast: toast.dismiss,
};
const ToastContext = createContext(actions);

export function ToastProvider({ children }) {
  const notification = useSyncExternalStore(subscribeToToasts, getToastSnapshot, () => null);
  return (
    <ToastContext.Provider value={actions}>
      {children}
      {notification && <ToastViewport
        key={notification.id}
        message={notification.message}
        type={notification.type}
        duration={notification.duration ?? (notification.type === 'error' ? 7000 : 4500)}
        onClose={() => {
          toast.dismiss(notification.id);
          notification.onClose?.();
        }}
      />}
    </ToastContext.Provider>
  );
}

export const useToast = () => useContext(ToastContext);
