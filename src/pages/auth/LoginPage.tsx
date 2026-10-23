import { Link } from 'react-router-dom'
import Logo from '@/components/Logo'

export const LoginPage = () => (
  <section className="flex min-h-screen items-center justify-center bg-bg p-6">
    <div className="w-full max-w-md rounded-2xl border border-border-c bg-surface p-8 shadow-lg shadow-black/5">
      <Link to="/" className="mx-auto mb-6 flex w-fit">
        <Logo size="md" />
      </Link>

      <h2 className="text-2xl font-bold text-fg">Đăng nhập</h2>
      <p className="mt-1 text-sm text-muted">Nhập tài khoản để tiếp tục hành trình</p>

      <form className="mt-6 space-y-4">
        <div>
          <label htmlFor="email" className="mb-1.5 block text-sm font-medium text-fg">Email</label>
          <input
            id="email"
            type="email"
            placeholder="your@email.com"
            className="w-full rounded-xl border border-border-c bg-surface-2 px-4 py-2.5 text-fg placeholder:text-muted focus:border-primary focus:outline-none focus:ring-2 focus:ring-[var(--ring)]"
          />
        </div>
        <div>
          <label htmlFor="password" className="mb-1.5 block text-sm font-medium text-fg">Mật khẩu</label>
          <input
            id="password"
            type="password"
            placeholder="••••••••"
            className="w-full rounded-xl border border-border-c bg-surface-2 px-4 py-2.5 text-fg placeholder:text-muted focus:border-primary focus:outline-none focus:ring-2 focus:ring-[var(--ring)]"
          />
        </div>
        {/* Cloudflare Turnstile: tích hợp ở giai đoạn sau */}
        <button
          type="button"
          className="w-full rounded-xl bg-primary py-2.5 font-semibold text-white shadow-sm shadow-primary/25 transition-all hover:bg-primary-strong active:scale-[0.98]"
        >
          Đăng nhập
        </button>
      </form>

      <p className="mt-6 text-center text-sm text-muted">
        Chưa có tài khoản? <Link to="/dang-ky" className="font-medium text-primary underline">Đăng ký</Link>
      </p>
    </div>
  </section>
)

export default LoginPage
