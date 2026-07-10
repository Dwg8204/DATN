import MainLayout from '../components/layout/MainLayout';
import TestLayout from '../components/layout/TestLayout';
import HomePage from '../pages/HomePage';
import IntroductionPage from '../pages/IntroductionPage';
import NotFoundPage from '../pages/NotFoundPage';
import LoginPage from '../features/auth/pages/LoginPage';
import SignupPage from '../features/auth/pages/SignupPage';
import ForgotPasswordEmailPage from '../features/auth/pages/ForgotPasswordEmailPage';
import ForgotPasswordOTPPage from '../features/auth/pages/ForgotPasswordOTPPage';
import ForgotPasswordResetPage from '../features/auth/pages/ForgotPasswordResetPage';
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
        path: 'login',
        element: <LoginPage />,
      },
      {
        path: 'signup',
        element: <SignupPage />,
      },
      {
        path: 'forgot-password',
        element: <ForgotPasswordEmailPage />,
      },
      {
        path: 'forgot-password/verify-otp',
        element: <ForgotPasswordOTPPage />,
      },
      {
        path: 'forgot-password/reset',
        element: <ForgotPasswordResetPage />,
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