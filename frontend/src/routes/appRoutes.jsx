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
import GrammarVocabOverviewPage from '../features/grammar_vocab/pages/GrammarVocabOverviewPage';
import TestListPage from '../pages/TestListPage';
import { practiceRoutes } from '../features/practice-exam/practiceRoutes';
import { writingRoutes } from '../features/writing-test/writingRoutes';
import { chatbotRoutes } from '../features/ai-chatbot/chatbotRoutes';
import Part1GrammarPage from '../pages/Part1GrammarPage';
import ListeningTestTakingPage from '../features/module-listening/pages/ListeningTestTakingPage';
import { listeningRoutes } from '../features/module-listening/listeningRoutes';

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
      {
        path: 'grammar-vocab/overview',
        element: <GrammarVocabOverviewPage />,
      },
      {
        path: ':skill/tests',
        element: <TestListPage />,
      },
      ...listeningRoutes,
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
  {
    path: '/listening/test',
    element: <TestLayout />,
    children: [
      {
        index: true,
        element: <ListeningTestTakingPage />,
      },
    ],
  },
  {
    path: '/:skill/test/:part',
    element: <TestLayout />,
    children: [
      {
        index: true,
        element: <Part1GrammarPage />,
      },
    ],
  },
];