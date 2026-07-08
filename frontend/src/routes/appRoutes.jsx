import MainLayout from '../components/layout/MainLayout';
import HomePage from '../pages/HomePage';
import Introduction from '../pages/Introduction';
import NotFoundPage from '../pages/NotFoundPage';
import { practiceRoutes } from '../features/practice-exam/practiceRoutes';
import { writingRoutes } from '../features/writing-test/writingRoutes';
import { chatbotRoutes } from '../features/ai-chatbot/chatbotRoutes';

export const appRoutes = [
  {
    path: '/',
    element: <MainLayout />,
    children: [
      {
        index: true,
        element: <HomePage />,
      },
      {
        path: 'introduction',
        element: <Introduction />,
      },
      ...practiceRoutes,
      ...writingRoutes,
      ...chatbotRoutes,
      {
        path: '*',
        element: <NotFoundPage />,
      },
    ],
  },
];