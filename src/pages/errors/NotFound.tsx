import { FiXCircle, FiHome, FiSearch } from 'react-icons/fi'
import Logo from '@/components/Logo'
import { useSeo } from '@/hooks/useSeo'
import { getBackHref } from '@/lib/utils'

export const NotFound = () => {
  const backHref = getBackHref()
  useSeo({
    title: '404 - Không tìm thấy — SV AeSieuQuay',
    description: 'Trang bạn truy cập không tồn tại hoặc đã được xóa.',
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
          <FiXCircle className="mx-auto mb-4 h-16 w-16 text-warning" />

          <h1 className="text-gradient-brand text-4xl font-extrabold tracking-tight">404 — Không tìm thấy</h1>

          <p className="mt-3 text-lg text-muted">
            Trang bạn truy cập không tồn tại hoặc đã được xóa.
          </p>

          <div className="mt-8 grid w-full grid-cols-1 gap-3 sm:grid-cols-2">
            <a
              href="/"
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-primary px-4 py-2.5 font-semibold text-white shadow-lg shadow-primary/30 transition-all hover:bg-primary-strong active:scale-[0.98]"
            >
              <FiHome /> Quay về trang chủ
            </a>

            <a
              href={backHref}
              className="inline-flex items-center justify-center gap-2 rounded-xl border border-border-c bg-surface px-4 py-2.5 font-semibold text-fg transition-all hover:bg-surface-2 active:scale-[0.98]"
            >
              <FiSearch /> Tìm lại
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

export default NotFound
