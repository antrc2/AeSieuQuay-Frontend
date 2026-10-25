import { NavLink, Outlet } from 'react-router-dom'

import Logo from '@/components/Logo'
import ThemeToggle from '@/components/theme/ThemeToggle'
import Forbidden from '@/pages/errors/Forbidden'
import useAuth from '@/hooks/useAuth'
import { cn } from '@/lib/utils'

/**
 * Layout khu vực /admin.
 *
 * Khác với trang nội dung công khai (bắt buộc `<a href>` để full reload nhận
 * `window.DATA` mới), khu admin là dashboard động — dữ liệu luôn gọi API —
 * nên dùng React Router (`<Link>`, `useNavigate`) thoả mái, không reload.
 *
 * Khoá: user đã đăng nhập VÀ `role_slug === 'admin'` (theo /api/user/me).
 * Chính sách mới (khớp backend-2): guest / sai role / hết hạn → **trang 403
 * ngay tại chỗ** (backend cũng trả shell với status 403), KHÔNG bounce sang
 * /dang-nhap — Forbidden đã có sẵn lối "Đăng nhập lại".
 */
const NAV = [
  { to: '/admin', label: 'Tổng quan', end: true, icon: '📊' },
  { to: '/admin/clusters', label: 'Cụm máy chủ', end: false, icon: '🗂️' },
  { to: '/admin/servers', label: 'Server', end: false, icon: '🖥️' },
  { to: '/admin/game-modes', label: 'Máy chủ', end: false, icon: '🎮' },
  { to: '/admin/keys', label: 'API key', end: false, icon: '🔑' },
  { to: '/admin/monitor', label: 'Monitor', end: false, icon: '📈' },
]

export const AdminLayout = () => {
  const { user, loading } = useAuth()

  if (loading) {
    return (
      <div className="min-h-screen bg-bg p-8">
        <div className="mx-auto flex max-w-7xl gap-8">
          <div className="hidden w-60 shrink-0 space-y-3 lg:block">
            <div className="h-10 animate-pulse rounded-xl bg-surface-2" />
            <div className="h-64 animate-pulse rounded-2xl bg-surface-2" />
          </div>
          <div className="min-w-0 flex-1 space-y-4">
            <div className="h-10 w-48 animate-pulse rounded-xl bg-surface-2" />
            <div className="h-64 animate-pulse rounded-2xl bg-surface-2" />
          </div>
        </div>
      </div>
    )
  }

  // Guest (bootstrap xong mà chưa có user) cũng vào nhánh này — trang 403 tại chỗ.
  if (!user || user.role_slug !== 'admin') return <Forbidden />

  const displayName = user.realname || user.username || 'Admin'

  return (
    <div className="min-h-screen bg-bg text-fg">
      <div className="mx-auto flex max-w-[1400px] flex-col gap-4 px-3 py-4 sm:px-5 lg:flex-row lg:gap-6 lg:px-6 lg:py-6">
        {/* Sidebar: sticky trên desktop, nav ngang trên mobile */}
        <aside className="shrink-0 lg:sticky lg:top-6 lg:flex lg:h-[calc(100vh-3rem)] lg:w-56 lg:flex-col">
          <div className="flex items-center justify-between gap-3 lg:block">
            <div className="flex min-w-0 items-center gap-2.5">
              <Logo size="sm" textOnly linkTo={null} className="shrink-0" />
              <div className="min-w-0">
                <p className="truncate text-sm font-extrabold leading-tight tracking-tight text-fg">Quản trị</p>
                <p className="truncate text-[11px] leading-tight text-muted">SV AeSieuQuay</p>
              </div>
            </div>
            <div className="lg:hidden">
              <ThemeToggle />
            </div>
          </div>

          <nav
            aria-label="Menu quản trị"
            className="mt-3 flex gap-1 overflow-x-auto pb-1 lg:mt-6 lg:min-h-0 lg:flex-1 lg:flex-col lg:gap-0.5 lg:overflow-y-auto lg:pb-0"
          >
            {NAV.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.end}
                className={({ isActive }) =>
                  cn(
                    'flex shrink-0 items-center gap-2.5 rounded-xl px-3 py-2 text-sm font-medium transition-colors',
                    isActive
                      ? 'bg-primary-soft text-primary'
                      : 'text-muted hover:bg-surface-2 hover:text-fg',
                  )
                }
              >
                <span aria-hidden className="w-4 text-center text-base leading-none opacity-80">{item.icon}</span>
                {item.label}
              </NavLink>
            ))}
          </nav>

          {/* Chân sidebar: user + lối ra (desktop) */}
          <div className="mt-4 hidden border-t border-border-c pt-4 lg:block">
            <div className="flex items-center gap-2.5 rounded-xl bg-surface-2 px-3 py-2.5">
              <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-primary text-sm font-bold text-white">
                {displayName.charAt(0).toUpperCase()}
              </span>
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold leading-tight text-fg">{displayName}</p>
                <p className="text-[11px] leading-tight text-muted">role: admin</p>
              </div>
            </div>
            <div className="mt-2 flex items-center justify-between px-1">
              {/* Ra khỏi khu admin: full reload về trang thường */}
              <a href="/" className="text-sm font-medium text-muted transition-colors hover:text-fg">
                ← Về website
              </a>
              <ThemeToggle />
            </div>
          </div>

          {/* Mobile: lối ra ngay dưới nav */}
          <div className="flex items-center gap-3 lg:hidden">
            <a href="/" className="text-sm font-medium text-muted transition-colors hover:text-fg">
              ← Về website
            </a>
          </div>
        </aside>

        <main className="min-w-0 flex-1 pb-10">{<Outlet />}</main>
      </div>
    </div>
  )
}

export default AdminLayout
