import { Navigate } from 'react-router-dom';
import TestLayout from '../../components/layout/TestLayout';
import RoleGuard from '../auth/components/RoleGuard';
import WritingAttemptLayout from './components/WritingAttemptLayout';
import WritingOverviewPage from './pages/WritingOverviewPage';
import WritingPartPage from './pages/WritingPartPage';
import WritingResultPage from './pages/WritingResultPage';
import WritingResultDetailPage from './pages/WritingResultDetailPage';

export const writingMainRoutes = [
  { path: 'writing', element: <Navigate to="/writing/overview" replace /> },
  { path: 'writing/overview', element: <WritingOverviewPage /> },
  { path: 'writing/result', element: <RoleGuard allowedRoles={['STUDENT']}><WritingResultPage /></RoleGuard> },
];

export const writingTestRoutes = [
  {
    path: '/writing/test',
    element: <WritingAttemptLayout />,
    children: [
      { path: ':part', element: <WritingPartPage /> },
    ],
  },
  {
    path: '/writing/result-detail',
    element: <RoleGuard allowedRoles={['STUDENT']}><TestLayout headerProps={{ showTimer: false, showExit: false }} /></RoleGuard>,
    children: [{ index: true, element: <WritingResultDetailPage /> }],
  },
];
