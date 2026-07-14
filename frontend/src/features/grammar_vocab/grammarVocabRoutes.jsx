import React from 'react';
import Part1GrammarPage from './pages/Part1GrammarPage';
import Part2GrammarPage from './pages/Part2GrammarPage';
import TestLayout from '../../components/layout/TestLayout';

export const grammarVocabRoutes = [
  {
    path: '/grammar-vocab/test',
    element: <TestLayout />,
    children: [
      { path: 'part1', element: <Part1GrammarPage /> },
      { path: 'part2', element: <Part2GrammarPage /> },
    ],
  },
];
