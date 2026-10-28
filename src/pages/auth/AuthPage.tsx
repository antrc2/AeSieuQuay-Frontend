import {
  useState,
  type ChangeEvent,
  type FormEvent,
  type InputHTMLAttributes,
  type ReactNode,
} from 'react'
import { useLocation } from 'react-router-dom'

import SiteLayout from '@/components/layout/SiteLayout'
import Turnstile from '@/components/Turnstile'
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
  'w-full rounded-xl border border-border-c bg-surface-2 px-4 py-2.5 text-fg placeholder:text-muted/70 ' +
  'transition-all focus:border-primary focus:bg-surface focus:outline-none focus:ring-4 focus:ring-[var(--ring)] ' +
  'disabled:opacity-60'

const USERNAME_RE = /^[a-zA-Z0-9_]*$/
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

/* ================= Field components ================= */

type TextFieldProps = {
  id: string
  label: string
  hint?: string
  icon?: ReactNode
  right?: ReactNode
} & InputHTMLAttributes<HTMLInputElement>

const TextField = ({ id, label, hint, icon, right, className, ...props }: TextFieldProps) => (
  <div>
    <label htmlFor={id} className="mb-1.5 block text-sm font-semibold text-fg">
      {label}
    </label>
    <div className="relative">
      {icon && (
        <span aria-hidden className="pointer-events-none absolute inset-y-0 left-0 flex w-11 items-center justify-center text-muted">
          {icon}
        </span>
      )}
      <input id={id} className={cn(inputCls, icon && 'pl-11', right && 'pr-11', className)} {...props} />
      {right && <div className="absolute inset-y-0 right-0 flex items-center">{right}</div>}
    </div>
    {hint && <p className="mt-1 text-xs text-muted">{hint}</p>}
  </div>
)

type PasswordFieldProps = Omit<TextFieldProps, 'type' | 'right'>

const EyeIcon = () => (
  <svg className="h-[18px] w-[18px]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8Z" />
    <circle cx="12" cy="12" r="3" />
  </svg>
)

const EyeOffIcon = () => (
  <svg className="h-[18px] w-[18px]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94" />
    <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19" />
    <path d="m1 1 22 22" />
    <path d="M14.12 14.12a3 3 0 1 1-4.24-4.24" />
  </svg>
)

const UserIcon = () => (
  <svg className="h-[18px] w-[18px]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
    <circle cx="12" cy="7" r="4" />
  </svg>
)

const MailIcon = () => (
  <svg className="h-[18px] w-[18px]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="2" y="4" width="20" height="16" rx="2" />
    <path d="m22 7-10 6L2 7" />
  </svg>
)

const LockIcon = () => (
  <svg className="h-[18px] w-[18px]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="11" width="18" height="11" rx="2" />
    <path d="M7 11V7a5 5 0 0 1 10 0v4" />
  </svg>
)

const PasswordField = ({ id, label, hint, ...props }: PasswordFieldProps) => {
  const [show, setShow] = useState(false)

  return (
    <TextField
      id={id}
      label={label}
      hint={hint}
      icon={<LockIcon />}
      type={show ? 'text' : 'password'}
      right={
        <button
          type="button"
          tabIndex={-1}
          onClick={() => setShow((v) => !v)}
          aria-label={show ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}
          className="inline-flex h-full w-11 items-center justify-center rounded-r-xl text-muted transition-colors hover:text-fg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)]"
        >
          {show ? <EyeOffIcon /> : <EyeIcon />}
        </button>
      }
      {...props}
    />
  )
}

const ErrorAlert = ({ children }: { children: ReactNode }) => (
  <p
    role="alert"
    className="animate-fade flex items-start gap-2 rounded-xl border border-red-500/30 bg-red-500/10 px-3 py-2.5 text-sm font-medium text-red-500"
  >
    <span aria-hidden className="mt-0.5">⚠</span>
    <span>{children}</span>
  </p>
)

const SubmitButton = ({ loading, idle, busy }: { loading: boolean; idle: string; busy: string }) => (
  <button
    type="submit"
    disabled={loading}
    className="btn-gradient w-full rounded-xl py-3 text-sm font-bold tracking-wide disabled:cursor-not-allowed disabled:opacity-60"
  >
    {loading ? busy : idle}
  </button>
)

const FormFooter = ({ text, action, href }: { text: string; action: string; href: string }) => (
  <p className="pt-1 text-center text-sm text-muted">
    {text}{' '}
    <a
      href={href}
      className="font-semibold text-primary transition-colors hover:text-primary-strong hover:underline"
    >
      {action}
    </a>
  </p>
)

