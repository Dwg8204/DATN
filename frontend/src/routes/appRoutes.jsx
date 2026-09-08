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
import GrammarVocabResultPage from '../features/grammar_vocab/pages/GrammarVocabResultPage';
import TestListPage from '../pages/TestListPage';
import ProfilePage from '../features/profile/pages/ProfilePage';
import NotificationsPage from '../features/profile/pages/NotificationsPage';
import LearningHistoryPage from '../features/profile/pages/LearningHistoryPage';
import ChangePasswordPage from '../features/profile/pages/ChangePasswordPage';
import DashboardPage from '../features/profile/pages/DashboardPage';
import { practiceRoutes } from '../features/practice-exam/practiceRoutes';
import { writingMainRoutes, writingTestRoutes } from '../features/writing/writingRoutes';
import { chatbotRoutes } from '../features/ai-chatbot/chatbotRoutes';
import { listeningMainRoutes, listeningTestRoutes } from '../features/module-listening/listeningRoutes';
import { speakingMainRoutes, speakingTestRoutes } from '../features/module-speaking/speakingRoutes';
import { grammarVocabRoutes } from '../features/grammar_vocab/grammarVocabRoutes';
import { readingMainRoutes, readingTestRoutes } from '../features/module-reading/readingRoutes';
import FlashcardPage from '../features/module-reading/pages/FlashcardPage';
import { adminRoutes } from '../features/admin/adminRoutes';
import { dictationRoutes } from '../features/dictation/dictationRoutes';

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
        path: 'profile',
        element: <ProfilePage />,
      },
      {
        path: 'profile/notifications',
        element: <NotificationsPage />,
      },
      {
        path: 'profile/history',
        element: <LearningHistoryPage />,
      },
      {
        path: 'profile/change-password',
        element: <ChangePasswordPage />,
      },
      {
        path: 'profile/dashboard',
        element: <DashboardPage />,
      },
      {
        path: 'grammar-vocab/overview',
        element: <GrammarVocabOverviewPage />,
      },
      {
        path: 'grammar-vocab/result',
        element: <GrammarVocabResultPage />,
      },
      {
        path: 'vocab',
        element: <FlashcardPage />,
      },
      {
        path: ':skill/tests',
        element: <TestListPage />,
      },
      ...listeningMainRoutes,
      ...speakingMainRoutes,
      ...readingMainRoutes,
      ...practiceRoutes,
      ...writingMainRoutes,
      ...chatbotRoutes,
      ...dictationRoutes,
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
  ...listeningTestRoutes,
  ...speakingTestRoutes,
  ...readingTestRoutes,
  ...grammarVocabRoutes,
  ...writingTestRoutes,
  ...adminRoutes,
];
