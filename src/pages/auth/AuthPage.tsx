import {
  useState,
  type ChangeEvent,
  type FormEvent,
  type InputHTMLAttributes,
  type ReactNode,
} from 'react'
import { useLocation, useNavigate } from 'react-router-dom'

import SiteLayout from '@/components/layout/SiteLayout'
import { apiPost } from '@/api/client'
import { showApiError, showSuccess } from '@/utils/swal'
import { cn } from '@/lib/utils'

/* ================= Hằng số & type ================= */

type Tab = 'login' | 'register'

const TABS: Array<{ id: Tab; label: string; path: string }> = [
  { id: 'login', label: 'Đăng nhập', path: '/dang-nhap' },
  { id: 'register', label: 'Đăng ký', path: '/dang-ky' },
]

const inputCls =
  'w-full rounded-xl border border-border-c bg-surface-2 px-4 py-2.5 text-fg placeholder:text-muted transition-colors focus:border-primary focus:outline-none focus:ring-2 focus:ring-[var(--ring)] disabled:opacity-60'

const USERNAME_RE = /^[a-zA-Z0-9_]*$/
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

/* ================= Field components ================= */

type TextFieldProps = {
  id: string
  label: string
  hint?: string
  right?: ReactNode
} & InputHTMLAttributes<HTMLInputElement>

const TextField = ({ id, label, hint, right, className, ...props }: TextFieldProps) => (
  <div>
    <label htmlFor={id} className="mb-1.5 block text-sm font-medium text-fg">
      {label}
    </label>
    <div className="relative">
      <input id={id} className={cn(inputCls, right && 'pr-11', className)} {...props} />
      {right && (
        <div className="absolute inset-y-0 right-0 flex items-center">{right}</div>
      )}
    </div>
    {hint && <p className="mt-1 text-xs text-muted">{hint}</p>}
  </div>
)

type PasswordFieldProps = Omit<TextFieldProps, 'type' | 'right'>

const PasswordField = ({ id, label, hint, ...props }: PasswordFieldProps) => {
  const [show, setShow] = useState(false)

  return (
    <TextField
      id={id}
      label={label}
      hint={hint}
      type={show ? 'text' : 'password'}
      right={
        <button
          type="button"
          tabIndex={-1}
          onClick={() => setShow((v) => !v)}
          aria-label={show ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}
          className="inline-flex h-full w-11 items-center justify-center rounded-r-xl text-muted transition-colors hover:text-fg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)]"
        >
          {show ? (
            // Mắt gạch — đang hiện mật khẩu
            <svg className="h-[18px] w-[18px]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94" />
              <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19" />
              <path d="m1 1 22 22" />
              <path d="M14.12 14.12a3 3 0 1 1-4.24-4.24" />
            </svg>
          ) : (
            // Mắt thường — đang ẩn mật khẩu
            <svg className="h-[18px] w-[18px]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8Z" />
              <circle cx="12" cy="12" r="3" />
            </svg>
          )}
        </button>
      }
      {...props}
    />
  )
}

const ErrorAlert = ({ children }: { children: ReactNode }) => (
  <p
    role="alert"
    className="rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-500"
  >
    {children}
  </p>
)

const SubmitButton = ({ loading, idle, busy }: { loading: boolean; idle: string; busy: string }) => (
  <button
    type="submit"
    disabled={loading}
    className="w-full rounded-xl bg-primary py-2.5 font-semibold text-white shadow-sm shadow-primary/25 transition-all hover:bg-primary-strong active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60"
  >
    {loading ? busy : idle}
  </button>
)

const FormFooter = ({ text, action, onAction }: { text: string; action: string; onAction: () => void }) => (
  <p className="pt-1 text-center text-sm text-muted">
    {text}{' '}
    <button
      type="button"
      onClick={onAction}
      className="font-semibold text-primary transition-colors hover:text-primary-strong hover:underline"
    >
      {action}
    </button>
  </p>
)

/* ================= Form đăng nhập ================= */

