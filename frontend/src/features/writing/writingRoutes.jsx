import { Navigate } from 'react-router-dom';
import TestLayout from '../../components/layout/TestLayout';
import WritingOverviewPage from './pages/WritingOverviewPage';
import WritingPartPage from './pages/WritingPartPage';

export const writingMainRoutes = [
  { path: 'writing', element: <Navigate to="/writing/overview" replace /> },
  { path: 'writing/overview', element: <WritingOverviewPage /> },
];

export const writingTestRoutes = [
  {
    path: '/writing/test',
    element: <TestLayout />,
    children: [
      { path: ':part', element: <WritingPartPage /> },
    ],
  },
];
