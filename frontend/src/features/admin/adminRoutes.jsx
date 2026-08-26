import { lazy, Suspense } from 'react';
import { Navigate } from 'react-router-dom';
import AdminLayout from './layout/AdminLayout';
import AdminPlaceholderPage from './components/AdminPlaceholderPage';

const AdminDashboardPage = lazy(() => import('./dashboard/AdminDashboardPage'));
const TestManagerPage = lazy(() => import('./tests/TestManagerPage'));
const WritingBuilderLayout = lazy(() => import('./writing/components/WritingBuilderLayout'));
const WritingPartEditorPage = lazy(() => import('./writing/WritingPartEditorPage'));
const WritingTestDetailsPage = lazy(() => import('./writing/WritingTestDetailsPage'));
const WritingTestPreviewPage = lazy(() => import('./writing/WritingTestPreviewPage'));
const load = (element) => <Suspense fallback={<div style={{ padding: 24 }}>Loading...</div>}>{element}</Suspense>;

export const adminRoutes = [
  {
    path: '/admin',
    element: <AdminLayout />,
    children: [
      { index: true, element: <Navigate to="dashboard" replace /> },
      { path: 'dashboard', element: load(<AdminDashboardPage />) },
      { path: 'tests', element: load(<TestManagerPage />) },
      { path: 'tests/writing/:testId/preview', element: load(<WritingTestPreviewPage />) },
      { path: 'users', element: <AdminPlaceholderPage title="User Management" /> },
      { path: 'feedback', element: <AdminPlaceholderPage title="Feedback" /> },
      { path: 'notifications', element: <AdminPlaceholderPage title="Notification" /> },
      {
        path: 'tests/new/writing',
        element: load(<WritingBuilderLayout />),
        children: [
          { index: true, element: load(<WritingTestDetailsPage />) },
          { path: 'part/:partNumber', element: load(<WritingPartEditorPage />) },
        ],
      },
      {
        path: 'tests/writing/:testId/edit',
        element: load(<WritingBuilderLayout />),
        children: [
          { index: true, element: load(<WritingTestDetailsPage />) },
          { path: 'part/:partNumber', element: load(<WritingPartEditorPage />) },
        ],
      },
    ],
  },
];