const LoginForm = ({ onSwitch }: { onSwitch: () => void }) => {
  const [form, setForm] = useState({ username: '', password: '' })
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const onChange = (e: ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target
    setForm((s) => ({ ...s, [name]: value }))
  }

  const onSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setError('')

    const username = form.username.trim()

    if (!username) return setError('Vui lòng nhập tên đăng nhập')
    // Backend cho phép đăng nhập bằng username hoặc email (không phân biệt hoa/thường)
    if (username.includes('@')) {
      if (!EMAIL_RE.test(username)) return setError('Email không hợp lệ')
    } else if (!USERNAME_RE.test(username)) {
      return setError('Tên đăng nhập chỉ được chứa chữ, số và dấu gạch dưới (a-z, A-Z, 0-9, _)')
    }

    if (!form.password) return setError('Vui lòng nhập mật khẩu')

    setLoading(true)
    try {
      const res = await apiPost('/auth/login', { username, password: form.password })
      await showSuccess(
        'Đăng nhập thành công',
        res?.message || `Xin chào ${res?.data?.user?.realname || username}!`,
      )
      window.location.assign('/')
      return
    } catch (err) {
      await showApiError(err, 'Đăng nhập thất bại')
    } finally {
      setLoading(false)
    }
  }

  return (
    <form className="mt-6 space-y-4" onSubmit={onSubmit} noValidate>
      <TextField
        id="login-username"
        name="username"
        label="Tên đăng nhập hoặc email"
        value={form.username}
        onChange={onChange}
        placeholder="vd: AeSieuQuay123"
        autoComplete="username"
        disabled={loading}
      />
      <PasswordField
        id="login-password"
        name="password"
        label="Mật khẩu"
        value={form.password}
        onChange={onChange}
        placeholder="••••••••"
        autoComplete="current-password"
        disabled={loading}
      />

      {error && <ErrorAlert>{error}</ErrorAlert>}

      <SubmitButton loading={loading} idle="Đăng nhập" busy="Đang đăng nhập..." />

      <FormFooter text="Chưa có tài khoản?" action="Đăng ký ngay" onAction={onSwitch} />
    </form>
  )
}

/* ================= Form đăng ký ================= */

const RegisterForm = ({ onSwitch }: { onSwitch: () => void }) => {
  const [form, setForm] = useState({
    username: '',
    email: '',
    password: '',
    confirmPassword: '',
  })
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const onChange = (e: ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target
    setForm((s) => ({ ...s, [name]: value }))
  }

  const onSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setError('')

    const username = form.username.trim()

    if (!username) return setError('Vui lòng nhập tên đăng nhập')
    if (!USERNAME_RE.test(username)) {
      return setError('Tên đăng nhập chỉ được chứa chữ, số và dấu gạch dưới (a-z, A-Z, 0-9, _)')
    }
    if (username.length < 3) return setError('Tên đăng nhập phải có ít nhất 3 ký tự')
    if (username.length > 16) return setError('Tên đăng nhập không được vượt quá 16 ký tự')

    if (form.email && !EMAIL_RE.test(form.email.trim())) {
      return setError('Email không hợp lệ')
    }

    if (!form.password) return setError('Vui lòng nhập mật khẩu')
    if (form.password.length < 6) return setError('Mật khẩu phải có ít nhất 6 ký tự')
    if (form.password !== form.confirmPassword) return setError('Mật khẩu nhập lại không khớp')

    setLoading(true)
    try {
      const res = await apiPost('/auth/register', {
        username,
        email: form.email.trim() || undefined,
        password: form.password,
      })
      await showSuccess(
        'Đăng ký thành công',
        res?.message || `Chào mừng ${res?.data?.user?.realname || username}!`,
      )
      window.location.assign('/')
      return
    } catch (err) {
      await showApiError(err, 'Đăng ký thất bại')
    } finally {
      setLoading(false)
    }
  }

  return (
    <form className="mt-6 space-y-4" onSubmit={onSubmit} noValidate>
      <TextField
        id="register-username"
        name="username"
        label="Tên đăng nhập *"
        value={form.username}
        onChange={onChange}
        placeholder="vd: AeSieuQuay123"
        autoComplete="username"
        hint="3–16 ký tự, chỉ gồm chữ, số và dấu gạch dưới"
        disabled={loading}
      />
      <TextField
        id="register-email"
        name="email"
        type="email"
        label="Email (không bắt buộc)"
        value={form.email}
        onChange={onChange}
        placeholder="your@email.com"
        autoComplete="email"
        disabled={loading}
      />
      <PasswordField
        id="register-password"
        name="password"
        label="Mật khẩu *"
        value={form.password}
        onChange={onChange}
        placeholder="••••••••"
        autoComplete="new-password"
        hint="Tối thiểu 6 ký tự"
        disabled={loading}
      />
      <PasswordField
        id="register-confirm"
        name="confirmPassword"
        label="Nhập lại mật khẩu *"
        value={form.confirmPassword}
        onChange={onChange}
        placeholder="••••••••"
        autoComplete="new-password"
        disabled={loading}
      />

      {error && <ErrorAlert>{error}</ErrorAlert>}

      <SubmitButton loading={loading} idle="Tạo tài khoản" busy="Đang đăng ký..." />

      <FormFooter text="Đã có tài khoản?" action="Đăng nhập" onAction={onSwitch} />
    </form>
  )
}

