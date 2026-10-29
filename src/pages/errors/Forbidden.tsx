import { FiShield, FiAlertCircle, FiLogIn, FiArrowLeft } from 'react-icons/fi'
import Logo from '@/components/Logo'
import { useSeo } from '@/hooks/useSeo'
import { getBackHref } from '@/lib/utils'

export const Forbidden = () => {
  const backHref = getBackHref()
  useSeo({
    title: '403 - Từ chối truy cập — SV AeSieuQuay',
    description: 'Bạn không có quyền truy cập trang này.',
    noindex: true,
  })

  return (
    <section className="relative min-h-screen overflow-hidden bg-bg text-fg">
      {/* ambient + lưới ô vuông — đồng bộ dark-first */}
      <div aria-hidden className="pointer-events-none absolute inset-0">
        <div className="ambient-orb -left-24 top-10 h-72 w-72" style={{ background: 'var(--glow-primary)' }} />
        <div className="ambient-orb -right-16 bottom-0 h-80 w-80" style={{ background: 'var(--glow-accent)' }} />
        <div className="bg-grid absolute inset-0 [mask-image:radial-gradient(ellipse_70%_60%_at_50%_40%,black,transparent)]" />
      </div>

      <div className="relative flex min-h-screen flex-col items-center justify-center p-8">
        <Logo size="md" className="mb-8" />

        <div className="glass glow-ring w-full max-w-md rounded-2xl p-8 text-center shadow-2xl shadow-black/30">
          <FiShield className="mx-auto mb-4 h-16 w-16 text-warning" />

          <h1 className="text-4xl font-extrabold tracking-tight text-warning">403 — Từ chối truy cập</h1>

          <p className="mt-3 text-lg text-muted">
            Bạn không có quyền truy cập trang này.
          </p>

          <p className="mt-4 text-left text-sm leading-7 text-muted">
            Có thể do: <br />
            • Tài khoản chưa xác thực <br />
            • Phân quyền không đủ <br />
            • Phiên đăng nhập đã hết hạn
          </p>

          <div className="mt-5 rounded-xl border border-amber-500/30 bg-amber-500/10 p-4">
            <div className="flex items-center gap-2">
              <FiAlertCircle className="w-5 h-5 shrink-0 text-warning" />
              <span className="text-left text-sm text-muted">
                Vui lòng{' '}
                <a href="/dang-nhap" className="font-medium text-primary underline">
                  đăng nhập lại
                </a>{' '}
                hoặc liên hệ quản trị viên.
              </span>
            </div>
          </div>

          <div className="mt-8 grid w-full grid-cols-1 gap-3 sm:grid-cols-2">
            <a
              href={backHref}
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-primary px-4 py-2.5 font-semibold text-white shadow-lg shadow-primary/30 transition-all hover:bg-primary-strong active:scale-[0.98]"
            >
              <FiArrowLeft /> Quay về trang trước
            </a>

            <a
              href="/dang-nhap"
              className="inline-flex items-center justify-center gap-2 rounded-xl border border-border-c bg-surface px-4 py-2.5 font-semibold text-fg transition-all hover:bg-surface-2 active:scale-[0.98]"
            >
              <FiLogIn /> Đăng nhập lại
            </a>
          </div>
        </div>

        <div className="relative mt-10 w-full max-w-md border-t border-border-c pt-6 text-center text-sm text-muted">
          © 2026 AeSieuQuay - Minecraft Việt Nam
        </div>
      </div>
    </section>
  )
}

export default Forbidden
