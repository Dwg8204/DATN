import React from 'react';
import { Navigate } from 'react-router-dom';
import ReadingOverviewPage from './pages/ReadingOverviewPage';
import ReadingResultPage from './pages/ReadingResultPage';
import ReviewFeedbackPage from './pages/ReviewFeedbackPage';
import TestLayout from '../../components/layout/TestLayout';
import TestListPage from '../../pages/TestListPage';
import AttemptRoleGuard from '../test-attempts/components/AttemptRoleGuard.jsx';
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
    element: <AttemptRoleGuard><ReadingAttemptResultPage /></AttemptRoleGuard>,
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
      { path: ':part', element: <ReadingAttemptPage /> },
    ],
  },
  {
    path: 'reading/detail-result',
    element: <AttemptRoleGuard><TestLayout headerProps={{ showTimer: false, showExit: false }} /></AttemptRoleGuard>,
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