/* ================= Trang xác thực (tab Đăng nhập / Đăng ký) ================= */

export const AuthPage = () => {
  const location = useLocation()
  const navigate = useNavigate()

  const isRegister = location.pathname.startsWith('/dang-ky')
  const tab: Tab = isRegister ? 'register' : 'login'

  const switchTab = (next: Tab) => {
    if (next === tab) return
    const target = TABS.find((t) => t.id === next)?.path ?? '/dang-nhap'
    navigate(target, { replace: true, preventScrollReset: true })
  }

  return (
    <SiteLayout
      seo={{
        title: isRegister ? 'Đăng ký — SV AeSieuQuay' : 'Đăng nhập — SV AeSieuQuay',
        description: isRegister
          ? 'Tạo tài khoản mới để tham gia máy chủ Minecraft AeSieuQuay.'
          : 'Đăng nhập vào tài khoản AeSieuQuay để tiếp tục chơi.',
        path: isRegister ? '/dang-ky' : '/dang-nhap',
        noindex: true,
      }}
    >
      <section className="relative flex min-h-[70vh] items-center justify-center overflow-hidden px-4 py-12 sm:py-16">
        {/* Nền trang trí */}
        <div aria-hidden className="pointer-events-none absolute inset-0">
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_55%_45%_at_50%_-5%,rgba(30,144,255,0.22),transparent),radial-gradient(ellipse_40%_40%_at_85%_25%,rgba(124,58,237,0.14),transparent)]" />
          <div
            className="absolute inset-0 opacity-[0.04]"
            style={{
              backgroundImage:
                'linear-gradient(var(--fg) 1px, transparent 1px), linear-gradient(90deg, var(--fg) 1px, transparent 1px)',
              backgroundSize: '44px 44px',
            }}
          />
        </div>

        <div className="relative w-full max-w-md">
          <div className="rounded-3xl border border-border-c bg-surface p-6 shadow-2xl shadow-black/10 sm:p-8">
            {/* Tabs */}
            <div
              role="tablist"
              aria-label="Đăng nhập hoặc đăng ký"
              className="grid grid-cols-2 gap-1 rounded-xl border border-border-c bg-surface-2 p-1"
            >
              {TABS.map((t) => {
                const active = tab === t.id
                return (
                  <button
                    key={t.id}
                    id={`tab-${t.id}`}
                    type="button"
                    role="tab"
                    aria-selected={active}
                    aria-controls={`panel-${t.id}`}
                    onClick={() => switchTab(t.id)}
                    className={cn(
                      'rounded-lg px-4 py-2 text-sm font-semibold transition-all',
                      active
                        ? 'bg-primary text-white shadow-sm shadow-primary/30'
                        : 'text-muted hover:bg-surface hover:text-fg',
                    )}
                  >
                    {t.label}
                  </button>
                )
              })}
            </div>

            {/* Tiêu đề */}
            <div className="mt-6 text-center">
              <h1 className="text-2xl font-extrabold tracking-tight text-fg">
                {tab === 'login' ? 'Chào mừng trở lại' : 'Tạo tài khoản mới'}
              </h1>
              <p className="mt-1.5 text-sm text-muted">
                {tab === 'login'
                  ? 'Đăng nhập để tiếp tục hành trình cùng AeSieuQuay.'
                  : 'Chỉ mất một phút để bắt đầu chơi cùng cộng đồng AE.'}
              </p>
            </div>

            <div
              role="tabpanel"
              id={`panel-${tab}`}
              aria-labelledby={`tab-${tab}`}
              className="animate-[fadeIn_.2s_ease]"
            >
              {tab === 'login' ? (
                <LoginForm onSwitch={() => switchTab('register')} />
              ) : (
                <RegisterForm onSwitch={() => switchTab('login')} />
              )}
            </div>
          </div>

          <p className="mt-6 text-center text-xs leading-relaxed text-muted">
            Bằng việc tiếp tục, bạn đồng ý với{' '}
            <a href="/noi-quy" className="text-primary hover:underline">
              Nội quy
            </a>{' '}
            và{' '}
            <a href="/wiki" className="text-primary hover:underline">
              hướng dẫn
            </a>{' '}
            của server.
          </p>
        </div>
      </section>
    </SiteLayout>
  )
}

export default AuthPage