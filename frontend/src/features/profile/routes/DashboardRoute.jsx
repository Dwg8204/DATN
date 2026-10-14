import { useUiTranslation } from "../../../i18n/useUiTranslation.jsx";
import { lazy, Suspense } from 'react';

const DashboardPage = lazy(() => import('../pages/DashboardPage'));

export default function DashboardRoute() {
  const ui = useUiTranslation();
  return <Suspense fallback={<div role="status">{ui("Loading dashboard…")}</div>}>
    <DashboardPage />
  </Suspense>;
}
