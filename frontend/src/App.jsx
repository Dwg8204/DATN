import { RouterProvider } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { appRouter } from './routes';
import { ToastProvider } from './context/ToastContext';
import { ThemeProvider } from './context/ThemeContext';

export default function App() {
  return (
    <ThemeProvider>
      <ToastProvider>
        <AuthProvider>
          <RouterProvider router={appRouter} />
        </AuthProvider>
      </ToastProvider>
    </ThemeProvider>
  );
}
