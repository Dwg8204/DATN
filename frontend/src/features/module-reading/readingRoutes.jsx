import React from 'react';
import { Navigate } from 'react-router-dom';
import ReadingOverviewPage from './pages/ReadingOverviewPage';
import ReadingResultPage from './pages/ReadingResultPage';
import ReviewFeedbackPage from './pages/ReviewFeedbackPage';
import TestLayout from '../../components/layout/TestLayout';
import TestListPage from '../../pages/TestListPage';
import RoleGuard from '../auth/components/RoleGuard';
import ReadingAttemptLayout from './components/ReadingAttemptLayout';
import ReadingAttemptPage from './pages/ReadingAttemptPage';
import ReadingAttemptResultPage from './pages/ReadingAttemptResultPage';
import ReadingAttemptDetailPage from './pages/ReadingAttemptDetailPage';

export const readingMainRoutes = [
  {
    path: 'reading',
    element: <ReadingOverviewPage />,
  },

  {
    path: 'reading/choose',
    element: <Navigate to="/reading/tests" replace />,
  },
  {
    path: 'reading/result',
    element: <RoleGuard allowedRoles={['STUDENT']}><ReadingAttemptResultPage /></RoleGuard>,
  },
  {
    path: 'reading/result/:sessionId',
    element: <ReadingResultPage />,
  },
];

export const readingTestRoutes = [
  {
    path: 'reading/test',
    element: <ReadingAttemptLayout />,
    children: [
      { path: 'part1', element: <ReadingAttemptPage /> },
      { path: 'part2', element: <ReadingAttemptPage /> },
      { path: 'part3', element: <ReadingAttemptPage /> },
      { path: 'part4', element: <ReadingAttemptPage /> },
    ],
  },
  {
    path: 'reading/detail-result',
    element: <RoleGuard allowedRoles={['STUDENT']}><TestLayout headerProps={{ showTimer: false, showExit: false }} /></RoleGuard>,
    children: [{ index: true, element: <ReadingAttemptDetailPage /> }],
  },
  {
    path: 'reading/review/:sessionId',
    element: <TestLayout headerProps={{ showTimer: false, showExit: false }} />,
    children: [
      {
        index: true,
        element: <ReviewFeedbackPage />,
      },
    ],
  },
];
