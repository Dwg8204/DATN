import PageLoader from '../../components/common/PageLoader.jsx';
import { createElement, lazy, Suspense } from 'react';
import { Navigate } from 'react-router-dom';
import TestLayout from '../../components/layout/TestLayout';
import AttemptRoleGuard from '../test-attempts/components/AttemptRoleGuard.jsx';
import AssessmentModelView from '../test-attempts/components/AssessmentModelView.jsx';

const load = element => <Suspense fallback={<PageLoader />}>{element}</Suspense>;
const lazyElement = importer => load(createElement(lazy(importer)));

const writingAttemptLayout = lazyElement(() => import('./components/WritingAttemptLayout'));
const writingOverviewPage = lazyElement(() => import('./pages/WritingOverviewPage'));
const writingPartPage = lazyElement(() => import('./pages/WritingPartPage'));
const writingResultPage = lazyElement(() => import('./pages/WritingResultPage'));
const writingResultDetailPage = lazyElement(() => import('./pages/WritingResultDetailPage'));

export const writingMainRoutes = [
  { path: 'writing', element: <Navigate to="/writing/overview" replace /> },
  { path: 'writing/overview', element: writingOverviewPage },
  { path: 'writing/result', element: <AttemptRoleGuard><AssessmentModelView skill="writing">{writingResultPage}</AssessmentModelView></AttemptRoleGuard> },
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
    element: <AttemptRoleGuard><TestLayout headerProps={{ showTimer: false, showExit: false, confirmExit: false }} /></AttemptRoleGuard>,
    children: [{ index: true, element: <AssessmentModelView skill="writing" detail>{writingResultDetailPage}</AssessmentModelView> }],
  },
];
