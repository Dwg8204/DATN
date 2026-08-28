import React from 'react';
import SpeakingOverviewPage from './pages/SpeakingOverviewPage';
import SpeakingFeedPage from './pages/SpeakingFeedPage';
import SpeakingTestListPage from './pages/SpeakingTestListPage';
import TestLayout from '../../components/layout/TestLayout';
import Part1SpeakingPage from './pages/Part1SpeakingPage';
import Part2SpeakingPage from './pages/Part2SpeakingPage';
import Part3SpeakingPage from './pages/Part3SpeakingPage';
import Part4SpeakingPage from './pages/Part4SpeakingPage';
import SpeakingResultPage from './pages/SpeakingResultPage';

// Mock test parts and results pages to avoid routing errors before they are implemented
const MockSpeakingPage = () => <div>Speaking Part Placeholder</div>;
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
    element: <SpeakingResultPage />,
  }
];

export const speakingTestRoutes = [
  {
    path: 'speaking/test',
    element: <TestLayout />,
    children: [
      { path: 'part1', element: <Part1SpeakingPage /> },
      { path: 'part2', element: <Part2SpeakingPage /> },
      { path: 'part3', element: <Part3SpeakingPage /> },
      { path: 'part4', element: <Part4SpeakingPage /> },
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
