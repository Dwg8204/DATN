import { createBrowserRouter } from 'react-router-dom';
import { appRoutes } from './appRoutes.jsx';
import { trackReturnPage } from './returnPage.js';

export const appRouter = createBrowserRouter(appRoutes);
trackReturnPage(appRouter, window.history);
