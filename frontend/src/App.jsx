import { RouterProvider } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { appRouter } from './routes';
import { ToastProvider } from './context/ToastContext';

export default function App() {
  return (
    <ToastProvider>
      <AuthProvider>
        <RouterProvider router={appRouter} />
      </AuthProvider>
    </ToastProvider>
  );
}
