import React from 'react';
import { Navigate } from 'react-router-dom';
import ReadingOverviewPage from './pages/ReadingOverviewPage';
import ReadingChooseTestPage from './pages/ReadingChooseTestPage';
import ReadingTestPage from './pages/ReadingTestPage';
import ReadingResultPage from './pages/ReadingResultPage';
import ReviewFeedbackPage from './pages/ReviewFeedbackPage';
import { ReadingTestProvider } from './context/ReadingTestContext';
import TestLayout from '../../components/layout/TestLayout';

export const readingMainRoutes = [
  {
    path: 'reading',
    element: <ReadingOverviewPage />,
  },
  {
    path: 'reading/tests',
    element: <ReadingChooseTestPage />,
  },
  {
    path: 'reading/choose',
    element: <Navigate to="/reading/tests" replace />,
  },
  {
    path: 'reading/result/:sessionId',
    element: <ReadingResultPage />,
  },
];

export const readingTestRoutes = [
  {
    path: 'reading/test/:testId',
    element: <TestLayout />,
    children: [
      {
        index: true,
        element: (
          <ReadingTestProvider>
            <ReadingTestPage />
          </ReadingTestProvider>
        ),
      },
    ],
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
