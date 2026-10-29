import { NavLink, Outlet } from 'react-router-dom'
import {
  LayoutDashboard,
  Layers,
  Server,
  KeyRound,
  Gamepad2,
  Image,
  Landmark,
  Gift,
  Coins,
  Ticket,
  Users,
  Activity,
  Home,
} from 'lucide-react'

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
/** Sidebar chia nhóm — mỗi nhóm một label nhỏ, items là NavLink hiện có. */
const NAV_GROUPS: { label: string; items: { to: string; label: string; end?: boolean; icon: typeof LayoutDashboard }[] }[] = [
  {
    label: 'Tổng quan',
    items: [{ to: '/admin', label: 'Dashboard', end: true, icon: LayoutDashboard }],
  },
  {
    label: 'Hạ tầng',
    items: [
      { to: '/admin/clusters', label: 'Cụm máy chủ', icon: Layers },
      { to: '/admin/servers', label: 'Server', icon: Server },
      { to: '/admin/keys', label: 'API key', icon: KeyRound },
    ],
  },
  {
    label: 'Nội dung',
    items: [
      // FRONTEND-5 §4 — CRUD toàn bộ nội dung DB hiện trên trang chủ (hero/highlight/gallery/social/footer/config).
      { to: '/admin/content', label: 'Nội dung', icon: Image },
      { to: '/admin/game-modes', label: 'Máy chủ game', icon: Gamepad2 },
    ],
  },
  {
    label: 'Tài chính',
    items: [
      { to: '/admin/bank-deposits', label: 'Nạp bank', icon: Landmark },
      { to: '/admin/promotions', label: 'Khuyến mãi nạp', icon: Gift },
      { to: '/admin/points-history', label: 'Lịch sử points', icon: Coins },
      { to: '/admin/card-transactions', label: 'Thẻ cào', icon: Ticket },
    ],
  },
  {
    label: 'Người dùng',
    items: [{ to: '/admin/users', label: 'Tài khoản', icon: Users }],
  },
  {
    label: 'Giám sát',
    items: [{ to: '/admin/monitor', label: 'Monitor', icon: Activity }],
  },
]

const NAV = NAV_GROUPS.flatMap((g) => g.items)

const NavItem = ({ item }: { item: { to: string; label: string; end?: boolean; icon: typeof LayoutDashboard } }) => (
  <NavLink
    to={item.to}
    end={item.end}
    className={({ isActive }) =>
      cn(
        'group/nav relative flex shrink-0 items-center gap-2.5 rounded-lg px-3 py-2 text-[13px] font-medium transition-all duration-150',
        isActive
          ? 'bg-gradient-to-r from-primary/15 via-primary/8 to-transparent text-primary'
          : 'text-muted hover:bg-white/[0.04] hover:text-fg dark:hover:bg-white/[0.04]',
      )
    }
  >
    {({ isActive }) => (
      <>
        {/* Vạch active glow bên trái */}
        <span
          aria-hidden
          className={cn(
            'absolute left-0 top-1/2 h-5 w-[3px] -translate-y-1/2 rounded-r-full bg-primary transition-all',
            isActive ? 'opacity-100 shadow-[0_0_8px_rgba(99,102,241,0.7)]' : 'opacity-0',
          )}
        />
        <item.icon aria-hidden className={cn('h-4 w-4 shrink-0 transition-colors', isActive ? 'text-primary' : 'opacity-70 group-hover/nav:opacity-100')} />
        {item.label}
      </>
    )}
  </NavLink>
)

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
        <aside className="shrink-0 lg:sticky lg:top-6 lg:flex lg:h-[calc(100vh-3rem)] lg:w-60 lg:flex-col">
          <div className="flex items-center justify-between gap-3 rounded-2xl border border-border-c bg-surface/80 p-3 backdrop-blur-xl lg:block lg:border-none lg:bg-transparent lg:p-0 lg:backdrop-blur-none">
            <div className="flex min-w-0 items-center gap-2.5 lg:px-1">
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
            className="mt-3 lg:mt-5 lg:min-h-0 lg:flex-1 lg:overflow-y-auto lg:rounded-2xl lg:border lg:border-border-c lg:bg-surface/70 lg:p-2.5 lg:backdrop-blur-xl"
          >
            {/* mobile: 1 hàng dọc ngang cuộn được, không label nhóm */}
            <div className="flex gap-1 overflow-x-auto pb-1 lg:hidden">
              {NAV.map((item) => (
                <NavItem key={item.to} item={item} />
              ))}
            </div>
            {/* desktop: chia nhóm có label */}
            <div className="hidden space-y-4 lg:block">
              {NAV_GROUPS.map((group) => (
                <div key={group.label}>
                  <p className="px-3 pb-1 text-[10px] font-bold uppercase tracking-[0.12em] text-muted opacity-70">
                    {group.label}
                  </p>
                  <div className="space-y-0.5">
                    {group.items.map((item) => (
                      <NavItem key={item.to} item={item} />
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </nav>

          {/* Chân sidebar: user + lối ra (desktop) */}
          <div className="mt-4 hidden border-t border-border-c pt-4 lg:block">
            <div className="flex items-center gap-2.5 rounded-xl border border-border-c bg-surface-2/60 px-3 py-2.5 backdrop-blur">
              <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-gradient-to-br from-primary to-primary-strong text-sm font-bold text-white shadow-[0_0_12px_rgba(99,102,241,0.35)]">
                {displayName.charAt(0).toUpperCase()}
              </span>
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold leading-tight text-fg">{displayName}</p>
                <p className="text-[11px] leading-tight text-muted">role: admin</p>
              </div>
            </div>
            <div className="mt-2 flex items-center justify-between px-1">
              {/* Ra khỏi khu admin: full reload về trang thường */}
              <a
                href="/"
                className="inline-flex items-center gap-1.5 rounded-lg px-2 py-1 text-sm font-medium text-muted transition-colors hover:bg-surface-2 hover:text-fg"
              >
                <Home className="h-3.5 w-3.5" /> Về website
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
