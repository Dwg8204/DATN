import { lazy, Suspense } from 'react';

const DashboardPage = lazy(() => import('../pages/DashboardPage'));

export default function DashboardRoute() {
  return <Suspense fallback={<div role="status">Loading dashboard…</div>}>
    <DashboardPage />
  </Suspense>;
}
