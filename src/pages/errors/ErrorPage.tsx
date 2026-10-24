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
    <section className="flex min-h-screen items-center justify-center bg-bg p-8">
      <div className="w-full max-w-md rounded-2xl border border-border-c bg-surface p-10 text-center shadow-lg shadow-black/5">
        <FiAlertTriangle className="mx-auto mb-4 w-14 h-14 text-warning" />

        <h1 className="mb-4 text-6xl font-bold text-primary">{status}</h1>

        <p className="mb-8 text-lg text-muted">{message}</p>

        <a
          href={backHref}
          className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-primary px-8 py-2.5 font-semibold text-white transition-all hover:bg-primary-strong active:scale-[0.98]"
        >
          <FiRotateCcw /> Quay lại trang trước
        </a>
      </div>
    </section>
  )
}

export default ErrorPage
