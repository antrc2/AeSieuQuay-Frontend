import { useEffect, useRef, useState } from 'react'
import { useLocation } from 'react-router-dom'
import Logo from '@/components/Logo'
import ThemeToggle from '@/components/theme/ThemeToggle'
import { DEFAULT_MENU } from '@/data/site'
import useAuth from '@/hooks/useAuth'
import { cn } from '@/lib/utils'

/* ================= Auth button ================= */

const AuthButton = ({ className }) => {
  const { user, loading, logout } = useAuth()
  const [open, setOpen] = useState(false)
  const ref = useRef(null)

  // Đóng dropdown khi click ra ngoài / nhấn Esc
  useEffect(() => {
    const onClick = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false)
    }
    const onKey = (e) => e.key === 'Escape' && setOpen(false)
    document.addEventListener('mousedown', onClick)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onClick)
      document.removeEventListener('keydown', onKey)
    }
  }, [])

  // Ưu tiên tên hiển thị (realname), sau đó mới tới username/email.
  const displayName =
    user?.realname || user?.username || user?.name || user?.nickname || user?.email?.split('@')[0] || 'AE'

  if (loading) {
    // Skeleton khi đang kiểm tra phiên
    return <div aria-hidden className={cn('h-9 w-28 animate-pulse rounded-xl bg-surface-2', className)} />
  }

  /* ----- Chưa đăng nhập: nút Đăng nhập ----- */
  if (!user) {
    return (
      <a
        href="/dang-nhap"
        className={cn(
          'inline-flex h-9 items-center justify-center gap-2 rounded-xl px-4 text-sm font-semibold text-white',
          'bg-primary shadow-sm shadow-primary/25 transition-all hover:bg-primary-strong active:scale-[0.98]',
          className,
        )}
      >
        Đăng nhập
      </a>
    )
  }

  /* ----- Đã đăng nhập: hiển thị realname + dropdown ----- */
  return (
    <div ref={ref} className={cn('relative', className)}>
      <button
        type="button"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
        className="inline-flex h-9 items-center gap-2 rounded-xl border border-border-c bg-surface pl-1.5 pr-3 transition-colors hover:bg-surface-2"
      >
        {/* Avatar chữ cái đầu */}
        <span className="flex h-6 w-6 items-center justify-center rounded-full bg-primary-soft text-xs font-bold text-primary">
          {displayName.charAt(0).toUpperCase()}
        </span>
        <span className="max-w-[120px] truncate text-sm font-medium text-fg">
          {displayName}
        </span>
        <svg
          className={cn('h-3.5 w-3.5 text-muted transition-transform', open && 'rotate-180')}
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.5"
          strokeLinecap="round"
        >
          <path d="m6 9 6 6 6-6" />
        </svg>
      </button>

      {open && (
        <div
          role="menu"
          className="absolute right-0 top-11 z-50 w-48 overflow-hidden rounded-xl border border-border-c bg-surface py-1.5 shadow-xl shadow-black/10 animate-[toastIn_.18s_ease]"
        >
          {/* Thông tin nhanh */}
          <div className="px-3 pb-1.5">
            <p className="truncate text-sm font-semibold text-fg">{displayName}</p>
            <p className="truncate text-xs text-muted">{user?.email || 'Thành viên AeSieuQuay'}</p>
          </div>
          <hr className="border-border-c opacity-60" />

          <a
            href="/nap-the"
            role="menuitem"
            onClick={() => setOpen(false)}
            className="block px-3 py-2 text-sm text-muted transition-colors hover:bg-surface-2 hover:text-fg"
          >
            Nạp thẻ
          </a>
          {user?.role_slug === 'admin' && (
            <a
              href="/admin"
              role="menuitem"
              onClick={() => setOpen(false)}
              className="block px-3 py-2 text-sm text-muted transition-colors hover:bg-surface-2 hover:text-fg"
            >
              Quản trị
            </a>
          )}
          <hr className="border-border-c opacity-60" />

          <button
            role="menuitem"
            type="button"
            onClick={() => {
              setOpen(false)
              logout()
            }}
            className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-red-500 transition-colors hover:bg-red-500/10"
          >
            <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
              <path d="m16 17 5-5-5-5M21 12H9" />
            </svg>
            Đăng xuất
          </button>
        </div>
      )}
    </div>
  )
}

/* ================= Header ================= */

/**
 * @param {{ menu?: Array<{ label: string, to: string }> }} props
 */
export const Header = ({ menu = DEFAULT_MENU }) => {
  const [scrolled, setScrolled] = useState(false)
  const [open, setOpen] = useState(false)
  const location = useLocation()

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8)
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  // Đóng menu khi đổi trang
  useEffect(() => setOpen(false), [location.pathname])

  return (
    <header
      className={cn(
        'sticky top-0 z-40 border-b transition-all duration-300',
        scrolled
          ? 'border-border-c bg-bg/85 shadow-sm backdrop-blur-md'
          : 'border-transparent bg-transparent',
      )}
    >
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-4 px-4 sm:px-6">
        <Logo size="sm" />

        {/* Desktop menu */}
        <nav className="hidden items-center gap-1 lg:flex" aria-label="Menu chính">
          {menu.map((item) => {
            const active =
              item.to === '/' ? location.pathname === '/' : location.pathname.startsWith(item.to)
            return (
              <a
                key={item.to}
                href={item.to}
                aria-current={active ? 'page' : undefined}
                className={cn(
                  'rounded-lg px-3 py-2 text-sm font-medium transition-colors',
                  active
                    ? 'bg-primary-soft text-primary'
                    : 'text-muted hover:bg-surface-2 hover:text-fg',
                )}
              >
                {item.label}
              </a>
            )
          })}
        </nav>

        <div className="flex items-center gap-2">
          <ThemeToggle />
          <div className="hidden items-center gap-2 sm:flex">
            
            <AuthButton />
          </div>

          {/* Hamburger mobile */}
          <button
            type="button"
            aria-expanded={open}
            aria-label={open ? 'Đóng menu' : 'Mở menu'}
            onClick={() => setOpen((v) => !v)}
            className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-border-c bg-surface text-fg lg:hidden"
          >
            {open ? (
              <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                <path d="M18 6 6 18M6 6l12 12" />
              </svg>
            ) : (
              <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                <path d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            )}
          </button>
        </div>
      </div>

      {/* Mobile menu */}
      {open && (
        <nav
          aria-label="Menu mobile"
          className="border-t border-border-c bg-surface px-4 py-3 lg:hidden"
        >
          <div className="flex flex-col gap-2">
            
            <AuthButton className="flex w-full justify-center" />
          </div>
          <div className="my-3 h-px bg-[var(--border)]" />
          {menu.map((item) => {
            const active =
              item.to === '/' ? location.pathname === '/' : location.pathname.startsWith(item.to)
            return (
              <a
                key={item.to}
                href={item.to}
                className={cn(
                  'block rounded-lg px-3 py-2.5 text-sm font-medium transition-colors',
                  active
                    ? 'bg-primary-soft text-primary'
                    : 'text-muted hover:bg-surface-2 hover:text-fg',
                )}
              >
                {item.label}
              </a>
            )
          })}
        </nav>
      )}
    </header>
  )
}

export default Header
