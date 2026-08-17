import React from 'react';
import SpeakingOverviewPage from './pages/SpeakingOverviewPage';
import SpeakingFeedPage from './pages/SpeakingFeedPage';
import SpeakingTestListPage from './pages/SpeakingTestListPage';
import TestLayout from '../../components/layout/TestLayout';

// Mock test parts and results pages to avoid routing errors before they are implemented
const MockSpeakingPage = () => <div>Speaking Part Placeholder</div>;
const MockSpeakingResultPage = () => <div>Speaking Result Placeholder</div>;
const MockSpeakingDetailResultPage = () => <div>Speaking Detail Result Placeholder</div>;

export const speakingMainRoutes = [
  {
    path: 'speaking/overview',
    element: <SpeakingOverviewPage />,
  },
  {
    path: 'speaking/feed',
    element: <SpeakingFeedPage />,
  },
  {
    path: 'speaking/tests',
    element: <SpeakingTestListPage />,
  },
  {
    path: 'speaking/result',
    element: <MockSpeakingResultPage />,
  }
];

export const speakingTestRoutes = [
  {
    path: 'speaking/test',
    element: <TestLayout />,
    children: [
      { path: 'part1', element: <MockSpeakingPage /> },
      { path: 'part2', element: <MockSpeakingPage /> },
      { path: 'part3', element: <MockSpeakingPage /> },
      { path: 'part4', element: <MockSpeakingPage /> },
    ]
  },
  {
    path: 'speaking/detail-result',
    element: <TestLayout headerProps={{ showTimer: false, showExit: false }} />,
    children: [
      { index: true, element: <MockSpeakingDetailResultPage /> },
    ],
  }
];
