import React from 'react';
import Part1GrammarPage from './pages/Part1GrammarPage';
import Part2GrammarPage from './pages/Part2GrammarPage';
import GrammarVocabResultDetailPage from './pages/GrammarVocabResultDetailPage';
import TestLayout from '../../components/layout/TestLayout';
import GrammarAttemptLayout from './components/GrammarAttemptLayout';
import AttemptRoleGuard from '../test-attempts/components/AttemptRoleGuard.jsx';

export const grammarVocabRoutes = [
  {
    path: '/grammar-vocab/test',
    element: <GrammarAttemptLayout />,
    children: [
      { path: 'part1', element: <Part1GrammarPage /> },
      { path: 'part2', element: <Part2GrammarPage /> },
    ],
  },
  {
    path: '/grammar-vocab/result-detail',
    element: <AttemptRoleGuard><TestLayout headerProps={{ showTimer: false, showExit: false }} /></AttemptRoleGuard>,
    children: [
      { index: true, element: <GrammarVocabResultDetailPage /> },
    ],
  },
];
