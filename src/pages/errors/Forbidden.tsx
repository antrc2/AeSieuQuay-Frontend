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
    <section className="min-h-screen bg-bg text-fg">
      <div className="flex min-h-screen flex-col items-center justify-center p-8">
        <Logo size="md" className="mb-8" />

        <div className="w-full max-w-md text-center">
          <FiShield className="mx-auto mb-4 w-16 h-16 text-warning" />

          <h1 className="text-4xl font-bold text-warning">403 - Từ chối truy cập</h1>

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

          <div className="mt-8 grid w-full max-w-lg grid-cols-1 gap-3 sm:grid-cols-2">
            <a
              href={backHref}
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-primary px-4 py-2.5 font-semibold text-white transition-all hover:bg-primary-strong active:scale-[0.98]"
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

        <div className="mt-10 w-full max-w-md border-t border-border-c pt-6 text-center text-sm text-muted">
          © 2026 AeSieuQuay - Minecraft Việt Nam
        </div>
      </div>
    </section>
  )
}

export default Forbidden
