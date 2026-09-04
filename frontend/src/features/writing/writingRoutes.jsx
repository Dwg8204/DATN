import { Navigate } from 'react-router-dom';
import TestLayout from '../../components/layout/TestLayout';
import WritingOverviewPage from './pages/WritingOverviewPage';
import WritingPartPage from './pages/WritingPartPage';
import WritingResultPage from './pages/WritingResultPage';
import WritingResultDetailPage from './pages/WritingResultDetailPage';

export const writingMainRoutes = [
  { path: 'writing', element: <Navigate to="/writing/overview" replace /> },
  { path: 'writing/overview', element: <WritingOverviewPage /> },
  { path: 'writing/result', element: <WritingResultPage /> },
];

export const writingTestRoutes = [
  {
    path: '/writing/test',
    element: <TestLayout />,
    children: [
      { path: ':part', element: <WritingPartPage /> },
    ],
  },
  {
    path: '/writing/result-detail',
    element: <TestLayout headerProps={{ showTimer: false, showExit: false }} />,
    children: [{ index: true, element: <WritingResultDetailPage /> }],
  },
];
