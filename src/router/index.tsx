import { createBrowserRouter } from 'react-router-dom'

import HomePage from '@/pages/landing/HomePage'
import AuthPage from '@/pages/auth/AuthPage'
import NapThePage from '@/pages/topup/NapThePage'
import GameModesListPage from '@/pages/game/GameModesListPage'
import GameModeDetailPage from '@/pages/game/GameModeDetailPage'
import NotFound from '@/pages/errors/NotFound'
import Forbidden from '@/pages/errors/Forbidden'
import ErrorPage from '@/pages/errors/ErrorPage'
import { LegacyRedirect, LegacySlugRedirect, RootLayout } from '@/router/RouteHelpers'

export const router = createBrowserRouter([
  {
    element: <RootLayout />,
    errorElement: <ErrorPage />,
    children: [
      {
        path: '/',
        element: <HomePage />,
      },
      {
        path: '/dang-nhap',
        element: <AuthPage />,
      },
      {
        path: '/dang-ky',
        element: <AuthPage />,
      },
      {
        path: '/may-chu',
        element: <GameModesListPage />,
      },
      {
        path: '/may-chu/:slug',
        element: <GameModeDetailPage />,
      },
      {
        path: '/nap-the',
        element: <NapThePage />,
      },
      {
        path: '/forbidden',
        element: <Forbidden />,
      },
      // ===== Legacy URLs: /che-do-choi* → /may-chu* =====
      {
        path: '/che-do-choi',
        element: <LegacyRedirect to="/may-chu" />,
      },
      {
        path: '/che-do-choi/:slug',
        element: <LegacySlugRedirect />,
      },
      // Catch-all PHẢI đặt cuối cùng
      {
        path: '*',
        element: <NotFound />,
      },
    ],
  },
])

export default router