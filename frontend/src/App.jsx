import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';

import ErrorBoundary from './components/common/ErrorBoundary';
import Header from './components/layout/Header';

import ReadingOverviewPage from './features/module-reading/pages/ReadingOverviewPage';
import ReadingChooseTestPage from './features/module-reading/pages/ReadingChooseTestPage';
import ReadingIntroPage from './features/module-reading/pages/ReadingIntroPage';
import ReadingTestPage from './features/module-reading/pages/ReadingTestPage';
import ReadingResultPage from './features/module-reading/pages/ReadingResultPage';
import ReviewFeedbackPage from './features/module-reading/pages/ReviewFeedbackPage';
import FlashcardPage from './features/module-reading/pages/FlashcardPage';
import { ReadingTestProvider } from './features/module-reading/context/ReadingTestContext';

function App() {
  return (
    <ErrorBoundary>
      <BrowserRouter>
        <div className="min-h-screen bg-gray-50 text-gray-900 font-sans flex flex-col">
          <Header />
          
          <main className="flex-1">
            <Routes>
              <Route path="/" element={<Navigate to="/reading" replace />} />
              <Route path="/reading" element={<ReadingOverviewPage />} />
              <Route path="/reading/choose" element={<ReadingChooseTestPage />} />
              <Route path="/reading/intro/:testId" element={<ReadingIntroPage />} />
              <Route path="/reading/test/:testId" element={
                <ReadingTestProvider>
                  <ReadingTestPage />
                </ReadingTestProvider>
              } />
              <Route path="/reading/result/:sessionId" element={<ReadingResultPage />} />
              <Route path="/reading/review/:sessionId" element={<ReviewFeedbackPage />} />
              <Route path="/reading/vocab" element={<FlashcardPage />} />
            </Routes>
          </main>
        </div>
      </BrowserRouter>
    </ErrorBoundary>
  );
}

export default App;
