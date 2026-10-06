import React from 'react';
import SpeakingOverviewPage from './pages/SpeakingOverviewPage';
import SpeakingFeedPage from './pages/SpeakingFeedPage';
import TestListPage from '../../pages/TestListPage';
import TestLayout from '../../components/layout/TestLayout';
import AttemptRoleGuard from '../test-attempts/components/AttemptRoleGuard.jsx';
import SpeakingAttemptLayout from './components/SpeakingAttemptLayout';
import SpeakingPartPage from './pages/SpeakingPartPage';
import SpeakingAttemptResultPage from './pages/SpeakingAttemptResultPage';
import SpeakingAttemptDetailPage from './pages/SpeakingAttemptDetailPage';

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
    path: 'speaking/result',
    element: <AttemptRoleGuard><SpeakingAttemptResultPage /></AttemptRoleGuard>,
  }
];

export const speakingTestRoutes = [
  {
    path: 'speaking/test',
    element: <SpeakingAttemptLayout />,
    children: [
      { path: 'part1', element: <SpeakingPartPage partNumber={1} /> },
      { path: 'part2', element: <SpeakingPartPage partNumber={2} /> },
      { path: 'part3', element: <SpeakingPartPage partNumber={3} /> },
      { path: 'part4', element: <SpeakingPartPage partNumber={4} /> },
    ]
  },
  {
    path: 'speaking/detail-result',
    element: <AttemptRoleGuard><TestLayout headerProps={{ showTimer: false, showExit: false }} /></AttemptRoleGuard>,
    children: [
      { index: true, element: <SpeakingAttemptDetailPage /> },
    ],
  }
];
