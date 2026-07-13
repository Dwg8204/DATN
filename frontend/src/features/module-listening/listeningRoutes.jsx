import ListeningOverviewPage from './pages/ListeningOverviewPage';
import ListeningFeedPage from './pages/ListeningFeedPage';
import ListeningTestListPage from './pages/ListeningTestListPage';

export const listeningRoutes = [
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
];
