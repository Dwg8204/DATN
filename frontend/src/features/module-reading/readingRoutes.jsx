import React from 'react';
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
    path: 'reading/choose',
    element: <ReadingChooseTestPage />,
  },
  {
    path: 'reading/result/:sessionId',
    element: <ReadingResultPage />,
  },
  {
    path: 'reading/review/:sessionId',
    element: <ReviewFeedbackPage />,
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
];
