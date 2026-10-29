import { FiAlertTriangle, FiRotateCcw } from 'react-icons/fi'
import { useSeo } from '@/hooks/useSeo'
import { getBackHref } from '@/lib/utils'

export const ErrorPage = ({ status = 500, message = 'Có lỗi xảy ra. Vui lòng thử lại sau.' }) => {
  const backHref = getBackHref()
  useSeo({
    title: `${status} - Có lỗi xảy ra — SV AeSieuQuay`,
    description: message,
    noindex: true,
  })

  return (
    <section className="relative flex min-h-screen items-center justify-center overflow-hidden bg-bg p-8">
      {/* ambient + lưới ô vuông — đồng bộ phong cách dark-first trang chủ */}
      <div aria-hidden className="pointer-events-none absolute inset-0">
        <div className="ambient-orb -left-24 top-0 h-72 w-72" style={{ background: 'var(--glow-primary)' }} />
        <div className="ambient-orb -right-16 bottom-0 h-80 w-80" style={{ background: 'var(--glow-accent)' }} />
        <div className="bg-grid absolute inset-0 [mask-image:radial-gradient(ellipse_60%_50%_at_50%_40%,black,transparent)]" />
      </div>

      <div className="glass glow-ring relative w-full max-w-md rounded-2xl p-10 text-center shadow-2xl shadow-black/30">
        <FiAlertTriangle className="mx-auto mb-4 h-14 w-14 text-warning" />

        <h1 className="text-gradient-brand mb-4 text-6xl font-extrabold tracking-tight">{status}</h1>

        <p className="mb-8 text-lg text-muted">{message}</p>

        <a
          href={backHref}
          className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-primary px-8 py-2.5 font-semibold text-white shadow-lg shadow-primary/30 transition-all hover:bg-primary-strong active:scale-[0.98]"
        >
          <FiRotateCcw /> Quay lại trang trước
        </a>
      </div>
    </section>
  )
}

export default ErrorPage