/** Nhãn nhỏ báo trạng thái captcha — chỉ hiện khi widget được bật (đã có sitekey). */
const CaptchaNote = ({ token, attempted }: { token: string; attempted: boolean }) => (
  <p className={cn('text-right text-[11px] font-medium', token ? 'text-emerald-500' : attempted ? 'text-red-500' : 'text-muted')}>
    {token ? '✓ Đã xác minh captcha' : attempted ? '⚠ Vui lòng hoàn thành captcha' : 'Được bảo vệ bởi Cloudflare Turnstile'}
  </p>
)

/* ================= Form đăng nhập ================= */

const LoginForm = () => {
  const [form, setForm] = useState({ username: '', password: '' })
  const [captchaToken, setCaptchaToken] = useState('')
  const [attempted, setAttempted] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const onChange = (e: ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target
    setForm((s) => ({ ...s, [name]: value }))
  }

  const onSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setError('')
    setAttempted(true)

    const username = form.username.trim()

    if (!username) return setError('Vui lòng nhập tên đăng nhập')
    // Backend cho phép đăng nhập bằng username hoặc email (không phân biệt hoa/thường)
    if (username.includes('@')) {
      if (!EMAIL_RE.test(username)) return setError('Email không hợp lệ')
    } else if (!USERNAME_RE.test(username)) {
      return setError('Tên đăng nhập chỉ được chứa chữ, số và dấu gạch dưới (a-z, A-Z, 0-9, _)')
    }

    if (!form.password) return setError('Vui lòng nhập mật khẩu')
    if (!captchaToken) return setError('Vui lòng hoàn thành captcha (Cloudflare Turnstile)')

    setLoading(true)
    try {
      const res = await apiPost('/auth/login', { username, password: form.password, turnstile_token: captchaToken })
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
        icon={<UserIcon />}
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

      {/* Cloudflare Turnstile captcha */}
      <div className="space-y-1">
        <Turnstile onToken={setCaptchaToken} />
        <CaptchaNote token={captchaToken} attempted={attempted} />
      </div>

      {error && <ErrorAlert>{error}</ErrorAlert>}

      <SubmitButton loading={loading} idle="Đăng nhập" busy="Đang đăng nhập..." />

      <FormFooter text="Chưa có tài khoản?" action="Đăng ký ngay" href="/dang-ky" />
    </form>
  )
}

/* ================= Form đăng ký ================= */

