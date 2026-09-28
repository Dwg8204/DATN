import { createElement, lazy, Suspense } from 'react';
import { Navigate } from 'react-router-dom';
import TestLayout from '../../components/layout/TestLayout';
import RoleGuard from '../auth/components/RoleGuard';

const load = element => <Suspense fallback={<div role="status">Loading…</div>}>{element}</Suspense>;
const lazyElement = importer => load(createElement(lazy(importer)));

const writingAttemptLayout = lazyElement(() => import('./components/WritingAttemptLayout'));
const writingOverviewPage = lazyElement(() => import('./pages/WritingOverviewPage'));
const writingPartPage = lazyElement(() => import('./pages/WritingPartPage'));
const writingResultPage = lazyElement(() => import('./pages/WritingResultPage'));
const writingResultDetailPage = lazyElement(() => import('./pages/WritingResultDetailPage'));

export const writingMainRoutes = [
  { path: 'writing', element: <Navigate to="/writing/overview" replace /> },
  { path: 'writing/overview', element: writingOverviewPage },
  { path: 'writing/result', element: <RoleGuard allowedRoles={['STUDENT']}>{writingResultPage}</RoleGuard> },
];

export const writingTestRoutes = [
  {
    path: '/writing/test',
    element: writingAttemptLayout,
    children: [
      { path: ':part', element: writingPartPage },
    ],
  },
  {
    path: '/writing/result-detail',
    element: <RoleGuard allowedRoles={['STUDENT']}><TestLayout headerProps={{ showTimer: false, showExit: false }} /></RoleGuard>,
    children: [{ index: true, element: writingResultDetailPage }],
  },
];
