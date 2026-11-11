import { useCallback, useRef, useState } from 'react'
import { NavLink, Outlet, useLocation } from 'react-router-dom'
import {
  LayoutDashboard,
  Server,
  KeyRound,
  Image,
  Landmark,
  Gift,
  Coins,
  Ticket,
  Users,
  Activity,
  Home,
  ChevronRight,
  PanelLeftClose,
  PanelLeftOpen,
  Calendar,
  BarChart3,
  Wallet,
  Tags,
  FileText,
  CalendarCheck,
} from 'lucide-react'

import Logo from '@/components/Logo'
import ThemeToggle from '@/components/theme/ThemeToggle'
import Forbidden from '@/pages/errors/Forbidden'
import useAuth from '@/hooks/useAuth'
import { cn } from '@/lib/utils'

/**
 * Layout khu vực /admin — bản "full trang":
 *  - Nội dung trải hết chiều ngang (bỏ khung max-w giữa).
 *  - Sidebar TRÁI gập được (nút đóng/mở) + KÉO GIÃN biên để đổi rộng
 *    (rộng & trạng thái gập lưu localStorage, giữ giữa các trang).
 *  - Điều hướng dạng SUBMENU accordion: bấm nhóm để mở/đóng; mục con
 *    (vd "Sự kiện ▸ Khuyến mãi") bấm để mở lớp thứ hai.
 *
 * Khu admin là dashboard động (gọi API), nên dùng React Router bình thường.
 * Khoá: user đăng nhập VÀ role_slug === 'admin' → ngược lại 403 tại chỗ.
 */

/* ---- mô hình điều hướng 2 lớp ---- */
type Leaf = { to: string; label: string; end?: boolean; icon: typeof LayoutDashboard }
type Sub = { label: string; icon: typeof LayoutDashboard; children: Leaf[] }
type Group = { label: string; items: (Leaf | Sub)[] }

const isSub = (x: Leaf | Sub): x is Sub => 'children' in x

