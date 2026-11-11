import { Suspense } from 'react'
import { Navigate, createBrowserRouter } from 'react-router-dom'

import HomePage from '@/pages/landing/HomePage'
import AuthPage from '@/pages/auth/AuthPage'
import NapThePage from '@/pages/topup/NapThePage'
import TransferPage from '@/pages/transfer/TransferPage'
import GameModesListPage from '@/pages/game/GameModesListPage'
import ContentPage from '@/pages/site/ContentPage'
import GameModeDetailPage from '@/pages/game/GameModeDetailPage'
import NotFound from '@/pages/errors/NotFound'
import Forbidden from '@/pages/errors/Forbidden'
import ErrorPage from '@/pages/errors/ErrorPage'
import AdminLayout from '@/components/layout/AdminLayout'
import AdminOverviewPage from '@/pages/admin/AdminOverviewPage'
import AdminServersPage from '@/pages/admin/AdminServersPage'
import AdminServerCategoriesPage from '@/pages/admin/AdminServerCategoriesPage'
import AdminContentPagesPage from '@/pages/admin/AdminContentPagesPage'
import AdminCheckinsPage from '@/pages/admin/AdminCheckinsPage'
import AdminKeysPage from '@/pages/admin/AdminKeysPage'
import { lazy } from 'react'
import AdminMonitorPage from '@/pages/admin/AdminMonitorPage'
import AdminMonitorDetailPage from '@/pages/admin/AdminMonitorDetailPage'
import AdminBankDepositsPage from '@/pages/admin/AdminBankDepositsPage'
import AdminPointsHistoryPage from '@/pages/admin/AdminPointsHistoryPage'
import AdminCardTransactionsPage from '@/pages/admin/AdminCardTransactionsPage'
import AdminPromotionsPage from '@/pages/admin/AdminPromotionsPage'
import AdminUsersPage from '@/pages/admin/AdminUsersPage'
import { LegacyRedirect, LegacySlugRedirect, RootLayout } from '@/router/RouteHelpers'

/** Editor HTML admin kéo theo CodeMirror (~450KB) — chỉ tải khi admin mở trang soạn.
 *  CẢ HAI trang editor phải lazy: HtmlEditor (components/admin) nằm trong chunk
 *  riêng, không kéo CodeMirror vào bundle admin mặc định. */
const AdminGameModeContentPage = lazy(() => import('@/pages/admin/AdminGameModeContentPage'))
const AdminPageEditorPage = lazy(() => import('@/pages/admin/AdminPageEditorPage'))
/** FRONTEND-5 §4 — trang Nội dung website (5 tab CRUD), lazy cho nhẹ bundle admin mặc định. */
const AdminContentPage = lazy(() => import('@/pages/admin/AdminContentPage'))

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
        path: '/may-chu/the-loai/:slug',
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
      { path: '/luat-le', element: <ContentPage slug="luat-le" fallbackTitle="Luật lệ" /> },
      { path: '/dieu-khoan', element: <ContentPage slug="dieu-khoan" fallbackTitle="Điều khoản dịch vụ" /> },
      { path: '/chinh-sach-bao-mat', element: <ContentPage slug="chinh-sach-bao-mat" fallbackTitle="Chính sách bảo mật" /> },
      { path: '/forbidden', element: <Forbidden /> },
      // ===== Khu admin: dữ liệu động qua API, được phép navigation SPA (<Link>) =====
      {
        path: '/admin',
        element: <AdminLayout />,
        children: [
          { index: true, element: <AdminOverviewPage /> },
          {
            path: 'content',
            element: (
              <Suspense fallback={<div className="p-8 text-sm text-muted">Đang tải trang nội dung…</div>}>
                <AdminContentPage />
              </Suspense>
            ),
          },
          { path: 'servers', element: <AdminServersPage /> },
          { path: 'server-categories', element: <AdminServerCategoriesPage /> },
          { path: 'pages', element: <AdminContentPagesPage /> },
          {
            path: 'pages/:id/content',
            element: (
              <Suspense fallback={<div className="p-8 text-sm text-muted">Đang tải editor…</div>}>
                <AdminPageEditorPage />
              </Suspense>
            ),
          },
          { path: 'checkins', element: <AdminCheckinsPage /> },
          // Bỏ cụm + tách trang máy chủ game: 2 route cũ chuyển về trang Servers hợp nhất.
          { path: 'clusters', element: <Navigate to="/admin/servers" replace /> },
          { path: 'game-modes', element: <Navigate to="/admin/servers" replace /> },
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