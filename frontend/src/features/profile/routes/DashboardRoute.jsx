import PageLoader from '../../../components/common/PageLoader.jsx';
import { lazy, Suspense } from 'react';

const DashboardPage = lazy(() => import('../pages/DashboardPage'));

export default function DashboardRoute() {
  return <Suspense fallback={<PageLoader />}>
    <DashboardPage />
  </Suspense>;
}
