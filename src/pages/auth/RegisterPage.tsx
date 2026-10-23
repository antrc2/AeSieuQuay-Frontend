import { Link } from 'react-router-dom'
import Logo from '@/components/Logo'

const inputCls =
  'w-full rounded-xl border border-border-c bg-surface-2 px-4 py-2.5 text-fg placeholder:text-muted focus:border-primary focus:outline-none focus:ring-2 focus:ring-[var(--ring)]'

export const RegisterPage = () => (
  <section className="flex min-h-screen items-center justify-center bg-bg p-6">
    <div className="w-full max-w-md rounded-2xl border border-border-c bg-surface p-8 shadow-lg shadow-black/5">
      <Link to="/" className="mx-auto mb-6 flex w-fit">
        <Logo size="md" />
      </Link>

      <h2 className="text-2xl font-bold text-fg">Đăng ký</h2>
      <p className="mt-1 text-sm text-muted">Tạo tài khoản AeSieuQuay mới</p>

      <form className="mt-6 space-y-4">
        <div>
          <label htmlFor="username" className="mb-1.5 block text-sm font-medium text-fg">Tên đăng nhập</label>
          <input id="username" type="text" placeholder="Steve123" className={inputCls} />
        </div>
        <div>
          <label htmlFor="remail" className="mb-1.5 block text-sm font-medium text-fg">Email</label>
          <input id="remail" type="email" placeholder="your@email.com" className={inputCls} />
        </div>
        <div>
          <label htmlFor="rpass" className="mb-1.5 block text-sm font-medium text-fg">Mật khẩu</label>
          <input id="rpass" type="password" placeholder="••••••••" className={inputCls} />
        </div>
        <div>
          <label htmlFor="rpass2" className="mb-1.5 block text-sm font-medium text-fg">Nhập lại mật khẩu</label>
          <input id="rpass2" type="password" placeholder="••••••••" className={inputCls} />
        </div>
        {/* Cloudflare Turnstile: tích hợp ở giai đoạn sau */}
        <button
          type="button"
          className="w-full rounded-xl bg-primary py-2.5 font-semibold text-white shadow-sm shadow-primary/25 transition-all hover:bg-primary-strong active:scale-[0.98]"
        >
          Đăng ký
        </button>
      </form>

      <p className="mt-6 text-center text-sm text-muted">
        Đã có tài khoản? <Link to="/dang-nhap" className="font-medium text-primary underline">Đăng nhập</Link>
      </p>
    </div>
  </section>
)

export default RegisterPage
