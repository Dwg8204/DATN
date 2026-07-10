import MainLayout from '../components/layout/MainLayout';
import TestLayout from '../components/layout/TestLayout';
import HomePage from '../pages/HomePage';
import IntroductionPage from '../pages/IntroductionPage';
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
      ...practiceRoutes,
      ...writingRoutes,
      ...chatbotRoutes,
      {
        path: '*',
        element: <NotFoundPage />,
      },
    ],
  },
  {
    path: '/:skill/introduction',
    element: <TestLayout />,
    children: [
      {
        index: true,
        element: <IntroductionPage />,
      },
    ],
  },
];