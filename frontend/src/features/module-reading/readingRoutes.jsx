import React from 'react';
import ReadingOverviewPage from './pages/ReadingOverviewPage';
import ReadingChooseTestPage from './pages/ReadingChooseTestPage';
import ReadingIntroPage from './pages/ReadingIntroPage';
import ReadingTestPage from './pages/ReadingTestPage';
import ReadingResultPage from './pages/ReadingResultPage';
import ReviewFeedbackPage from './pages/ReviewFeedbackPage';
import FlashcardPage from './pages/FlashcardPage';
import { ReadingTestProvider } from './context/ReadingTestContext';

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
    path: 'reading/vocab',
    element: <FlashcardPage />,
  },
];

export const readingTestRoutes = [
  {
    path: 'reading/intro/:testId',
    element: <ReadingIntroPage />,
  },
  {
    path: 'reading/test/:testId',
    element: (
      <ReadingTestProvider>
        <ReadingTestPage />
      </ReadingTestProvider>
    ),
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
