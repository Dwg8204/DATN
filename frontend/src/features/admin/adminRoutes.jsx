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
const GrammarBuilderLayout = lazy(() => import('./grammar/components/GrammarBuilderLayout'));
const GrammarTestDetailsPage = lazy(() => import('./grammar/GrammarTestDetailsPage'));
const GrammarPartEditorPage = lazy(() => import('./grammar/GrammarPartEditorPage'));
const GrammarTestPreviewPage = lazy(() => import('./grammar/GrammarTestPreviewPage'));
const ReadingBuilderLayout = lazy(() => import('./reading/context/ReadingBuilderContext'));
const ReadingTestDetailsPage = lazy(() => import('./reading/ReadingTestDetailsPage'));
const ReadingPartEditorPage = lazy(() => import('./reading/ReadingPartEditorPage'));
const ReadingTestPreviewPage = lazy(() => import('./reading/ReadingTestPreviewPage'));
const load = (element) => <Suspense fallback={<div style={{ padding: 24 }}>Loading...</div>}>{element}</Suspense>;

export const adminRoutes = [
  {
    path: '/admin',
    element: <AdminLayout />,
    children: [
      { index: true, element: <Navigate to="dashboard" replace /> },
      { path: 'dashboard', element: load(<AdminDashboardPage />) },
      { path: 'tests', element: load(<TestManagerPage />) },
      { path: 'tests/reading/:testId/preview', element: load(<ReadingTestPreviewPage />) },
      ...['tests/new/reading', 'tests/reading/:testId/edit'].map(path => ({ path, element: load(<ReadingBuilderLayout />), children: [
        { index: true, element: load(<ReadingTestDetailsPage />) },
        { path: 'part/:partNumber', element: load(<ReadingPartEditorPage />) },
      ] })),
      { path: 'tests/writing/:testId/preview', element: load(<WritingTestPreviewPage />) },
      { path: 'tests/grammar/:testId/preview', element: load(<GrammarTestPreviewPage />) },
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
      {
        path: 'tests/new/grammar',
        element: load(<GrammarBuilderLayout />),
        children: [
          { index: true, element: load(<GrammarTestDetailsPage />) },
          { path: 'part/:partNumber', element: load(<GrammarPartEditorPage />) },
        ],
      },
      {
        path: 'tests/grammar/:testId/edit',
        element: load(<GrammarBuilderLayout />),
        children: [
          { index: true, element: load(<GrammarTestDetailsPage />) },
          { path: 'part/:partNumber', element: load(<GrammarPartEditorPage />) },
        ],
      },
    ],
  },
];
