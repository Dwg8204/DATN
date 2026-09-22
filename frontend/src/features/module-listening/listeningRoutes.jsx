import React from 'react';
import ListeningOverviewPage from './pages/ListeningOverviewPage';
import ListeningFeedPage from './pages/ListeningFeedPage';
import ListeningTestListPage from './pages/ListeningTestListPage';
import TestLayout from '../../components/layout/TestLayout';
import RoleGuard from '../auth/components/RoleGuard';
import ListeningAttemptLayout from './components/ListeningAttemptLayout';
import Part1ListeningPage from './pages/Part1ListeningPage';
import Part2ListeningPage from './pages/Part2ListeningPage';
import Part3ListeningPage from './pages/Part3ListeningPage';
import Part4ListeningPage from './pages/Part4ListeningPage';
import ListeningResultPage from './pages/ListeningResultPage';
import ListeningDetailResultPage from './pages/ListeningDetailResultPage';

export const listeningMainRoutes = [
  {
    path: 'listening/overview',
    element: <ListeningOverviewPage />,
  },
  {
    path: 'listening/feed',
    element: <ListeningFeedPage />,
  },
  {
    path: 'listening/tests',
    element: <ListeningTestListPage />,
  },
  {
    path: 'listening/result',
    element: <RoleGuard allowedRoles={['STUDENT']}><ListeningResultPage /></RoleGuard>,
  }
];

export const listeningTestRoutes = [
  {
    path: 'listening/test',
    element: <ListeningAttemptLayout />,
    children: [
      { path: 'part1', element: <Part1ListeningPage /> },
      { path: 'part2', element: <Part2ListeningPage /> },
      { path: 'part3', element: <Part3ListeningPage /> },
      { path: 'part4', element: <Part4ListeningPage /> },
    ]
  },
  {
    path: 'listening/detail-result',
    element: <RoleGuard allowedRoles={['STUDENT']}><TestLayout headerProps={{ showTimer: false, showExit: false }} /></RoleGuard>,
    children: [
      { index: true, element: <ListeningDetailResultPage /> },
    ],
  }
];
