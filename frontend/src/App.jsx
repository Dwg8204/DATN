import { RouterProvider } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { appRouter } from './routes';

export default function App() {
  return (
    <AuthProvider>
      <RouterProvider router={appRouter} />
    </AuthProvider>
  );
}
