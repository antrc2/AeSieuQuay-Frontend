import { createBrowserRouter } from 'react-router-dom'

import HomePage from '@/pages/landing/HomePage'
import LoginPage from '@/pages/auth/LoginPage'
import RegisterPage from '@/pages/auth/RegisterPage'
import NapThePage from '@/pages/topup/NapThePage'
import GameModesListPage from '@/pages/game/GameModesListPage'
import GameModeDetailPage from '@/pages/game/GameModeDetailPage'
import NotFound from '@/pages/errors/NotFound'
import Forbidden from '@/pages/errors/Forbidden'

export const router = createBrowserRouter([
  {
    path: '/',
    element: <HomePage />,
    handle: { title: 'AeSieuQuay - Trang chủ', description: 'Máy chủ Minecraft Việt Nam SV AeSieuQuay' },
  },
  {
    path: '/dang-nhap',
    element: <LoginPage />,
    handle: { title: 'Đăng nhập', description: 'Hệ thống đăng nhập Minecraft' },
  },
  {
    path: '/dang-ky',
    element: <RegisterPage />,
    handle: { title: 'Đăng ký', description: 'Tạo tài khoản mới' },
  },
  {
    path: '/may-chu',
    element: <GameModesListPage />,
    handle: { title: 'Máy chủ - AeSieuQuay', description: 'Danh sách các máy chủ tại SV AeSieuQuay' },
  },
  {
    path: '/may-chu/:slug',
    element: <GameModeDetailPage />,
    handle: { title: 'Chi tiết máy chủ', description: 'Thông tin máy chủ' },
  },
  {
    path: '/che-do-choi',
    element: <GameModesListPage />,
    handle: { title: 'Máy chủ - AeSieuQuay', description: 'Danh sách các máy chủ tại SV AeSieuQuay' },
  },
  {
    path: '/che-do-choi/:slug',
    element: <GameModeDetailPage />,
    handle: { title: 'Chi tiết máy chủ', description: 'Thông tin máy chủ' },
  },
  {
    path: '/nap-the',
    element: <NapThePage />,
    handle: { title: 'Nạp thẻ', description: 'Nạp thẻ Minecraft' },
  },
  {
    path: '/nap-the/:cardSlug',
    element: <NapThePage />,
    handle: { title: 'Nạp thẻ', description: 'Nạp thẻ Minecraft' },
  },
  // ===== Error routes =====
  {
    path: '/forbidden',
    element: <Forbidden />,
    handle: { title: '403 - Từ chối truy cập', description: 'Bạn không có quyền truy cập trang này' },
  },
  {
    path: '/not-found',
    element: <NotFound />,
    handle: { title: '404 - Không tìm thấy', description: 'Trang không tồn tại' },
  },
  // Catch-all PHẢI đặt cuối cùng
  {
    path: '*',
    element: <NotFound />,
    handle: { title: '404 - Không tìm thấy', description: 'Trang không tồn tại' },
  },
])

export default router