const NAV_GROUPS: Group[] = [
  {
    label: 'Tổng quan',
    items: [{ to: '/admin', label: 'Dashboard', end: true, icon: LayoutDashboard }],
  },
  {
    label: 'Hạ tầng',
    items: [
      // Bỏ cụm + tách trang "Máy chủ game": 1 trang Máy chủ hợp nhất (hạ tầng + /may-chu).
      { to: '/admin/servers', label: 'Máy chủ', icon: Server },
      { to: '/admin/server-categories', label: 'Thể loại máy chủ', icon: Tags },
      { to: '/admin/keys', label: 'API key', icon: KeyRound },
    ],
  },
  {
    label: 'Nội dung',
    items: [
      { to: '/admin/content', label: 'Nội dung', icon: Image },
      { to: '/admin/pages', label: 'Trang nội dung', icon: FileText },
    ],
  },
  {
    label: 'Tài chính',
    items: [
      // Nạp tiền gom dưới 1 submenu (bank + thẻ) — lịch sử nạp.
      {
        label: 'Nạp thẻ',
        icon: Wallet,
        children: [
          { to: '/admin/bank-deposits', label: 'Nạp bank', icon: Landmark },
          { to: '/admin/card-transactions', label: 'Thẻ cào', icon: Ticket },
        ],
      },
      // Khuyến mãi tách thành nhóm "Sự kiện".
      {
        label: 'Sự kiện',
        icon: Calendar,
        children: [{ to: '/admin/promotions', label: 'Khuyến mãi', icon: Gift }],
      },
      // "Lịch sử" thành "Thống kê".
      {
        label: 'Thống kê',
        icon: BarChart3,
        children: [
          { to: '/admin/points-history', label: 'Lịch sử points', icon: Coins },
          { to: '/admin/checkins', label: 'Điểm danh', icon: CalendarCheck },
        ],
      },
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

/* ---- lưu kích thước / trạng thái sidebar ---- */
const LS_WIDTH = 'admin:sidebar-width'
const LS_COLLAPSED = 'admin:sidebar-collapsed'
const WIDTH_DEFAULT = 240
const WIDTH_MIN = 184
const WIDTH_MAX = 440

const readWidth = (): number => {
  try {
    const raw = Number(localStorage.getItem(LS_WIDTH))
    if (Number.isFinite(raw) && raw >= WIDTH_MIN && raw <= WIDTH_MAX) return raw
  } catch {
    /* ignore */
  }
  return WIDTH_DEFAULT
}

const readCollapsed = (): boolean => {
  try {
    return localStorage.getItem(LS_COLLAPSED) === '1'
  } catch {
    return false
  }
}

const flatTo = (g: Group): string[] =>
  g.items.flatMap((it) => (isSub(it) ? it.children.map((c) => c.to) : [it.to]))

const NavLeaf = ({ item }: { item: Leaf }) => (
  <NavLink
    to={item.to}
    end={item.end}
    className={({ isActive }) =>
      cn(
        'group/nav relative flex shrink-0 items-center gap-2.5 rounded-lg px-3 py-2 text-[13px] font-medium transition-all duration-150',
        isActive
          ? 'bg-gradient-to-r from-primary/15 via-primary/8 to-transparent text-primary'
          : 'text-muted hover:bg-white/[0.04] hover:text-fg',
      )
    }
  >
    {({ isActive }) => (
      <>
        <span
          aria-hidden
          className={cn(
            'absolute left-0 top-1/2 h-5 w-[3px] -translate-y-1/2 rounded-r-full bg-primary transition-all',
            isActive ? 'opacity-100 shadow-[0_0_8px_rgba(99,102,241,0.7)]' : 'opacity-0',
          )}
        />
        <item.icon aria-hidden className={cn('h-4 w-4 shrink-0 transition-colors', isActive ? 'text-primary' : 'opacity-70 group-hover/nav:opacity-100')} />
        <span className="truncate">{item.label}</span>
      </>
    )}
  </NavLink>
)

/** Nhóm accordion cấp 1 (label bấm mở/đóng). Mặc định mở nếu chứa route hiện tại. */
const NavGroup = ({ group, defaultOpen }: { group: Group; defaultOpen: boolean }) => {
  const [open, setOpen] = useState(defaultOpen)
  return (
    <div className="border-b border-white/[0.06] last:border-0">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        className="flex w-full items-center justify-between rounded-lg px-2.5 py-2 text-[11px] font-bold uppercase tracking-[0.12em] text-muted opacity-80 transition-colors hover:text-fg"
      >
        <span>{group.label}</span>
        <ChevronRight aria-hidden className={cn('h-3.5 w-3.5 transition-transform', open && 'rotate-90')} />
      </button>
      {open && (
        <div className="mb-1.5 space-y-0.5 px-1">
          {group.items.map((it, i) => (isSub(it) ? <NavSub key={`${it.label}-${i}`} sub={it} /> : <NavLeaf key={it.to} item={it} />))}
        </div>
      )}
    </div>
  )
}

/** Submenu cấp 2 (vd "Sự kiện ▸ Khuyến mãi"). */
const NavSub = ({ sub }: { sub: Sub }) => {
  const [open, setOpen] = useState(false)
  return (
    <div>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-[13px] font-medium text-muted transition-colors hover:bg-white/[0.04] hover:text-fg"
      >
        <sub.icon aria-hidden className="h-4 w-4 shrink-0 opacity-70" />
        <span className="flex-1 truncate text-left">{sub.label}</span>
        <ChevronRight aria-hidden className={cn('h-3.5 w-3.5 transition-transform', open && 'rotate-90')} />
      </button>
      {open && (
        <div className="ml-3 mt-0.5 space-y-0.5 border-l border-white/[0.08] pl-1.5">
          {sub.children.map((c) => (
            <NavLeaf key={c.to} item={c} />
          ))}
        </div>
      )}
    </div>
  )
}

export const AdminLayout = () => {
  const { user, loading } = useAuth()
  const location = useLocation()

  const [width, setWidth] = useState(readWidth)
  const [collapsed, setCollapsed] = useState(readCollapsed)
  const [resizing, setResizing] = useState(false)
  const shellRef = useRef<HTMLDivElement>(null)

  // Auto-mở nhóm chứa route hiện tại mỗi lần đổi trang (không đóng nhóm khác).
  const activeGroupLabel = NAV_GROUPS.find((g) => flatTo(g).some((to) => matchesRoute(location.pathname, to)))?.label

  const persistWidth = useCallback((w: number) => {
    setWidth(w)
    try {
      localStorage.setItem(LS_WIDTH, String(w))
    } catch {
      /* ignore */
    }
  }, [])

  const toggleCollapse = () => {
    setCollapsed((c) => {
      const next = !c
      try {
        localStorage.setItem(LS_COLLAPSED, next ? '1' : '0')
      } catch {
        /* ignore */
      }
      return next
    })
  }

  // Kéo giãn biên sidebar (desktop only).
  const startResize = (e: React.MouseEvent) => {
    e.preventDefault()
    setResizing(true)
    const startX = e.clientX
    const startW = width
    const onMove = (ev: MouseEvent) => {
      const next = Math.min(WIDTH_MAX, Math.max(WIDTH_MIN, startW + (ev.clientX - startX)))
      persistWidth(next)
    }
    const onUp = () => {
      setResizing(false)
      document.removeEventListener('mousemove', onMove)
      document.removeEventListener('mouseup', onUp)
      document.body.style.userSelect = ''
    }
    document.body.style.userSelect = 'none'
    document.addEventListener('mousemove', onMove)
    document.addEventListener('mouseup', onUp)
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-bg p-8">
        <div className="flex gap-8">
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

  if (!user || user.role_slug !== 'admin') return <Forbidden />

  const displayName = user.realname || user.username || 'Admin'
  const mobileNav = NAV_GROUPS.flatMap((g) => g.items.flatMap((it) => (isSub(it) ? it.children : [it])))

  return (
    <div ref={shellRef} className={cn('flex min-h-screen bg-bg text-fg', resizing && 'cursor-col-resize select-none')}>
      {/* Sidebar desktop: sticky full-height, kéo giãn + gập */}
      <aside
        className={cn(
          'sticky top-0 z-20 hidden h-screen shrink-0 flex-col border-r border-border-c bg-surface/60 backdrop-blur-xl lg:flex',
          resizing ? '' : 'transition-[width] duration-150',
        )}
        style={{ width: collapsed ? 68 : width }}
      >
        {/* Header logo + nút gập */}
        <div className={cn('flex items-center gap-2.5 border-b border-border-c px-3 py-3.5', collapsed && 'justify-center px-2')}>
          <Logo size="sm" textOnly linkTo={null} className="shrink-0" />
          {!collapsed && (
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-extrabold leading-tight tracking-tight text-fg">Quản trị</p>
              <p className="truncate text-[11px] leading-tight text-muted">SV AeSieuQuay</p>
            </div>
          )}
          <button
            type="button"
            onClick={toggleCollapse}
            title={collapsed ? 'Mở menu' : 'Gập menu'}
            className="shrink-0 rounded-lg p-1.5 text-muted transition-colors hover:bg-surface-2 hover:text-fg"
          >
            {collapsed ? <PanelLeftOpen className="h-4 w-4" /> : <PanelLeftClose className="h-4 w-4" />}
          </button>
        </div>

        {collapsed ? (
          /* Chế độ gập: chỉ icon, link nhanh các leaf (không accordion) */
          <nav aria-label="Menu quản trị (gập)" className="min-h-0 flex-1 space-y-1 overflow-y-auto px-2 py-3">
            {mobileNav.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.end}
                title={item.label}
                className={({ isActive }) =>
                  cn(
                    'mx-auto grid h-10 w-10 place-items-center rounded-xl transition-colors',
                    isActive ? 'bg-primary/15 text-primary' : 'text-muted hover:bg-white/[0.06] hover:text-fg',
                  )
                }
              >
                <item.icon className="h-5 w-5" />
              </NavLink>
            ))}
          </nav>
        ) : (
          <nav aria-label="Menu quản trị" className="min-h-0 flex-1 overflow-y-auto px-2.5 py-3">
            {NAV_GROUPS.map((group) => (
              <NavGroup key={group.label} group={group} defaultOpen={group.label === activeGroupLabel} />
            ))}
          </nav>
        )}

        {/* Chân sidebar */}
        <div className={cn('border-t border-border-c p-3', collapsed && 'px-2')}>
          <div className={cn('flex items-center gap-2.5 rounded-xl border border-border-c bg-surface-2/60 px-2.5 py-2', collapsed && 'justify-center px-0')}>
            <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-gradient-to-br from-primary to-primary-strong text-sm font-bold text-white shadow-[0_0_12px_rgba(99,102,241,0.35)]">
              {displayName.charAt(0).toUpperCase()}
            </span>
            {!collapsed && (
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold leading-tight text-fg">{displayName}</p>
                <p className="text-[11px] leading-tight text-muted">role: admin</p>
              </div>
            )}
          </div>
          <div className={cn('mt-2 flex items-center', collapsed ? 'justify-center' : 'justify-between px-1')}>
            <a
              href="/"
              title="Về website"
              className="inline-flex items-center gap-1.5 rounded-lg px-2 py-1 text-sm font-medium text-muted transition-colors hover:bg-surface-2 hover:text-fg"
            >
              <Home className="h-3.5 w-3.5" />
              {!collapsed && 'Về website'}
            </a>
            {!collapsed && <ThemeToggle />}
          </div>
        </div>

        {/* Tay kéo giãn (ẩn khi gập) */}
        {!collapsed && (
          <div
            role="separator"
            aria-orientation="vertical"
            onMouseDown={startResize}
            onDoubleClick={() => persistWidth(WIDTH_DEFAULT)}
            title="Kéo để đổi độ rộng menu (nhấp đúp để về mặc định)"
            className={cn(
              'absolute right-0 top-0 h-full w-1.5 cursor-col-resize -translate-x-1/2 group',
              'hover:bg-primary/30',
              resizing && 'bg-primary/50',
            )}
          >
            <span className={cn('absolute top-1/2 left-1/2 h-8 w-[3px] -translate-x-1/2 -translate-y-1/2 rounded-full', resizing ? 'bg-primary' : 'bg-transparent group-hover:bg-primary/50')} />
          </div>
        )}
      </aside>

      {/* Main full-width */}
      <main className="min-w-0 flex-1 px-4 py-5 sm:px-6 lg:px-8">
        {/* Mobile nav ngang (desktop ẩn) */}
        <div className="mb-4 flex gap-1 overflow-x-auto pb-1 lg:hidden">
          {mobileNav.map((item) => (
            <NavLeaf key={item.to} item={item} />
          ))}
        </div>
        <Outlet />
      </main>
    </div>
  )
}

/** so khớp active: /admin (end) chỉ khớp tuyệt đối, còn lại prefix. */
function matchesRoute(pathname: string, to: string): boolean {
  if (to === '/admin') return pathname === '/admin'
  return pathname === to || pathname.startsWith(`${to}/`)
}

export default AdminLayout
