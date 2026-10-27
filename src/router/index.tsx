import { Suspense } from 'react'
import { createBrowserRouter } from 'react-router-dom'

import HomePage from '@/pages/landing/HomePage'
import AuthPage from '@/pages/auth/AuthPage'
import NapThePage from '@/pages/topup/NapThePage'
import TransferPage from '@/pages/transfer/TransferPage'
import GameModesListPage from '@/pages/game/GameModesListPage'
import GameModeDetailPage from '@/pages/game/GameModeDetailPage'
import NotFound from '@/pages/errors/NotFound'
import Forbidden from '@/pages/errors/Forbidden'
import ErrorPage from '@/pages/errors/ErrorPage'
import AdminLayout from '@/components/layout/AdminLayout'
import AdminOverviewPage from '@/pages/admin/AdminOverviewPage'
import AdminClustersPage from '@/pages/admin/AdminClustersPage'
import AdminServersPage from '@/pages/admin/AdminServersPage'
import AdminKeysPage from '@/pages/admin/AdminKeysPage'
import { lazy } from 'react'
import AdminMonitorPage from '@/pages/admin/AdminMonitorPage'
import AdminMonitorDetailPage from '@/pages/admin/AdminMonitorDetailPage'
import AdminGameModesPage from '@/pages/admin/AdminGameModesPage'
import AdminBankDepositsPage from '@/pages/admin/AdminBankDepositsPage'
import AdminPointsHistoryPage from '@/pages/admin/AdminPointsHistoryPage'
import AdminCardTransactionsPage from '@/pages/admin/AdminCardTransactionsPage'
import AdminPromotionsPage from '@/pages/admin/AdminPromotionsPage'
import AdminUsersPage from '@/pages/admin/AdminUsersPage'
import { LegacyRedirect, LegacySlugRedirect, RootLayout } from '@/router/RouteHelpers'

/** Editor HTML admin kéo theo CodeMirror (~450KB) — chỉ tải khi admin mở trang soạn. */
const AdminGameModeContentPage = lazy(() => import('@/pages/admin/AdminGameModeContentPage'))

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
      // FRONTEND-4 §3.1 — trang user thường trong SiteLayout, window.DATA (page:'transfer').
      {
        path: '/chuyen-xu',
        element: <TransferPage />,
      },
      {
        path: '/forbidden',
        element: <Forbidden />,
      },
      // ===== Khu admin: dữ liệu động qua API, được phép navigation SPA (<Link>) =====
      {
        path: '/admin',
        element: <AdminLayout />,
        children: [
          { index: true, element: <AdminOverviewPage /> },
          { path: 'clusters', element: <AdminClustersPage /> },
          { path: 'servers', element: <AdminServersPage /> },
          { path: 'game-modes', element: <AdminGameModesPage /> },
          { path: 'bank-deposits', element: <AdminBankDepositsPage /> },
          { path: 'points-history', element: <AdminPointsHistoryPage /> },
          { path: 'card-transactions', element: <AdminCardTransactionsPage /> },
          { path: 'promotions', element: <AdminPromotionsPage /> },
          { path: 'users', element: <AdminUsersPage /> },
          {
            path: 'game-modes/:id/content',
            element: (
              <Suspense fallback={<div className="p-8 text-sm text-muted">Đang tải editor…</div>}>
                <AdminGameModeContentPage />
              </Suspense>
            ),
          },
          { path: 'keys', element: <AdminKeysPage /> },
          { path: 'monitor', element: <AdminMonitorPage /> },
          { path: 'monitor/:server', element: <AdminMonitorDetailPage /> },
        ],
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