const RegisterForm = () => {
  const [form, setForm] = useState({
    username: '',
    email: '',
    password: '',
    confirmPassword: '',
  })
  const [captchaToken, setCaptchaToken] = useState('')
  const [attempted, setAttempted] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const onChange = (e: ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target
    setForm((s) => ({ ...s, [name]: value }))
  }

  const onSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setError('')
    setAttempted(true)

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
    if (!captchaToken) return setError('Vui lòng hoàn thành captcha (Cloudflare Turnstile)')

    setLoading(true)
    try {
      const res = await apiPost('/auth/register', {
        username,
        email: form.email.trim() || undefined,
        password: form.password,
        turnstile_token: captchaToken,
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
        icon={<UserIcon />}
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
        icon={<MailIcon />}
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

      {/* Cloudflare Turnstile captcha */}
      <div className="space-y-1">
        <Turnstile onToken={setCaptchaToken} />
        <CaptchaNote token={captchaToken} attempted={attempted} />
      </div>

      {error && <ErrorAlert>{error}</ErrorAlert>}

      <SubmitButton loading={loading} idle="Tạo tài khoản" busy="Đang đăng ký..." />

      <FormFooter text="Đã có tài khoản?" action="Đăng nhập" href="/dang-nhap" />
    </form>
  )
}

/* ================= Panel trái — giới thiệu server ================= */

const FEATURES = [
  { icon: '⛏️', title: 'Sinh tồn & Skyblock', desc: 'Nhiều thế giới, kinh tế riêng, land claim chống xâm phạm.' },
  { icon: '⚔️', title: 'PvP & Minigame', desc: 'Arena balance, sự kiện cuối tuần, bảng xếp hạng xu.' },
  { icon: '🛡️', title: 'Anti-che hiện đại', desc: 'Máy chủ 24/7, giám sát TPS realtime, đội admin trực liên tục.' },
]

const AuthSidePanel = () => (
  <aside className="relative hidden overflow-hidden lg:flex lg:w-[44%] lg:flex-col lg:justify-between">
    {/* Nền gradient + aurora */}
    <div aria-hidden className="absolute inset-0 bg-[linear-gradient(160deg,#0b1120_0%,#101a33_55%,#151034_100%)]" />
    <div aria-hidden className="aurora absolute inset-0 opacity-70" />
    <div aria-hidden className="grid-lines absolute inset-0" />

    {/* Khối nội dung */}
    <div className="relative z-10 p-12 xl:p-16">
      <a href="/" className="inline-flex items-center gap-2 text-white">
        <span className="grid h-10 w-10 place-items-center rounded-xl bg-[var(--grad-brand)] text-lg font-black shadow-[var(--shadow-glow)]">
          A
        </span>
        <span className="text-lg font-extrabold tracking-tight">SV AeSieuQuay</span>
      </a>

      <h2 className="mt-14 max-w-md text-3xl font-extrabold leading-tight tracking-tight text-white xl:text-4xl">
        Gia nhập cộng đồng <span className="text-gradient-brand">AeSieuQuay</span> — nơi block kể thành câu chuyện
      </h2>
      <p className="mt-4 max-w-md text-sm leading-relaxed text-slate-400">
        Máy chủ Minecraft Việt Nam vận hành 24/7. Đăng nhập để quản lý nhân vật, nạp thẻ, chuyển xu và theo dõi
        thứ hạng của bạn.
      </p>
    </div>

    <div className="relative z-10 space-y-4 p-12 pt-0 xl:p-16 xl:pt-0">
      {FEATURES.map((f) => (
        <div key={f.title} className="flex items-start gap-3.5 rounded-2xl border border-white/10 bg-white/5 p-4 backdrop-blur-sm">
          <span aria-hidden className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-[var(--grad-brand)] text-lg">
            {f.icon}
          </span>
          <div>
            <p className="text-sm font-bold text-white">{f.title}</p>
            <p className="mt-0.5 text-xs leading-relaxed text-slate-400">{f.desc}</p>
          </div>
        </div>
      ))}
    </div>
  </aside>
)

/* ================= Trang xác thực (tab Đăng nhập / Đăng ký) ================= */

export const AuthPage = () => {
  const location = useLocation()

  const isRegister = location.pathname.startsWith('/dang-ky')
  const tab: Tab = isRegister ? 'register' : 'login'

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
      <section className="relative flex min-h-[calc(100vh-4rem)] overflow-hidden">
        {/* Nền mobile: aurora + lưới (panel desktop có nền riêng) */}
        <div aria-hidden className="pointer-events-none absolute inset-0 lg:hidden">
          <div className="aurora absolute inset-0" />
          <div className="grid-lines absolute inset-0" />
        </div>

        {/* Panel trái — chỉ desktop */}
        <AuthSidePanel />

        {/* Cột form */}
        <div className="relative z-10 flex flex-1 items-center justify-center px-4 py-12 sm:py-16">
          <div className="w-full max-w-md">
            <div className="surface-raised animate-rise rounded-3xl p-6 sm:p-8">
              {/* Tabs — dùng <a href> để full reload, lấy window.DATA mới */}
              <nav
                aria-label="Đăng nhập hoặc đăng ký"
                className="grid grid-cols-2 gap-1 rounded-2xl border border-border-c bg-surface-2 p-1"
              >
                {TABS.map((t) => {
                  const active = tab === t.id
                  return (
                    <a
                      key={t.id}
                      href={t.path}
                      aria-current={active ? 'page' : undefined}
                      className={cn(
                        'rounded-xl px-4 py-2 text-center text-sm font-semibold transition-all',
                        active
                          ? 'btn-gradient shadow-none'
                          : 'text-muted hover:bg-surface hover:text-fg',
                      )}
                    >
                      {t.label}
                    </a>
                  )
                })}
              </nav>

              {/* Tiêu đề */}
              <div className="mt-6 text-center">
                <h1 className="text-2xl font-extrabold tracking-tight text-fg">
                  {tab === 'login' ? 'Chào mừng trở lại 👋' : 'Tạo tài khoản mới ✨'}
                </h1>
                <p className="mt-1.5 text-sm text-muted">
                  {tab === 'login'
                    ? 'Đăng nhập để tiếp tục hành trình cùng AeSieuQuay.'
                    : 'Chỉ mất một phút để bắt đầu chơi cùng cộng đồng AE.'}
                </p>
              </div>

              <div className="animate-fade">
                {tab === 'login' ? <LoginForm /> : <RegisterForm />}
              </div>
            </div>

            <p className="mt-6 text-center text-xs leading-relaxed text-muted">
              Bằng việc tiếp tục, bạn đồng ý với nội quy và hướng dẫn của server. · Bảo mật bởi{' '}
              <span className="font-semibold text-fg">Cloudflare Turnstile</span>
            </p>
          </div>
        </div>
      </section>
    </SiteLayout>
  )
}

export default AuthPage
